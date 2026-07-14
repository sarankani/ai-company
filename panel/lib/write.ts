/**
 * Write layer (Tech Spec §7): every decision/delegation = ONE commit touching
 * the record file (+ the rebuilt registry). Commit author is the app; the
 * human identity lives in the record's stamp and a `Decided-by:` trailer.
 *
 * Two writers behind one interface, mirroring the read layer's sources:
 *  - LocalWriter  — dev/CI: write files in the checkout and `git commit`.
 *  - GitHubWriter — production: Git Data API (blobs → tree → commit → ref),
 *    which is atomic across files and gives optimistic concurrency for free:
 *    the ref update fails if the branch moved since we read it.
 */
import { promises as fs } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const run = promisify(execFile);

export class ConflictError extends Error {
  constructor() { super("the record changed since you loaded it"); }
}

export interface CommitFile { path: string; content: string }

export interface RepoWriter {
  /** Read a file fresh — never cached — for pre-write conflict checks. */
  readFresh(p: string): Promise<string>;
  /** Commit the files atomically. `expect` maps path → sha-16 of the content
   * the caller based its mutation on; a mismatch throws ConflictError. */
  commit(files: CommitFile[], message: string, expect: Record<string, string>): Promise<void>;
}

// ---------- local (dev/CI) ----------

class LocalWriter implements RepoWriter {
  constructor(private root: string) {}
  async readFresh(p: string) {
    return fs.readFile(path.join(this.root, p), "utf8");
  }
  async commit(files: CommitFile[], message: string, expect: Record<string, string>) {
    const { contentSha } = await import("./engine");
    for (const [p, sha] of Object.entries(expect)) {
      if (contentSha(await this.readFresh(p)) !== sha) throw new ConflictError();
    }
    for (const f of files) {
      await fs.writeFile(path.join(this.root, f.path), f.content, "utf8");
    }
    await run("git", ["add", "--", ...files.map((f) => f.path)], { cwd: this.root });
    await run("git", ["-c", "user.name=Evalyn Panel", "-c", "user.email=panel@evalyn.local",
      "commit", "-m", message], { cwd: this.root });
  }
}

// ---------- GitHub (production) ----------

class GitHubWriter implements RepoWriter {
  constructor(private repo: string, private token: string, private branch: string) {}

  private async api(p: string, init?: RequestInit): Promise<any> {
    const res = await fetch(`https://api.github.com/repos/${this.repo}${p}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (res.status === 422 || res.status === 409) throw new ConflictError();
    if (!res.ok) throw new Error(`GitHub API ${res.status} for ${p}`);
    return res.json();
  }

  async readFresh(p: string) {
    const item = await this.api(`/contents/${p}?ref=${this.branch}`);
    return Buffer.from(item.content, "base64").toString("utf8");
  }

  async commit(files: CommitFile[], message: string, expect: Record<string, string>) {
    const { contentSha } = await import("./engine");
    const ref = await this.api(`/git/ref/heads/${this.branch}`);
    const headSha = ref.object.sha;
    const head = await this.api(`/git/commits/${headSha}`);
    // conflict check against the exact tree we are about to build on
    for (const [p, sha] of Object.entries(expect)) {
      if (contentSha(await this.readFresh(p)) !== sha) throw new ConflictError();
    }
    const tree = await this.api(`/git/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: head.tree.sha,
        tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: f.content })),
      }),
    });
    const commit = await this.api(`/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message, tree: tree.sha, parents: [headSha] }),
    });
    // non-fast-forward (branch moved since headSha) → 422 → ConflictError
    await this.api(`/git/refs/heads/${this.branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
  }
}

export function repoWriter(): RepoWriter {
  const gh = process.env.GITHUB_REPO;
  if (gh && process.env.GITHUB_TOKEN) {
    return new GitHubWriter(gh, process.env.GITHUB_TOKEN, process.env.GITHUB_BRANCH || "main");
  }
  return new LocalWriter(process.env.LOCAL_REPO_PATH || path.resolve(process.cwd(), ".."));
}

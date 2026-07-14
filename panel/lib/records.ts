/**
 * Repo read layer (Tech Spec 001 §7): the panel is a stateless client of the
 * Company OS. Two sources — a local checkout (dev/CI) or the GitHub contents
 * API (production) — behind one interface, with a ≤5-minute server cache that
 * revalidates after the panel's own writes.
 *
 * The frontmatter parser is a TypeScript port of the strict YAML subset owned
 * by scripts/approval_engine.py — including the quote/brace-aware comment
 * stripping (regression: EX-107 drill finding).
 */
import { promises as fs } from "fs";
import path from "path";

export type Scalar = string | number | null;
export type InlineDict = Record<string, Scalar>;
export interface RecordData {
  [k: string]: Scalar | InlineDict | InlineDict[];
}
export interface ApprovalRecord {
  id: string;
  type: "approval" | "question";
  state: "pending" | "approved" | "rejected" | "answered" | "withdrawn";
  gate: string;
  department: string;
  priority: "P0" | "P1" | "P2";
  requested_by: string;
  artifact: string;
  action: string;
  created: string;
  sla_due: string;
  assignee: string;
  chain_pos: number;
  hops: InlineDict[];
  notified: InlineDict[];
  stamps: InlineDict[];
  decision: InlineDict | null;
  execution: InlineDict | null;
  body: string;
}

// ---------- parser (strict subset — keep in lockstep with approval_engine.py) ----------

function stripComment(v: string): string {
  let depth = 0,
    quoted = false;
  for (let i = 0; i < v.length; i++) {
    const ch = v[i];
    if (ch === '"') quoted = !quoted;
    else if (ch === "{" && !quoted) depth++;
    else if (ch === "}" && !quoted) depth--;
    else if (ch === "#" && !quoted && depth === 0 && i > 0 && v[i - 1] === " ")
      return v.slice(0, i);
  }
  return v;
}

function coerce(v: string): Scalar {
  if (v === "null" || v === "" || v === "~") return null;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  return v;
}

function splitTop(s: string): string[] {
  const parts: string[] = [];
  let depth = 0,
    cur = "";
  for (const ch of s) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function parseInlineDict(s: string): InlineDict {
  const t = s.trim();
  if (!t.startsWith("{") || !t.endsWith("}")) throw new Error(`bad inline dict: ${s}`);
  const out: InlineDict = {};
  for (const part of splitTop(t.slice(1, -1))) {
    const i = part.indexOf(":");
    out[part.slice(0, i).trim()] = coerce(part.slice(i + 1).trim());
  }
  return out;
}

export function parseRecord(text: string): { data: RecordData; body: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("no frontmatter block");
  const data: RecordData = {};
  let curList: string | null = null;
  for (const line of m[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (line.startsWith("  - ")) {
      if (!curList) throw new Error(`list item outside list: ${line}`);
      (data[curList] as InlineDict[]).push(parseInlineDict(line.slice(4)));
    } else {
      const i = line.indexOf(":");
      const k = line.slice(0, i).trim();
      const v = stripComment(line.slice(i + 1)).trim();
      if (v === "") {
        data[k] = [];
        curList = k;
      } else {
        data[k] = v.startsWith("{") ? parseInlineDict(v) : coerce(v);
        curList = null;
      }
    }
  }
  return { data, body: m[2] };
}

// ---------- sources ----------

export interface RepoSource {
  listDir(dir: string): Promise<string[]>;
  readFile(p: string): Promise<string>;
}

class LocalSource implements RepoSource {
  constructor(private root: string) {}
  async listDir(dir: string) {
    try {
      return (await fs.readdir(path.join(this.root, dir))).filter((f) => f.endsWith(".md"));
    } catch {
      return [];
    }
  }
  async readFile(p: string) {
    return fs.readFile(path.join(this.root, p), "utf8");
  }
}

class GitHubSource implements RepoSource {
  constructor(private repo: string, private token: string, private ref = "main") {}
  private async api(p: string): Promise<any> {
    const res = await fetch(
      `https://api.github.com/repos/${this.repo}/contents/${p}?ref=${this.ref}`,
      { headers: { Authorization: `Bearer ${this.token}`, Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status} for ${p}`);
    return res.json();
  }
  async listDir(dir: string) {
    try {
      const items = await this.api(dir);
      return (items as any[]).filter((i) => i.name.endsWith(".md")).map((i) => i.name);
    } catch {
      return [];
    }
  }
  async readFile(p: string) {
    const item = await this.api(p);
    return Buffer.from(item.content, "base64").toString("utf8");
  }
}

export function repoSource(): RepoSource {
  const gh = process.env.GITHUB_REPO;
  if (gh && process.env.GITHUB_TOKEN) return new GitHubSource(gh, process.env.GITHUB_TOKEN);
  // dev/CI default: the panel lives inside the company repo checkout
  return new LocalSource(process.env.LOCAL_REPO_PATH || path.resolve(process.cwd(), ".."));
}

// ---------- cache (TTL ≤ 5 min, revalidated after own writes) ----------

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

export function revalidate() {
  cache.clear();
}

async function cached<T>(key: string, fn: () => Promise<T>): Promise<{ value: T; asOf: Date }> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { value: hit.value as T, asOf: new Date(hit.at) };
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return { value, asOf: new Date() };
}

// ---------- records ----------

const TEMPLATE = "TEMPLATE.md";

export async function loadRecords(): Promise<{ records: ApprovalRecord[]; asOf: Date }> {
  const src = repoSource();
  const { value, asOf } = await cached("records", async () => {
    const out: ApprovalRecord[] = [];
    for (const dir of ["company/approvals", "company/questions"]) {
      for (const name of await src.listDir(dir)) {
        if (name === TEMPLATE) continue;
        const { data, body } = parseRecord(await src.readFile(`${dir}/${name}`));
        out.push({ ...(data as unknown as ApprovalRecord), body });
      }
    }
    return out.sort((a, b) => a.id.localeCompare(b.id));
  });
  return { records: value, asOf };
}

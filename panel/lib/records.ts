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

// Split on top-level commas only — never inside quotes or nested braces
// (regression: quote-unaware splitting corrupted APR-20260714-002).
function splitTop(s: string): string[] {
  const parts: string[] = [];
  let depth = 0,
    cur = "",
    quoted = false;
  for (const ch of s) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "{" && !quoted) depth++;
    else if (ch === "}" && !quoted) depth--;
    if (ch === "," && depth === 0 && !quoted) {
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

export function parseRecord(raw: string): { data: RecordData; body: string } {
  // Normalize CRLF (Windows checkouts with core.autocrlf) and a UTF-8 BOM —
  // Python's read_text does this implicitly; the TS port must do it explicitly.
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
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

/**
 * Containment guard (EX-206 H1): a repo-relative path must not escape the
 * repo. Record fields like `artifact` are attacker-influenceable (any AI
 * employee writes them), so every read derived from them passes through here.
 * Rejects absolute paths, `..` segments, and NUL; normalizes to forward
 * slashes. Callers additionally restrict to an allowlist of top dirs.
 */
export function safeRepoPath(p: string): string {
  const norm = p.replace(/\\/g, "/");
  if (
    !norm ||
    norm.includes("\0") ||
    norm.startsWith("/") ||
    norm.split("/").some((seg) => seg === ".." )
  ) {
    throw new Error(`unsafe repo path: ${p}`);
  }
  return norm;
}

const ARTIFACT_ALLOW = ["company/", "docs/", "panel/", "guides/", "scripts/", "tests/"];

/** True if a repo path is safe AND under an allowlisted top directory. */
export function isRenderableArtifactPath(p: string): boolean {
  try {
    const s = safeRepoPath(p);
    return ARTIFACT_ALLOW.some((d) => s.startsWith(d));
  } catch {
    return false;
  }
}

class LocalSource implements RepoSource {
  private root: string;
  constructor(root: string) {
    this.root = root;
  }
  async listDir(dir: string) {
    try {
      return (await fs.readdir(path.join(this.root, dir))).filter((f) => f.endsWith(".md"));
    } catch {
      return [];
    }
  }
  async readFile(p: string) {
    const safe = safeRepoPath(p);
    const full = path.resolve(this.root, safe);
    // defense in depth: the resolved path must stay within the repo root
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new Error(`path escapes repo root: ${p}`);
    }
    return fs.readFile(full, "utf8");
  }
}

class GitHubSource implements RepoSource {
  private repo: string;
  private token: string;
  private ref: string;
  constructor(repo: string, token: string, ref = "main") {
    this.repo = repo;
    this.token = token;
    this.ref = ref;
  }
  private async api(p: string): Promise<any> {
    // encode each path segment so a value with ?/#/& (EX-206 L9) can't alter
    // the query (e.g. override ref); host is hard-pinned to api.github.com.
    const encoded = safeRepoPath(p).split("/").map(encodeURIComponent).join("/");
    const res = await fetch(
      `https://api.github.com/repos/${this.repo}/contents/${encoded}?ref=${encodeURIComponent(this.ref)}`,
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

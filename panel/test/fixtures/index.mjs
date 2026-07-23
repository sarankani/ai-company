/**
 * EX-601 — Panel test fixtures & deterministic seeding harness.
 *
 * One-call setup for panel tests: spin up an ISOLATED throwaway clone of the
 * company repo, seed exact records / humans / departments, launch the panel
 * against it with caching OFF, reset to a baseline between tests, and tear
 * everything down. Extracts the ad-hoc clone/seed/`CACHE_TTL_MS=0` pattern
 * that `panel/e2e/smoke.mjs` open-codes today (Plan 004 · issue #54).
 *
 * Isolation guarantees:
 *  - Never touches the real `company/` tree — every write lands in a temp clone
 *    (LOCAL_REPO_PATH), and GITHUB_* / SMTP_* are stripped from the panel's env
 *    so it can never read/write GitHub or send real mail.
 *  - `CACHE_TTL_MS=0` → the running panel sees git changes immediately, so
 *    `reset()` is deterministic with no server restart (records.ts / org.ts).
 *  - Each fixture gets its own temp dir, its own port, and its own ephemeral
 *    SESSION_SECRET — no shared state between tests (UC3).
 *
 * Usage (see ./README.md):
 *   const fx = await createFixture();
 *   const apr = await fx.seedApproval({ action: "Merge PR #1", gate: "merge-deploy" });
 *   await fx.startPanel();
 *   fx.snapshot();                       // mark the per-test baseline
 *   // ... drive fx.baseUrl in a browser ...
 *   await fx.reset();                    // restore the baseline between tests
 *   await fx.teardown();
 */
import { promises as fs } from "fs";
import { readFileSync } from "fs";
import { execFile, spawn, spawnSync } from "child_process";
import { promisify } from "util";
import { randomBytes } from "crypto";
import { createServer } from "net";
import os from "os";
import path from "path";

const run = promisify(execFile);
const IS_WIN = process.platform === "win32";

/**
 * Resolve the repo root (git toplevel) from the current working directory.
 * Avoids `import.meta.url`, which breaks when a test runner (Playwright)
 * transpiles this ESM module to CJS.
 */
async function repoToplevel() {
  return (await run("git", ["rev-parse", "--show-toplevel"], { cwd: process.cwd() })).stdout.trim();
}

/**
 * Resolve a working Python 3 interpreter once. On Windows `python3` is usually
 * a Microsoft-Store stub that fails; try `python`/`py` too. Override with the
 * PYTHON (or PYTHON_BIN) env var.
 */
let PYTHON_CMD = null;
async function resolvePython() {
  if (PYTHON_CMD) return PYTHON_CMD;
  const candidates = [process.env.PYTHON, process.env.PYTHON_BIN, "python3", "python", "py"].filter(Boolean);
  for (const c of candidates) {
    try {
      const out = (await run(c, ["--version"], { maxBuffer: 1 << 20 })).stdout || "";
      if (/Python 3\./.test(out) || c === "py") {
        PYTHON_CMD = c;
        return c;
      }
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error(
    `No Python 3 interpreter found (tried: ${candidates.join(", ")}). ` +
      `Install Python 3 or set the PYTHON env var to its path.`,
  );
}

// ---------- small helpers ----------

async function gitIn(dir, args) {
  return (await run("git", args, { cwd: dir, maxBuffer: 32 * 1024 * 1024 })).stdout;
}

/** Ask the OS for a free TCP port by binding :0 and reading it back. */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- the fixture ----------

/**
 * @typedef {Object} SeedApprovalOpts
 * @property {"approval"|"question"} [type]
 * @property {string} [gate]        one of merge-deploy|external-comms|money|commitments|people|procurement|revenue-booking
 * @property {"P0"|"P1"|"P2"} [priority]
 * @property {string} [requestedBy]
 * @property {string} [artifact]
 * @property {string} action        the exact, verbatim action (required)
 * @property {string} [summary]
 * @property {string} [links]
 * @property {boolean} [commit]     auto-commit the new record (default true)
 */

class Fixture {
  /** @param {string} dir absolute path to the temp clone (…/repo)
   *  @param {string} tmpRoot the mkdtemp root to remove on teardown
   *  @param {string} panelDir the real panel checkout (cwd for `next dev`) */
  constructor(dir, tmpRoot, panelDir) {
    this.dir = dir;
    this.tmpRoot = tmpRoot ?? dir;
    this.panelDir = panelDir;
    /** @type {import("child_process").ChildProcess|null} */
    this.proc = null;
    this.baseUrl = null;
    this.logPath = null;
    this.port = null;
    this.sessionSecret = null;
    this._baseline = null; // git ref that reset() restores to
  }

  // --- git / python plumbing (run against the temp clone) ---

  /** Run scripts/approval_engine.py in the clone; returns stdout. */
  async py(args) {
    const python = await resolvePython();
    return (
      await run(python, ["scripts/approval_engine.py", ...args], {
        cwd: this.dir,
        maxBuffer: 32 * 1024 * 1024,
      })
    ).stdout;
  }

  /** Run git in the clone; returns stdout. */
  git(args) {
    return gitIn(this.dir, args);
  }

  async _commit(message) {
    await this.git(["add", "-A"]);
    await this.git(["commit", "-qm", message]);
  }

  // --- seeding ---

  /**
   * Seed one approval (or question) record via the engine and commit it.
   * Returns the new record id (APR-… / QST-…).
   * @param {SeedApprovalOpts} opts
   */
  async seedApproval(opts) {
    const {
      type = "approval",
      gate = "merge-deploy",
      priority = "P2",
      requestedBy = "developer",
      artifact = "docs/plans/002-execution-plan.md",
      action,
      summary = "Seeded by the panel test fixtures.",
      links,
      commit = true,
    } = opts;
    if (!action) throw new Error("seedApproval: `action` is required (the exact action)");
    const args = [
      "new", "--type", type, "--gate", gate, "--priority", priority,
      "--requested-by", requestedBy, "--artifact", artifact,
      "--action", action, "--summary", summary,
    ];
    if (links) args.push("--links", links);
    const out = await this.py(args);
    const m = out.match(/\b(?:APR|QST)-\d{8}-\d+\b/);
    if (!m) throw new Error(`seedApproval: could not parse a record id from engine output:\n${out}`);
    if (commit) await this._commit(`fixture: seed ${m[0]}`);
    return m[0];
  }

  /** Seed a question record (thin wrapper over seedApproval with type=question). */
  async seedQuestion(opts) {
    return this.seedApproval({ ...opts, type: "question" });
  }

  /**
   * Write (and commit) a human record under company/org/humans/. Covers the
   * `slack_id` path (UC2) and restricted-visibility seats.
   * @param {{id:string,name?:string,email:string,title?:string,
   *          availability?:"available"|"busy"|"ooo",oooUntil?:string|null,
   *          slackId?:string,roles?:{department:string,seat:string}[],
   *          commit?:boolean}} h
   */
  async seedHuman(h) {
    if (!h.id || !h.email) throw new Error("seedHuman: `id` and `email` are required");
    const roles = (h.roles ?? [])
      .map((r) => `  - {department: ${r.department}, seat: ${r.seat}}`)
      .join("\n");
    const fm = [
      "---",
      `id: ${h.id}`,
      `name: ${h.name ?? h.id}`,
      `email: ${h.email}`,
      `title: ${h.title ?? "Seat-holder"}`,
      `availability: ${h.availability ?? "available"}`,
      `ooo_until: ${h.oooUntil ?? "null"}`,
      ...(h.slackId ? [`slack_id: ${h.slackId}`] : []),
      "roles:",
      roles || "  ",
      `created: 2026-07-15`,
      "---",
      "",
      `# ${h.name ?? h.id}`,
      "",
      "Seeded by the panel test fixtures.",
      "",
    ].join("\n");
    const rel = `company/org/humans/${h.id}.md`;
    await fs.writeFile(path.join(this.dir, rel), fm, "utf8");
    if (h.commit ?? true) await this._commit(`fixture: seed human ${h.id}`);
    return h.id;
  }

  /**
   * Append a department row to company/org/departments.md (the markdown table
   * that lib/org.ts parses). Format must match that parser's row regex.
   * @param {{id:string,name:string,employees?:string[],gates?:string}} d
   */
  async seedDepartment(d) {
    if (!d.id || !d.name) throw new Error("seedDepartment: `id` and `name` are required");
    const rel = "company/org/departments.md";
    const full = path.join(this.dir, rel);
    const cur = await fs.readFile(full, "utf8");
    const row = `| \`${d.id}\` | ${d.name} | ${(d.employees ?? []).join(", ")} | ${d.gates ?? "—"} |`;
    await fs.writeFile(full, cur.replace(/\s*$/, "\n") + row + "\n", "utf8");
    if (d.commit ?? true) await this._commit(`fixture: seed department ${d.id}`);
    return d.id;
  }

  /** Arbitrary escape hatch: write a file (repo-relative) and optionally commit. */
  async writeFile(relPath, content, { commit = true } = {}) {
    const full = path.join(this.dir, relPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf8");
    if (commit) await this._commit(`fixture: write ${relPath}`);
  }

  // --- baseline / reset ---

  /** Mark the current commit as the baseline that reset() restores to. */
  async snapshot() {
    this._baseline = (await this.git(["rev-parse", "HEAD"])).trim();
    return this._baseline;
  }

  /**
   * Restore the clone to the last snapshot() (or the initial clone if none),
   * discarding every commit and working-tree change a test made. Because the
   * panel runs with CACHE_TTL_MS=0, the next request already sees the reset
   * state — no server restart needed.
   */
  async reset() {
    const ref = this._baseline ?? "HEAD";
    await this.git(["reset", "--hard", ref]);
    await this.git(["clean", "-fdq"]);
  }

  // --- the panel dev server ---

  /**
   * Launch `next dev` against the temp clone on an ephemeral port with caching
   * off and an ephemeral session secret. Resolves once /signin answers 200.
   * @param {{timeoutMs?:number, extraEnv?:Record<string,string>}} [opts]
   */
  async startPanel(opts = {}) {
    if (this.proc) throw new Error("startPanel: already running");
    this.port = await freePort();
    this.sessionSecret = randomBytes(24).toString("hex");
    // Use `localhost` (not 127.0.0.1): `next dev` advertises localhost, and a
    // host mismatch makes it treat requests as cross-origin, which drops the
    // session cookie set by the magic-link verify route (auth then bounces).
    this.baseUrl = `http://localhost:${this.port}`;
    this.logPath = path.join(this.dir, "panel-dev.log");

    // Build a hermetic env: inherit PATH etc., but STRIP anything that would
    // pull the panel off the temp clone (GitHub) or send real email (SMTP).
    const env = { ...process.env };
    for (const k of [
      "GITHUB_REPO", "GITHUB_TOKEN", "GITHUB_BRANCH",
      "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_SECURE", "NOTIFY_FROM",
      "PANEL_BASE_URL", "VERCEL", "VERCEL_PROJECT_PRODUCTION_URL",
    ]) delete env[k];
    Object.assign(env, {
      LOCAL_REPO_PATH: this.dir,
      CACHE_TTL_MS: "0", // deterministic: externally-seeded records visible at once
      SESSION_SECRET: this.sessionSecret,
      // CRM module removed (EX-801); e2e tests cover Inbox/Dashboard/Audit/Admin only
      AUTH_DEV_LOG: "1", // print magic links to the log so signIn() can read them
      PORT: String(this.port),
      NODE_ENV: "development",
      ...(opts.extraEnv ?? {}),
    });

    const logFd = await fs.open(this.logPath, "w");
    // Launch Next via `node <next-cli>` rather than the .bin shim: the shim is
    // `next.cmd` on Windows (needs a shell to spawn), whereas the JS CLI runs
    // the same everywhere with no shell. On POSIX, detach so we can signal the
    // whole process group (next forks workers); on Windows we kill the tree
    // with taskkill in teardown instead.
    const nextCli = path.join(this.panelDir, "node_modules", "next", "dist", "bin", "next");
    this.proc = spawn(process.execPath, [nextCli, "dev", "--port", String(this.port)], {
      cwd: this.panelDir,
      env,
      detached: !IS_WIN,
      windowsHide: true,
      stdio: ["ignore", logFd.fd, logFd.fd],
    });
    this.proc.on("error", (e) => {
      // surface a spawn failure into the readiness wait below
      this._spawnError = e;
    });
    await logFd.close();

    const timeoutMs = opts.timeoutMs ?? 60_000;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this._spawnError) throw this._spawnError;
      if (this.proc.exitCode !== null) {
        throw new Error(
          `panel exited early (code ${this.proc.exitCode}). Log:\n${this._tailLog()}`,
        );
      }
      try {
        const res = await fetch(`${this.baseUrl}/signin`);
        if (res.ok) return this;
      } catch {
        /* not up yet */
      }
      await sleep(500);
    }
    throw new Error(`panel did not become ready in ${timeoutMs}ms. Log:\n${this._tailLog()}`);
  }

  _tailLog(lines = 40) {
    try {
      return readFileSync(this.logPath, "utf8").split("\n").slice(-lines).join("\n");
    } catch {
      return "(no log)";
    }
  }

  // --- auth helpers ---

  /**
   * Scrape the most recent magic-link URL issued for `email` from the server
   * log (deliverLink logs `[auth] magic link for <email>: <url>` in dev). The
   * link must have been requested first (via signIn or a form submit).
   * Returns an absolute URL string, or null if none seen yet.
   */
  magicLinkFor(email) {
    let log = "";
    try { log = readFileSync(this.logPath, "utf8"); } catch { return null; }
    const re = new RegExp(`magic link for ${email.replace(/[.@+]/g, "\\$&")}: (\\S+)`, "g");
    const hits = [...log.matchAll(re)];
    return hits.length ? hits[hits.length - 1][1] : null;
  }

  /**
   * Sign a Playwright `page` in as `email`: submit the sign-in form, read the
   * magic link from the log, and follow it. Leaves the page on `returnTo`.
   * The browser/page is owned by the caller (fixtures stay browser-agnostic).
   * @param {import("playwright").Page} page
   * @param {string} email
   * @param {{returnTo?:string, timeoutMs?:number}} [opts]
   */
  async signIn(page, email, opts = {}) {
    const returnTo = opts.returnTo ?? "/inbox";
    await page.goto(`${this.baseUrl}/signin?return=${encodeURIComponent(returnTo)}`);
    await page.fill('input[name="email"]', email);
    await page.click('button[type="submit"]');
    await page.waitForURL(/sent=1/);
    // the server action logs the link just after redirecting — poll briefly.
    const deadline = Date.now() + (opts.timeoutMs ?? 5000);
    let url = null;
    while (Date.now() < deadline) {
      url = this.magicLinkFor(email);
      if (url) break;
      await sleep(100);
    }
    if (!url) throw new Error(`no magic link logged for ${email} (is it in the humans registry?)`);
    const u = new URL(url);
    await page.goto(`${this.baseUrl}${u.pathname}${u.search}`);
    return page;
  }

  /**
   * Convenience: launch a chromium browser, reusing the pre-installed binary
   * at /opt/pw-browsers if the default download is absent. Dynamically imports
   * playwright so the browser-less self-check never needs it.
   */
  async launchBrowser() {
    const { chromium } = await import("playwright");
    try {
      return await chromium.launch();
    } catch {
      return await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
    }
  }

  // --- teardown ---

  /** Kill the panel (whole process tree) and remove the temp clone. */
  async teardown() {
    if (this.proc && this.proc.pid && this.proc.exitCode === null) {
      const pid = this.proc.pid;
      if (IS_WIN) {
        // no POSIX process groups — kill the whole tree by pid.
        try { spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true }); }
        catch { /* already dead */ }
        await this._waitExit(3000);
      } else {
        try { process.kill(-pid, "SIGTERM"); } catch { /* group gone */ }
        const gone = await this._waitExit(3000);
        if (!gone) {
          try { process.kill(-pid, "SIGKILL"); } catch { /* already dead */ }
        }
      }
    }
    this.proc = null;
    // remove the whole mkdtemp root (…/repo lives inside it), never anything
    // outside the OS temp dir.
    if (this.tmpRoot && this.tmpRoot.startsWith(os.tmpdir())) {
      await fs.rm(this.tmpRoot, { recursive: true, force: true });
    }
  }

  _waitExit(ms) {
    return new Promise((resolve) => {
      if (!this.proc || this.proc.exitCode !== null) return resolve(true);
      const t = setTimeout(() => resolve(false), ms);
      this.proc.once("exit", () => { clearTimeout(t); resolve(true); });
    });
  }
}

/**
 * Create an isolated company-repo fixture: clone the current checkout into a
 * fresh temp dir with a throwaway git identity. Nothing is seeded yet.
 * @param {{sourceRepo?:string}} [opts] sourceRepo defaults to the repo the
 *        panel lives in (git toplevel).
 * @returns {Promise<Fixture>}
 */
export async function createFixture(opts = {}) {
  const root = await repoToplevel();
  const source = opts.sourceRepo ?? root;
  const panelDir = opts.panelDir ?? path.join(root, "panel");
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "evalyn-fx-"));
  const dir = path.join(tmp, "repo");
  // local clone of the current HEAD; --no-hardlinks keeps the temp copy fully
  // independent of the source object store.
  await run("git", ["clone", "--quiet", "--no-hardlinks", source, dir], {
    maxBuffer: 64 * 1024 * 1024,
  });
  await gitIn(dir, ["config", "user.email", "fixtures@evalyn.local"]);
  await gitIn(dir, ["config", "user.name", "Evalyn Fixtures"]);
  await gitIn(dir, ["config", "commit.gpgsign", "false"]);
  const fx = new Fixture(dir, tmp, panelDir);
  await fx.snapshot(); // default baseline = the pristine clone
  return fx;
}

export { Fixture };

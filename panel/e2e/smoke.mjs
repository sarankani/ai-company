/**
 * EX-203 end-to-end smoke suite — drives the real panel in a real browser
 * against a THROWAWAY clone of the company repo (never the live checkout:
 * decisions are commits, and this suite makes ~6 of them).
 *
 * Setup (see panel/README.md):
 *   1. git clone <company-repo> /tmp/evalyn-smoke && cd /tmp/evalyn-smoke
 *      git config user.email test@local && git config user.name "Smoke"
 *   2. cd panel && SESSION_SECRET=smoke LOCAL_REPO_PATH=/tmp/evalyn-smoke \
 *      PORT=3100 npm run dev > /tmp/panel-dev.log 2>&1 &
 *   3. SMOKE_REPO=/tmp/evalyn-smoke PANEL_LOG=/tmp/panel-dev.log \
 *      node e2e/smoke.mjs        (needs `playwright` + a chromium)
 *
 * Covers issue #21's acceptance criteria: one decision = one commit with a
 * Decided-by trailer · server-side authz + people-gate visibility · QST
 * answer path · dual-approval two-stamp sequence · optimistic concurrency
 * (stale write rejected, nothing clobbered) · follow-up leaves item pending
 * · Python engine validates every panel-written record (parser parity).
 */
import { chromium } from "playwright";
import { readFileSync, appendFileSync, readdirSync } from "fs";
import { execFileSync } from "child_process";

const BASE = process.env.PANEL_BASE ?? "http://localhost:3100";
const REPO = process.env.SMOKE_REPO;
const LOG = process.env.PANEL_LOG;
if (!REPO || !LOG) {
  console.error("Set SMOKE_REPO (throwaway clone path) and PANEL_LOG (dev-server log path).");
  process.exit(2);
}
const APPROVER = process.env.SMOKE_APPROVER ?? "saravanan@vitetech.in"; // engineering seat
const CEO = process.env.SMOKE_CEO ?? "saranpkani@gmail.com"; // ceo + people-finance seats

const ok = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${extra ? " — " + extra : ""}`);
  if (!cond) process.exitCode = 1;
};
const py = (args) => execFileSync("python3", ["scripts/approval_engine.py", ...args], { cwd: REPO }).toString();
const git = (args) => execFileSync("git", args, { cwd: REPO }).toString();

// ---------- seed ----------
const APR = py(["new", "--type", "approval", "--gate", "merge-deploy", "--priority", "P1",
  "--requested-by", "developer", "--artifact", "docs/plans/002-execution-plan.md",
  "--action", "Merge the smoke-test PR #999 into main",
  "--summary", "Smoke-test record for the decide surface. **Recommendation: approve.**"]).match(/APR-\d+-\d+/)[0];
const PEOPLE = py(["new", "--type", "approval", "--gate", "people", "--priority", "P2",
  "--requested-by", "hr", "--artifact", "https://example.com/offer",
  "--action", "Extend offer to candidate X at band 3",
  "--summary", "People-gate visibility test record."]).match(/APR-\d+-\d+/)[0];
git(["add", "-A"]);
git(["commit", "-qm", "smoke: seed test records"]);

// ---------- browser ----------
for (let i = 0; i < 60; i++) {
  try { await fetch(`${BASE}/signin`); break; } catch { await new Promise((r) => setTimeout(r, 1000)); }
}
let browser;
try { browser = await chromium.launch(); }
catch { browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }); }

async function signIn(email) {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${BASE}/signin?return=/inbox`);
  await page.fill('input[name="email"]', email);
  await page.click('button[type="submit"]');
  await page.waitForURL(/sent=1/);
  await new Promise((r) => setTimeout(r, 500));
  const log = readFileSync(LOG, "utf8");
  const m = [...log.matchAll(new RegExp(`magic link for ${email.replace(/[.@]/g, "\\$&")}: (\\S+)`, "g"))].pop();
  ok(`magic link issued for ${email}`, !!m);
  await page.goto(new URL(new URL(m[1]).pathname + new URL(m[1]).search, BASE).href);
  return page;
}

// 1. sign in as the engineering Approver
const page = await signIn(APPROVER);
await page.waitForURL(/\/inbox/);
ok("magic link signs in and lands on inbox", page.url().includes("/inbox"));

// 2. inbox: engineering item visible, people-gate item hidden
const inboxText = await page.textContent("main");
ok("engineering item visible in inbox", inboxText.includes("smoke-test PR #999"));
ok("people-gate item HIDDEN from non-people seat", !inboxText.includes(PEOPLE) && !inboxText.includes("Extend offer"));

// 3. item detail
await page.click(`a[href="/item/${APR}"]`);
await page.waitForURL(new RegExp(`/item/${APR}`));
const detail = await page.textContent("main");
ok("exact action shown verbatim", detail.includes("Merge the smoke-test PR #999 into main"));
ok("summary rendered", detail.includes("Recommendation: approve"));
ok("timeline shows creation event", detail.includes("record created"));

// 4. follow-up question (item must stay pending)
await page.click("details.alt:has(textarea[name='text']) summary");
await page.fill('textarea[name="text"]', "Smoke follow-up: is PR #999 rebased?");
await page.click('form:has(textarea[name="text"]) button');
await page.waitForURL(/asked=1/);
const afterAsk = await page.textContent("main");
ok("follow-up posted to Thread", afterAsk.includes("is PR #999 rebased?"));
ok("item stays pending after follow-up", afterAsk.includes("Your decision"));
ok("follow-up commit has Asked-by trailer", git(["log", "-1", "--format=%B"]).includes("Asked-by:"));

// 5. optimistic concurrency: mutate the record behind the form's back
appendFileSync(`${REPO}/company/approvals/${APR}.md`, "\n<!-- concurrent edit -->\n");
await page.click('form:has(input[value="approved"]) button');
await page.waitForURL(/err=conflict/);
ok("stale write rejected with conflict banner", (await page.textContent("main")).includes("changed since you loaded"));
const recAfterConflict = readFileSync(`${REPO}/company/approvals/${APR}.md`, "utf8");
ok("record untouched by rejected write", recAfterConflict.includes("<!-- concurrent edit -->") && recAfterConflict.includes("state: pending"));

// 6. approve from the reloaded (fresh) page
await page.click('form:has(input[value="approved"]) button');
await page.waitForURL(/done=approved/);
ok("decision banner shown", (await page.textContent("main")).includes("Decision recorded"));

// 7. one decision = one commit: stamp + trailer + registry together
const cm = git(["log", "-1", "--format=%B"]);
ok("commit: '<id>: approved via panel by <human>'", cm.includes(`${APR}: approved via panel by`), cm.split("\n")[0]);
ok("commit has Decided-by trailer", cm.includes("Decided-by:"));
const stat = git(["show", "--stat", "--format=", "HEAD"]);
ok("one commit touches record + registry", stat.includes(`${APR}.md`) && stat.includes("registry.md"));
const rec = readFileSync(`${REPO}/company/approvals/${APR}.md`, "utf8");
ok("record state=approved with stamp + artifact sha", rec.includes("state: approved") && rec.includes("approved_artifact_sha:"));
ok("registry lists it approved (open until executed)", readFileSync(`${REPO}/company/registry.md`, "utf8").includes(`| ${APR} | approval | merge-deploy | engineering | approved |`));
ok("Python engine validates the panel-written record", py(["validate"]).includes("OK"));

// 8. people-gate deep link restricted; decided item read-only
await page.goto(`${BASE}/item/${PEOPLE}`);
ok("people-gate deep link → restricted card", (await page.textContent("main")).includes("People & Finance seat"));
await page.goto(`${BASE}/item/${APR}`);
const done = await page.textContent("main");
ok("decided item shows stamp, no decide panel", done.includes("approved") && !done.includes("Your decision"));

// 9. question records answered through the same surface
py(["new", "--type", "question", "--gate", "merge-deploy", "--priority", "P2",
  "--requested-by", "developer", "--artifact", "docs/plans/002-execution-plan.md",
  "--action", "Which auth provider should the deploy use?", "--summary", "Smoke QST record."]);
const QST = readdirSync(`${REPO}/company/questions`).find((f) => f.startsWith("QST-")).replace(".md", "");
git(["add", "-A"]);
git(["commit", "-qm", "smoke: seed QST"]);
await page.goto(`${BASE}/item/${QST}`);
ok("question shows Answer form (not approve/reject)",
  (await page.locator('form input[value="answered"]').count()) === 1 &&
  (await page.locator('form input[value="approved"]').count()) === 0);
await page.fill('textarea[name="reason"]', "Use magic-link, per locked decision Q-3.");
await page.click('form:has(input[value="answered"]) button');
await page.waitForURL(/done=answered/);
const qRec = readFileSync(`${REPO}/company/questions/${QST}.md`, "utf8");
ok("question answered via panel, answer in stamp", qRec.includes("state: answered") && qRec.includes("magic-link"));

// 10. dual approval (people gate): first stamp holds, second closes
const p2 = await signIn(CEO);
await p2.goto(`${BASE}/item/${PEOPLE}`);
const dual0 = await p2.textContent("main");
ok("people-gate item visible to ceo seat", dual0.includes("Extend offer to candidate X"));
ok("dual meter shows 0 of 2", dual0.includes("0 of 2 stamps"));
await p2.click('form:has(input[value="approved"]) button');
await p2.waitForURL(/stamped=1/);
ok("first stamp: still pending, meter 1 of 2", (await p2.textContent("main")).includes("1 of 2 stamps"));
ok("record still pending after first stamp", readFileSync(`${REPO}/company/approvals/${PEOPLE}.md`, "utf8").includes("state: pending"));
await p2.click('form:has(input[value="approved"]) button');
await p2.waitForURL(/done=approved/);
ok("second stamp closes the dual gate", readFileSync(`${REPO}/company/approvals/${PEOPLE}.md`, "utf8").includes("state: approved"));
ok("engine validates all panel-written records", py(["validate"]).includes("OK"));

await browser.close();
console.log(process.exitCode ? "SMOKE: FAILURES" : "SMOKE: ALL PASS");

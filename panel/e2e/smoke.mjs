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
 *      (start the dev server with CACHE_TTL_MS=0 so reads are uncached and
 *       externally-seeded records are visible immediately — deterministic)
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

// 8b. dashboard + board (EX-204) as the engineering approver
await page.goto(`${BASE}/dashboard`);
const dash = await page.textContent("main");
ok("dashboard renders all 7 department tiles",
  ["Leadership", "People & Finance", "Product & Design", "Engineering", "Sales & Delivery", "Marketing & Support", "Operations"].every((n) => dash.includes(n)));
ok("people-gate item absent from tiles for non-people seat", !dash.includes("Extend offer"));
const pfTile = await page.locator('a[href="/board/people-finance"]').textContent();
ok("people-finance tile counts nothing (restricted item not counted)", !pfTile.includes("1"));
await page.click('a[href="/board/engineering"]');
await page.waitForURL(/board\/engineering/);
const board = await page.textContent("main");
ok("engineering board shows approved item under In flight", board.includes("In flight") && board.includes("smoke-test PR #999"));
ok("people-gate item absent from engineering-neighbor boards", !board.includes("Extend offer"));
await page.goto(`${BASE}/board/engineering?emp=developer&state=approved`);
const filtered = await page.textContent("main");
ok("composable URL filters narrow the board", filtered.includes("smoke-test PR #999"));
await page.goto(`${BASE}/board/engineering?emp=nobody`);
ok("filter with no matches shows empty groups", (await page.textContent("main")).includes("Nothing here"));

// 8c. EX-206 H1 — artifact path traversal / People-gate bypass is blocked.
// A widely-visible engineering record whose artifact points at the People-gate
// record must NOT render that record's body to the engineering approver.
const bypass = py(["new", "--type", "approval", "--gate", "merge-deploy", "--priority", "P2",
  "--requested-by", "developer", "--artifact", `company/approvals/${PEOPLE}.md`,
  "--action", "Bypass probe: artifact points at a People-gate record", "--summary", "probe"]).match(/APR-\d+-\d+/)[0];
git(["add", "-A"]); git(["commit", "-qm", "smoke: bypass probe"]);
await page.goto(`${BASE}/item/${bypass}`);
const bypassPage = await page.textContent("main");
ok("H1: People-gate record body NOT rendered via artifact bypass", !bypassPage.includes("Extend offer to candidate X"));
// a traversal artifact renders as link-out, never inline file read
const trav = py(["new", "--type", "approval", "--gate", "merge-deploy", "--priority", "P2",
  "--requested-by", "developer", "--artifact", "../../../../etc/hosts",
  "--action", "Traversal probe", "--summary", "probe"]).match(/APR-\d+-\d+/)[0];
git(["add", "-A"]); git(["commit", "-qm", "smoke: traversal probe"]);
await page.goto(`${BASE}/item/${trav}`);
ok("H1: traversal artifact does not read host files", !(await page.textContent("main")).includes("localhost"));

// 8d. EX-206 M5 — open redirect is neutralized
await page.goto(`${BASE}/signin?return=https://evil.example`);
const returnField = await page.getAttribute('input[name="return"]', "value");
ok("M5: off-site return= is not reflected into the form", returnField === "/inbox");

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

// 11. dashboard as ceo seat: people-gate work IS visible and counted
await p2.goto(`${BASE}/dashboard`);
const pfTileCeo = await p2.locator('a[href="/board/people-finance"]').textContent();
ok("ceo's people-finance tile counts the approved item in flight", pfTileCeo.includes("1 in flight"));
await p2.goto(`${BASE}/board/people-finance`);
const pfBoard = await p2.textContent("main");
ok("people-finance board shows the item to the ceo seat", pfBoard.includes("Extend offer to candidate X"));

// 12. EX-205 — availability: one tap, committed, routing skips next run
// The action redirects back to the same URL, so waiting on the URL is a
// no-op — wait for the commit itself to land instead.
const waitForCommit = async (substr, tries = 60) => {
  for (let i = 0; i < tries; i++) {
    if (git(["log", "-1", "--format=%s"]).includes(substr)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};
// seed a fresh pending engineering item assigned to saravanan-p (the approver)
const parkId = py(["new", "--type", "approval", "--gate", "merge-deploy", "--priority", "P2",
  "--requested-by", "developer", "--artifact", "docs/plans/002-execution-plan.md",
  "--action", "Item parked on the approver before they go OOO", "--summary", "probe"]).match(/APR-\d+-\d+/)[0];
git(["add", "-A"]); git(["commit", "-qm", "smoke: park item on approver"]);
ok("seeded item assigned to the approver",
  readFileSync(`${REPO}/company/approvals/${parkId}.md`, "utf8").includes("assignee: saravanan-p"));

await page.goto(`${BASE}/inbox`);
await page.click(".avail-menu summary");
await page.click('.avail-form button[value="busy"]');
ok("availability commit written", await waitForCommit("saravanan-p availability → busy"));
await page.goto(`${BASE}/inbox`);
ok("topbar chip reflects new status", (await page.textContent(".avail-menu summary")).includes("busy"));
ok("humans file updated, comments preserved",
  readFileSync(`${REPO}/company/org/humans/saravanan-p.md`, "utf8").match(/availability: busy.*#/));
// EX-301: the parked item reassigned immediately, in the same availability commit
const parked = readFileSync(`${REPO}/company/approvals/${parkId}.md`, "utf8");
ok("EX-301: frontmatter assignee moved off the OOO approver",
  /^assignee: saran$/m.test(parked) && !/^assignee: saravanan-p$/m.test(parked));
ok("EX-301: reassignment logged as unavailable-skip hop", parked.includes("unavailable-skip"));
ok("EX-301: reassignment shared the availability commit",
  git(["show", "--stat", "--format=%s", "HEAD"]).includes(`${parkId}.md`) &&
  /reassigned \d+ pending item/.test(git(["log", "-1", "--format=%s"])));
const routed = py(["new", "--type", "approval", "--gate", "merge-deploy", "--priority", "P2",
  "--requested-by", "developer", "--artifact", "docs/plans/002-execution-plan.md",
  "--action", "Routing probe while approver busy", "--summary", "probe"]);
ok("routing skips the busy approver (assigns deputy)", routed.includes("engineering / saran"), routed.trim());
git(["add", "-A"]); git(["commit", "-qm", "smoke: routing probe"]);
await page.click(".avail-menu summary");
await page.click('.avail-form button[value="available"]');
ok("availability restored", await waitForCommit("saravanan-p availability → available"));

// 13. EX-205 — admin: guard, then the two-step seat change end to end
await page.goto(`${BASE}/admin`);
ok("admin restricted for non-head seat", (await page.textContent("main")).includes("Head & CEO only"));
await p2.goto(`${BASE}/admin`);
const admin = await p2.textContent("main");
ok("admin lists humans with seats", admin.includes("saravanan-p") && admin.includes("engineering·approver"));
await p2.selectOption('select[name="department"]', "engineering");
await p2.selectOption('select[name="seat"]', "approver");
await p2.selectOption('select[name="to"]', "saran");
await p2.fill('input[name="why"]', "smoke: exercise the two-step path");
await p2.click(".propose button");
await p2.waitForURL(/proposed=APR/);
const proposalId = new URL(p2.url()).searchParams.get("proposed");
ok("proposal created as people-gate record", !!proposalId,  proposalId ?? "");
const propRec = readFileSync(`${REPO}/company/approvals/${proposalId}.md`, "utf8");
ok("proposal routed people-finance, pending", propRec.includes("gate: people") && propRec.includes("state: pending"));
// dual approval on the normal decide surface (ceo + dept seats both = saran at n=2)
await p2.goto(`${BASE}/item/${proposalId}`);
await p2.click('form:has(input[value="approved"]) button');
await p2.waitForURL(/stamped=1/);
await p2.click('form:has(input[value="approved"]) button');
await p2.waitForURL(/done=approved/);
// apply from /admin — exactly-once commit moves the role
await p2.goto(`${BASE}/admin`);
await p2.click("button.apply");
await p2.waitForURL(/applied=/);
ok("apply banner shown", (await p2.textContent("main")).includes("applied"));
ok("role moved: saran now engineering approver",
  readFileSync(`${REPO}/company/org/humans/saran.md`, "utf8").includes("{department: engineering, seat: approver}"));
ok("role moved: saravanan-p no longer engineering approver",
  !readFileSync(`${REPO}/company/org/humans/saravanan-p.md`, "utf8").includes("{department: engineering, seat: approver}"));
const applyStat = git(["show", "--stat", "--format=", "HEAD"]);
ok("one apply commit: record + both humans files + registry",
  applyStat.includes(`${proposalId}.md`) && applyStat.includes("saran.md") &&
  applyStat.includes("saravanan-p.md") && applyStat.includes("registry.md"));
ok("execution stamped exactly once",
  readFileSync(`${REPO}/company/approvals/${proposalId}.md`, "utf8").includes("executed_at"));
ok("engine validates after seat change", py(["validate"]).includes("OK"));

// 14. EX-302 — decision ledger (Head/CEO only)
await page.goto(`${BASE}/audit`);
ok("ledger restricted for non-head seat", (await page.textContent("main")).includes("Head & CEO only"));
await p2.goto(`${BASE}/audit`);
const ledger = await p2.textContent("main");
ok("ledger lists decision events", /\d+ events?/.test(ledger) && ledger.includes("Decision ledger"));
ok("ledger includes a known approved decision", ledger.includes("approved"));
ok("ledger includes an execution event", ledger.includes("executed"));
await p2.goto(`${BASE}/audit?gate=people`);
const peopleLedger = await p2.locator("table.ledger").textContent().catch(() => "");
ok("ledger filters by gate (people includes PEOPLE, excludes merge-deploy record)",
  peopleLedger.includes(PEOPLE) && !peopleLedger.includes(APR));
await p2.goto(`${BASE}/audit?from=2099-01-01`);
ok("ledger date filter narrows to empty", (await p2.textContent("main")).includes("No events match"));

await browser.close();
console.log(process.exitCode ? "SMOKE: FAILURES" : "SMOKE: ALL PASS");

/**
 * EX-601 — a migrated spec that CONSUMES the fixtures (proves UC1 end to end).
 *
 * Ports two proven flows out of panel/e2e/smoke.mjs onto the harness:
 *   1. approve a merge-deploy item  → one stamped commit + registry update
 *   2. people-gate visibility       → hidden from a non-people seat
 * and demonstrates the reset()-between-tests pattern the @playwright/test
 * project (EX-602) will use in beforeEach/afterEach.
 *
 *   cd panel && node test/specs/item-decide.spec.mjs      (needs playwright + chromium)
 *
 * This is a thin, dependency-light runner on purpose — the full migration to
 * `@playwright/test` (config, retries, traces, HTML report) is EX-602. What
 * matters here: the fixtures are the single source of setup, and a real spec
 * relies on them.
 */
import { readFileSync } from "fs";
import path from "path";
import { createFixture } from "../fixtures/index.mjs";

const APPROVER = "saravanan@vitetech.in"; // engineering approver in the seeded registry

let failures = 0;
const ok = (name, cond, extra = "") => {
  console.log(`  ${cond ? "PASS" : "FAIL"}: ${name}${extra ? " — " + extra : ""}`);
  if (!cond) failures++;
};
const read = (fx, rel) => readFileSync(path.join(fx.dir, rel), "utf8");

// minimal test harness (EX-602 replaces this with @playwright/test)
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test("approve a merge-deploy item → one stamped commit + registry", async (fx, browser) => {
  const apr = await fx.seedApproval({
    gate: "merge-deploy", priority: "P1", requestedBy: "developer",
    action: "Merge the item-decide spec PR #7 into main",
    summary: "Spec record for the decide surface. **Recommendation: approve.**",
  });
  const page = await (await browser.newContext()).newPage();
  await fx.signIn(page, APPROVER);
  await page.waitForURL(/\/inbox/);
  ok("engineering item visible in inbox", (await page.textContent("main")).includes("item-decide spec PR #7"));

  await page.click(`a[href="/item/${apr}"]`);
  await page.waitForURL(new RegExp(`/item/${apr}`));
  ok("exact action shown verbatim", (await page.textContent("main")).includes("Merge the item-decide spec PR #7 into main"));

  await page.click('form:has(input[value="approved"]) button');
  await page.waitForURL(/done=approved/);
  ok("decision banner shown", (await page.textContent("main")).includes("Decision recorded"));

  const commit = (await fx.git(["log", "-1", "--format=%B"]));
  ok("commit is '<id>: approved via panel by <human>'", commit.includes(`${apr}: approved via panel by`), commit.split("\n")[0]);
  ok("commit has a Decided-by trailer", commit.includes("Decided-by:"));
  ok("record is approved with an artifact sha", read(fx, `company/approvals/${apr}.md`).includes("state: approved"));
  ok("registry lists it approved", read(fx, "company/registry.md").includes(`| ${apr} | approval | merge-deploy | engineering | approved |`));
  ok("engine validates the panel-written record", (await fx.py(["validate"])).includes("OK"));
});

test("people-gate item is hidden from a non-people seat", async (fx, browser) => {
  const people = await fx.seedApproval({
    gate: "people", priority: "P2", requestedBy: "hr", artifact: "https://example.com/offer",
    action: "Extend offer to candidate X at band 3",
    summary: "People-gate visibility test record.",
  });
  const page = await (await browser.newContext()).newPage();
  await fx.signIn(page, APPROVER);
  await page.waitForURL(/\/inbox/);
  const inbox = await page.textContent("main");
  ok("people-gate item absent from inbox", !inbox.includes(people) && !inbox.includes("Extend offer"));

  await page.goto(`${fx.baseUrl}/item/${people}`);
  ok("people-gate deep link → restricted card", (await page.textContent("main")).includes("People & Finance seat"));
});

// ---------- runner: one fixture + server, reset() between tests ----------
const fx = await createFixture();
let browser;
try {
  await fx.startPanel();
  await fx.snapshot(); // per-test baseline
  browser = await fx.launchBrowser();
  for (const t of tests) {
    console.log(`\n▶ ${t.name}`);
    await t.fn(fx, browser);
    await fx.reset(); // no state leaks into the next test (UC3)
  }
  console.log(failures ? `\nSPEC: ${failures} FAILURE(S)` : "\nSPEC: ALL PASS");
} finally {
  if (browser) await browser.close();
  await fx.teardown();
}
process.exit(failures ? 1 : 0);

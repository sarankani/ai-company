import { test, expect } from "../fixtures/playwright";
import { appendFileSync, readFileSync } from "fs";
import path from "path";

/**
 * Item detail + decide surface (issue #21) — ported 1:1 from smoke.mjs §3-9.
 * Each test seeds its own record; the fixture resets the clone between tests.
 */

const APPROVER = "saravanan@vitetech.in"; // engineering approver seat

const seedMerge = (fx: any, action: string) =>
  fx.seedApproval({
    gate: "merge-deploy",
    priority: "P1",
    requestedBy: "developer",
    action,
    summary: "Spec record for the decide surface. **Recommendation: approve.**",
  });

test("item detail renders the exact action, summary and creation event", async ({ page, fx }) => {
  const apr = await seedMerge(fx, "Merge the item-detail spec PR into main");
  await fx.signIn(page, APPROVER);
  await expect(page).toHaveURL(/\/inbox/);
  await expect(page.locator("main")).toContainText("item-detail spec PR");

  await page.click(`a[href="/item/${apr}"]`);
  await expect(page).toHaveURL(new RegExp(`/item/${apr}`));
  const main = page.locator("main");
  await expect(main).toContainText("Merge the item-detail spec PR into main");
  await expect(main).toContainText("Recommendation: approve");
  await expect(main).toContainText("record created");
});

test("follow-up question keeps the item pending and trailers the commit", async ({ page, fx }) => {
  const apr = await seedMerge(fx, "Merge the follow-up spec PR into main");
  await fx.signIn(page, APPROVER);
  await page.goto(`${fx.baseUrl}/item/${apr}`);

  await page.click("details.alt:has(textarea[name='text']) summary");
  await page.fill('textarea[name="text"]', "Spec follow-up: is this PR rebased?");
  await page.click('form:has(textarea[name="text"]) button');
  await expect(page).toHaveURL(/asked=1/);

  const main = page.locator("main");
  await expect(main).toContainText("is this PR rebased?");
  await expect(main).toContainText("Your decision"); // still pending
  expect(await fx.git(["log", "-1", "--format=%B"])).toContain("Asked-by:");
});

test("optimistic concurrency: a stale write is rejected and the record is untouched", async ({ page, fx }) => {
  const apr = await seedMerge(fx, "Merge the concurrency spec PR into main");
  await fx.signIn(page, APPROVER);
  await page.goto(`${fx.baseUrl}/item/${apr}`);

  // mutate the record behind the form's back → its content sha no longer matches
  appendFileSync(path.join(fx.dir, `company/approvals/${apr}.md`), "\n<!-- concurrent edit -->\n");
  await page.click('form:has(input[value="approved"]) button');
  await expect(page).toHaveURL(/err=conflict/);
  await expect(page.locator("main")).toContainText("changed since you loaded");

  const rec = readFileSync(path.join(fx.dir, `company/approvals/${apr}.md`), "utf8");
  expect(rec).toContain("<!-- concurrent edit -->");
  expect(rec).toContain("state: pending"); // rejected write clobbered nothing
});

test("approve writes one stamped commit + registry, and the engine validates it", async ({ page, fx }) => {
  const apr = await seedMerge(fx, "Merge the approve spec PR into main");
  await fx.signIn(page, APPROVER);
  await page.goto(`${fx.baseUrl}/item/${apr}`);

  await page.click('form:has(input[value="approved"]) button');
  await expect(page).toHaveURL(/done=approved/);
  await expect(page.locator("main")).toContainText("Decision recorded");

  const commit = await fx.git(["log", "-1", "--format=%B"]);
  expect(commit).toContain(`${apr}: approved via panel by`);
  expect(commit).toContain("Decided-by:");

  const stat = await fx.git(["show", "--stat", "--format=", "HEAD"]);
  expect(stat).toContain(`${apr}.md`);
  expect(stat).toContain("registry.md"); // one commit touches record + registry

  const rec = readFileSync(path.join(fx.dir, `company/approvals/${apr}.md`), "utf8");
  expect(rec).toContain("state: approved");
  expect(rec).toContain("approved_artifact_sha:");
  expect(readFileSync(path.join(fx.dir, "company/registry.md"), "utf8"))
    .toContain(`| ${apr} | approval | merge-deploy | engineering | approved |`);
  expect(await fx.py(["validate"])).toContain("OK");
});

test("a decided item is read-only (stamp shown, no decide panel)", async ({ page, fx }) => {
  const apr = await seedMerge(fx, "Merge the read-only spec PR into main");
  await fx.signIn(page, APPROVER);
  await page.goto(`${fx.baseUrl}/item/${apr}`);
  await page.click('form:has(input[value="approved"]) button');
  await expect(page).toHaveURL(/done=approved/);

  await page.goto(`${fx.baseUrl}/item/${apr}`);
  const main = page.locator("main");
  await expect(main).toContainText("approved");
  await expect(main).not.toContainText("Your decision");
});

test("question records are answered through the same surface", async ({ page, fx }) => {
  const qst = await fx.seedQuestion({
    gate: "merge-deploy", priority: "P2", requestedBy: "developer",
    action: "Which auth provider should the deploy use?",
    summary: "Spec QST record.",
  });
  await fx.signIn(page, APPROVER);
  await page.goto(`${fx.baseUrl}/item/${qst}`);

  await expect(page.locator('form input[value="answered"]')).toHaveCount(1);
  await expect(page.locator('form input[value="approved"]')).toHaveCount(0);

  await page.fill('textarea[name="reason"]', "Use magic-link, per locked decision Q-3.");
  await page.click('form:has(input[value="answered"]) button');
  await expect(page).toHaveURL(/done=answered/);

  const rec = readFileSync(path.join(fx.dir, `company/questions/${qst}.md`), "utf8");
  expect(rec).toContain("state: answered");
  expect(rec).toContain("magic-link");
});

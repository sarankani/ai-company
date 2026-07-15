import { test, expect } from "../fixtures/playwright";

/**
 * Decision ledger (EX-302) — ported from smoke.mjs §14.
 * Head/CEO-only audit view over every decision, with gate and date filters.
 */

const CEO = "saranpkani@gmail.com"; // ceo + head seats
const APPROVER = "saravanan@vitetech.in";

test("the ledger is restricted to Head & CEO seats", async ({ page, fx }) => {
  await fx.seedHuman({
    id: "spec-approver", name: "Spec Approver", email: "spec-approver@evalyn.local",
    title: "Test Approver", roles: [{ department: "marketing-support", seat: "approver" }],
  });
  await fx.signIn(page, "spec-approver@evalyn.local");
  await page.goto(`${fx.baseUrl}/audit`);
  await expect(page.locator("main")).toContainText("Head & CEO only");
});

test("the ledger lists decisions and filters by gate and date", async ({ page, fx }) => {
  const merge = await fx.seedApproval({
    gate: "merge-deploy", priority: "P1", requestedBy: "developer",
    action: "Merge the audit-ledger PR into main", summary: "Engineering item.",
  });
  const people = await fx.seedApproval({
    gate: "people", priority: "P2", requestedBy: "hr", artifact: "https://example.com/offer",
    action: "Extend offer to candidate X at band 3", summary: "People-gate item.",
  });

  // decide both (CEO is authorized for every gate): merge = one stamp, people = two
  await fx.signIn(page, CEO);
  await page.goto(`${fx.baseUrl}/item/${merge}`);
  await page.click('form:has(input[value="approved"]) button');
  await expect(page).toHaveURL(/done=approved/);
  await page.goto(`${fx.baseUrl}/item/${people}`);
  await page.click('form:has(input[value="approved"]) button');
  await expect(page).toHaveURL(/stamped=1/);
  await page.click('form:has(input[value="approved"]) button');
  await expect(page).toHaveURL(/done=approved/);

  await page.goto(`${fx.baseUrl}/audit`);
  const main = page.locator("main");
  await expect(main).toContainText("Decision ledger");
  await expect(main).toContainText(/\d+ events?/);
  await expect(main).toContainText("approved");

  // gate filter: people view includes the people record, excludes the merge one
  await page.goto(`${fx.baseUrl}/audit?gate=people`);
  const ledger = page.locator("table.ledger");
  await expect(ledger).toContainText(people);
  await expect(ledger).not.toContainText(merge);

  // date filter narrows to empty
  await page.goto(`${fx.baseUrl}/audit?from=2099-01-01`);
  await expect(page.locator("main")).toContainText("No events match");
});

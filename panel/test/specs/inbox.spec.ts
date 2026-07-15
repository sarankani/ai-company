import { test, expect } from "../fixtures/playwright";

/**
 * Inbox visibility (issue #21) — ported from smoke.mjs §2.
 * A seat sees its department's items and never another gate's restricted work.
 */

const APPROVER = "saravanan@vitetech.in"; // engineering approver (not people)

test("inbox shows the seat's items and hides other-gate work", async ({ page, fx }) => {
  await fx.seedApproval({
    gate: "merge-deploy", priority: "P1", requestedBy: "developer",
    action: "Merge the inbox-visibility PR into main",
    summary: "Engineering item — should be visible.",
  });
  const people = await fx.seedApproval({
    gate: "people", priority: "P2", requestedBy: "hr", artifact: "https://example.com/offer",
    action: "Extend offer to candidate X at band 3",
    summary: "People-gate item — should be hidden from engineering.",
  });

  await fx.signIn(page, APPROVER);
  await expect(page).toHaveURL(/\/inbox/);
  const main = page.locator("main");
  await expect(main).toContainText("inbox-visibility PR"); // engineering item visible
  await expect(main).not.toContainText("Extend offer"); // people-gate item hidden
  await expect(main).not.toContainText(people);

  // a deep link to the restricted item shows a gate card, not its contents
  await page.goto(`${fx.baseUrl}/item/${people}`);
  await expect(page.locator("main")).toContainText("People & Finance seat");
});

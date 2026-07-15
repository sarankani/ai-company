import { test, expect } from "../fixtures/playwright";

/**
 * Company Dashboard + Department Board (EX-204) — ported from smoke.mjs §8b.
 * Tiles/boards respect the same gate visibility as the inbox.
 */

const APPROVER = "saravanan@vitetech.in"; // engineering approver
const DEPARTMENTS = [
  "Leadership", "People & Finance", "Product & Design", "Engineering",
  "Sales & Delivery", "Marketing & Support", "Operations",
];

async function seedPair(fx: any) {
  await fx.seedApproval({
    gate: "merge-deploy", priority: "P1", requestedBy: "developer",
    action: "Merge the dashboard PR #123 into main", summary: "Engineering item.",
  });
  return fx.seedApproval({
    gate: "people", priority: "P2", requestedBy: "hr", artifact: "https://example.com/offer",
    action: "Extend offer to candidate X at band 3", summary: "People-gate item.",
  });
}

test("dashboard renders every department tile; other-gate work is not counted", async ({ page, fx }) => {
  await seedPair(fx);
  await fx.signIn(page, APPROVER);
  await page.goto(`${fx.baseUrl}/dashboard`);

  const main = page.locator("main");
  for (const name of DEPARTMENTS) await expect(main).toContainText(name);
  await expect(main).not.toContainText("Extend offer"); // people item absent for non-people seat

  const pfTile = page.locator('a[href="/board/people-finance"]');
  await expect(pfTile).not.toContainText("1"); // restricted item not counted
});

test("engineering board shows an approved item In flight; URL filters narrow it", async ({ page, fx }) => {
  const apr = await fx.seedApproval({
    gate: "merge-deploy", priority: "P1", requestedBy: "developer",
    action: "Merge the board PR #123 into main", summary: "Engineering item.",
  });
  await fx.seedApproval({
    gate: "people", priority: "P2", requestedBy: "hr", artifact: "https://example.com/offer",
    action: "Extend offer to candidate X at band 3", summary: "People-gate item.",
  });
  await fx.signIn(page, APPROVER);
  // approve it so it lands under "In flight" (approved, not yet executed)
  await page.goto(`${fx.baseUrl}/item/${apr}`);
  await page.click('form:has(input[value="approved"]) button');
  await expect(page).toHaveURL(/done=approved/);

  await page.goto(`${fx.baseUrl}/board/engineering`);
  const board = page.locator("main");
  await expect(board).toContainText("In flight");
  await expect(board).toContainText("board PR #123");
  await expect(board).not.toContainText("Extend offer");

  await page.goto(`${fx.baseUrl}/board/engineering?emp=developer&state=approved`);
  await expect(page.locator("main")).toContainText("board PR #123");
  await page.goto(`${fx.baseUrl}/board/engineering?emp=nobody`);
  await expect(page.locator("main")).toContainText("Nothing here");
});

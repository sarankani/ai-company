import { test, expect } from "../fixtures/playwright";
import { readFileSync } from "fs";
import path from "path";

/**
 * Dual approval on the People gate (issue #21) — ported from smoke.mjs §10-11.
 * A People-gate record needs two distinct stamps; the CEO seat both holds a
 * people-finance seat and the ceo seat, so it can stamp twice at n=1.
 */

const CEO = "saranpkani@gmail.com"; // ceo + people-finance seats

test("first stamp holds the item pending; the second closes it", async ({ page, fx }) => {
  const people = await fx.seedApproval({
    gate: "people", priority: "P2", requestedBy: "hr", artifact: "https://example.com/offer",
    action: "Extend offer to candidate X at band 3", summary: "People-gate dual-approval record.",
  });
  const rec = () => readFileSync(path.join(fx.dir, `company/approvals/${people}.md`), "utf8");

  await fx.signIn(page, CEO);
  await page.goto(`${fx.baseUrl}/item/${people}`);
  const main = page.locator("main");
  await expect(main).toContainText("Extend offer to candidate X");
  await expect(main).toContainText("0 of 2 stamps");

  await page.click('form:has(input[value="approved"]) button');
  await expect(page).toHaveURL(/stamped=1/);
  await expect(page.locator("main")).toContainText("1 of 2 stamps");
  expect(rec()).toContain("state: pending"); // still pending after one stamp

  await page.click('form:has(input[value="approved"]) button');
  await expect(page).toHaveURL(/done=approved/);
  expect(rec()).toContain("state: approved"); // second stamp closes the gate
  expect(await fx.py(["validate"])).toContain("OK");
});

test("the CEO seat sees people-gate work on the dashboard and board", async ({ page, fx }) => {
  const people = await fx.seedApproval({
    gate: "people", priority: "P2", requestedBy: "hr", artifact: "https://example.com/offer",
    action: "Extend offer to candidate X at band 3", summary: "People-gate record.",
  });
  await fx.signIn(page, CEO);
  // approve it (dual) so it's "in flight"
  await page.goto(`${fx.baseUrl}/item/${people}`);
  await page.click('form:has(input[value="approved"]) button');
  await expect(page).toHaveURL(/stamped=1/);
  await page.click('form:has(input[value="approved"]) button');
  await expect(page).toHaveURL(/done=approved/);

  await page.goto(`${fx.baseUrl}/dashboard`);
  await expect(page.locator('a[href="/board/people-finance"]')).toContainText("1 in flight");
  await page.goto(`${fx.baseUrl}/board/people-finance`);
  await expect(page.locator("main")).toContainText("Extend offer to candidate X");
});

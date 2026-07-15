import { test, expect } from "../fixtures/playwright";

/**
 * Magic-link sign-in (issue #20) — ported from smoke.mjs §1.
 * Email must match the humans registry 1:1; unknown emails are not enumerated.
 */

const APPROVER = "saravanan@vitetech.in";

test("a valid seat email signs in and lands on the inbox", async ({ page, fx }) => {
  await fx.signIn(page, APPROVER);
  await expect(page).toHaveURL(/\/inbox/);
  // the magic link was issued for this email (dev log)
  expect(fx.magicLinkFor(APPROVER)).toBeTruthy();
});

test("an unknown email is not enumerated (neutral message, no link)", async ({ page, fx }) => {
  await page.goto(`${fx.baseUrl}/signin?return=/inbox`);
  await page.fill('input[name="email"]', "nobody@nowhere.example");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/sent=1/);
  await expect(page.locator(".notice")).toContainText("If that email holds a seat");
  expect(fx.magicLinkFor("nobody@nowhere.example")).toBeNull(); // no link ever issued
});

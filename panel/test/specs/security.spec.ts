import { test, expect } from "../fixtures/playwright";

/**
 * Security regressions (EX-206) — ported from smoke.mjs §8c/§8d.
 * These guard the fixes from the panel's security review: artifact-driven
 * reads can't cross the People gate or the repo root, and off-site sign-in
 * redirects are neutralized.
 */

const APPROVER = "saravanan@vitetech.in"; // engineering approver (not people)

test("H1: a People-gate record body is not rendered via an artifact bypass", async ({ page, fx }) => {
  const people = await fx.seedApproval({
    gate: "people", priority: "P2", requestedBy: "hr", artifact: "https://example.com/offer",
    action: "Extend offer to candidate X at band 3", summary: "People-gate record.",
  });
  // a widely-visible engineering record whose artifact points AT the people record
  const bypass = await fx.seedApproval({
    gate: "merge-deploy", priority: "P2", requestedBy: "developer",
    artifact: `company/approvals/${people}.md`,
    action: "Bypass probe: artifact points at a People-gate record", summary: "probe",
  });
  await fx.signIn(page, APPROVER);
  await page.goto(`${fx.baseUrl}/item/${bypass}`);
  await expect(page.locator("main")).not.toContainText("Extend offer to candidate X");
});

test("H1: a traversal artifact does not read host files inline", async ({ page, fx }) => {
  const trav = await fx.seedApproval({
    gate: "merge-deploy", priority: "P2", requestedBy: "developer",
    artifact: "../../../../etc/hosts",
    action: "Traversal probe", summary: "probe",
  });
  await fx.signIn(page, APPROVER);
  await page.goto(`${fx.baseUrl}/item/${trav}`);
  await expect(page.locator("main")).not.toContainText("localhost");
});

test("M5: an off-site return= is neutralized to /inbox on submit", async ({ page, fx }) => {
  // The defense is safeReturnTo() applied in the sign-in action (and again when
  // the magic-link token is verified) — so an off-site return never survives a
  // submit, regardless of what the raw form field carries.
  await page.goto(`${fx.baseUrl}/signin?return=https://evil.example`);
  await page.fill('input[name="email"]', APPROVER);
  await page.click('button[type="submit"]');
  await page.waitForURL(/sent=1/);
  await expect(page).toHaveURL(/return=%2Finbox/); // evil.example sanitized to /inbox
});

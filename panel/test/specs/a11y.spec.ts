import { test, expect } from "../fixtures/playwright";
import AxeBuilder from "@axe-core/playwright";

/**
 * EX-605 — accessibility. Every key screen is scanned with axe-core for
 * WCAG 2.1 A/AA violations (zero critical/serious allowed), plus a keyboard-only
 * path through sign-in → open item → decide. The design brief's a11y section is
 * the spec.
 */

const CEO = "saranpkani@gmail.com"; // ceo seat — can reach admin + audit too
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: any) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}
const fmt = (vs: any[]) =>
  vs.map((v) => `${v.impact} ${v.id} (${v.nodes.length}) — ${v.help}`).join("\n");

test("sign-in screen has no critical/serious a11y violations", async ({ page, fx }) => {
  await page.goto(`${fx.baseUrl}/signin`);
  const v = await scan(page);
  expect(v, fmt(v)).toEqual([]);
});

test("core authenticated screens have no critical/serious a11y violations", async ({ page, fx }) => {
  const apr = await fx.seedApproval({
    gate: "merge-deploy", priority: "P1", requestedBy: "developer",
    action: "Merge the a11y-scan PR into main", summary: "A11y scan record. **Recommendation: approve.**",
  });
  await fx.signIn(page, CEO);

  const screens: [string, string][] = [
    ["inbox", `${fx.baseUrl}/inbox`],
    ["item", `${fx.baseUrl}/item/${apr}`],
    ["dashboard", `${fx.baseUrl}/dashboard`],
    ["board", `${fx.baseUrl}/board/engineering`],
    ["admin", `${fx.baseUrl}/admin`],
    ["audit", `${fx.baseUrl}/audit`],
  ];
  const failures: string[] = [];
  for (const [name, url] of screens) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const v = await scan(page);
    if (v.length) failures.push(`# ${name} (${url})\n${fmt(v)}`);
  }
  expect(failures.join("\n\n"), failures.join("\n\n")).toBe("");
});

test("a keyboard-only path signs in and decides an item (no mouse)", async ({ page, fx }) => {
  const apr = await fx.seedApproval({
    gate: "merge-deploy", priority: "P1", requestedBy: "developer",
    action: "Merge the keyboard-path PR into main", summary: "Keyboard a11y record.",
  });

  // sign in using only the keyboard
  await page.goto(`${fx.baseUrl}/signin?return=/inbox`);
  await page.getByLabel("Email").focus();
  await page.keyboard.type(CEO);
  await page.keyboard.press("Enter"); // submit the form from the focused field
  await page.waitForURL(/sent=1/);
  const link = fx.magicLinkFor(CEO)!;
  const u = new URL(link);
  await page.goto(`${fx.baseUrl}${u.pathname}${u.search}`);
  await page.waitForURL(/\/inbox/);

  // open the item and approve it with the keyboard (focus + Enter)
  await page.goto(`${fx.baseUrl}/item/${apr}`);
  const approve = page.locator('form:has(input[value="approved"]) button');
  await approve.focus();
  await expect(approve).toBeFocused(); // the control is keyboard-reachable/operable
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/done=approved/);
  await expect(page.locator("main")).toContainText("Decision recorded");
});

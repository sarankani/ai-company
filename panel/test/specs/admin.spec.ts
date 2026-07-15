import { test, expect } from "../fixtures/playwright";
import { readFileSync } from "fs";
import path from "path";

/**
 * People & Routing admin (EX-205) — ported from smoke.mjs §13.
 * Seat changes are a gated two-step: Head/CEO proposes (a People-gate record),
 * it's dual-approved on the decide surface, then applied in one exactly-once
 * commit that moves the role.
 */

const CEO = "saranpkani@gmail.com"; // ceo + head seats
const read = (fx: any, rel: string) => readFileSync(path.join(fx.dir, rel), "utf8");

test("admin is restricted to Head & CEO seats", async ({ page, fx }) => {
  await fx.seedHuman({
    id: "spec-approver", name: "Spec Approver", email: "spec-approver@evalyn.local",
    title: "Test Approver", roles: [{ department: "marketing-support", seat: "approver" }],
  });
  await fx.signIn(page, "spec-approver@evalyn.local");
  await page.goto(`${fx.baseUrl}/admin`);
  await expect(page.locator("main")).toContainText("Head & CEO only");
});

test("seat change: propose → dual-approve → apply moves the role in one commit", async ({ page, fx }) => {
  await fx.signIn(page, CEO);
  await page.goto(`${fx.baseUrl}/admin`);
  await expect(page.locator("main")).toContainText("saravanan-p");

  // propose: engineering approver → saran
  await page.selectOption('select[name="department"]', "engineering");
  await page.selectOption('select[name="seat"]', "approver");
  await page.selectOption('select[name="to"]', "saran");
  await page.fill('input[name="why"]', "spec: exercise the two-step seat-change path");
  await page.click(".propose button");
  await page.waitForURL(/proposed=APR/);
  const proposalId = new URL(page.url()).searchParams.get("proposed")!;
  expect(read(fx, `company/approvals/${proposalId}.md`)).toContain("gate: people");

  // dual-approve on the normal decide surface (ceo + people seats both = saran)
  await page.goto(`${fx.baseUrl}/item/${proposalId}`);
  await page.click('form:has(input[value="approved"]) button');
  await page.waitForURL(/stamped=1/);
  await page.click('form:has(input[value="approved"]) button');
  await page.waitForURL(/done=approved/);

  // apply from /admin — one exactly-once commit moves the role
  await page.goto(`${fx.baseUrl}/admin`);
  await page.click("button.apply");
  await page.waitForURL(/applied=/);

  expect(read(fx, "company/org/humans/saran.md")).toContain("{department: engineering, seat: approver}");
  expect(read(fx, "company/org/humans/saravanan-p.md")).not.toContain("{department: engineering, seat: approver}");

  const stat = await fx.git(["show", "--stat", "--format=", "HEAD"]);
  expect(stat).toContain(`${proposalId}.md`);
  expect(stat).toContain("saran.md");
  expect(stat).toContain("saravanan-p.md");
  expect(stat).toContain("registry.md");
  expect(read(fx, `company/approvals/${proposalId}.md`)).toContain("executed_at");
  expect(await fx.py(["validate"])).toContain("OK");

  // the apply's execution event is visible in the decision ledger
  await page.goto(`${fx.baseUrl}/audit`);
  await expect(page.locator("main")).toContainText("executed");
});

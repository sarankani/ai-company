import { test, expect } from "../fixtures/playwright";
import { readFileSync } from "fs";
import path from "path";

/**
 * Availability toggle + EX-301 immediate reassignment — ported from smoke.mjs §12.
 * When an approver goes busy, their pending items reassign to the deputy in the
 * SAME commit, and new routing skips them.
 */

const APPROVER = "saravanan@vitetech.in"; // engineering approver; deputy is saran
const read = (fx: any, rel: string) => readFileSync(path.join(fx.dir, rel), "utf8");
const lastSubject = (fx: any) => fx.git(["log", "-1", "--format=%s"]);

test("going busy commits the status and reassigns parked items to the deputy", async ({ page, fx }) => {
  // a pending engineering item routes to the approver (saravanan-p)
  const parked = await fx.seedApproval({
    gate: "merge-deploy", priority: "P2", requestedBy: "developer",
    action: "Item parked on the approver before they go OOO", summary: "probe",
  });
  expect(read(fx, `company/approvals/${parked}.md`)).toContain("assignee: saravanan-p");

  await fx.signIn(page, APPROVER);
  await page.goto(`${fx.baseUrl}/inbox`);
  await page.click(".avail-menu summary");
  await page.click('.avail-form button[value="busy"]');
  await expect.poll(() => lastSubject(fx), { timeout: 15_000 })
    .toContain("saravanan-p availability → busy");

  // topbar chip + humans file reflect the new status
  await page.goto(`${fx.baseUrl}/inbox`);
  await expect(page.locator(".avail-menu summary")).toContainText("busy");
  expect(read(fx, "company/org/humans/saravanan-p.md")).toMatch(/availability: busy/);

  // EX-301: the parked item moved off the OOO approver, in the availability commit
  const rec = read(fx, `company/approvals/${parked}.md`);
  expect(rec).toMatch(/^assignee: saran$/m);
  expect(rec).not.toMatch(/^assignee: saravanan-p$/m);
  expect(rec).toContain("unavailable-skip");
  expect(await fx.git(["show", "--stat", "--format=", "HEAD"])).toContain(`${parked}.md`);
  expect(await lastSubject(fx)).toMatch(/reassigned \d+ pending item/);

  // new routing skips the busy approver and assigns the deputy
  const routed = await fx.seedApproval({
    gate: "merge-deploy", priority: "P2", requestedBy: "developer",
    action: "Routing probe while approver busy", summary: "probe",
  });
  expect(read(fx, `company/approvals/${routed}.md`)).toMatch(/^assignee: saran$/m);

  // restore availability
  await page.goto(`${fx.baseUrl}/inbox`);
  await page.click(".avail-menu summary");
  await page.click('.avail-form button[value="available"]');
  await expect.poll(() => lastSubject(fx), { timeout: 15_000 })
    .toContain("saravanan-p availability → available");
});

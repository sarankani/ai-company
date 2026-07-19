import { test, expect } from "../fixtures/playwright";

/**
 * CRM e2e (EX-708): browse + RBAC visibility, create → stage-move → timeline,
 * the full gate loop (invoice draft→sent → money APR in the inbox → approve →
 * stage applies), and API security. The CRM DB is a per-worker PGlite dir in
 * the temp clone (auto-migrated on first connect); records created here are
 * uniquely named per test so leftover rows between resets can't collide.
 */

const CEO = "saranpkani@gmail.com"; // saran — ceo seat: editor everywhere
const ENG = "saravanan@vitetech.in"; // saravanan-p — engineering/product-design/operations seats

test("CEO sees all 16 record-type tiles on /crm", async ({ page, fx }) => {
  await fx.signIn(page, CEO);
  await page.goto(`${fx.baseUrl}/crm`);
  const main = page.locator("main");
  for (const label of ["Leads", "Opportunities", "Invoices", "Assets", "Customer POs"]) {
    await expect(main).toContainText(label);
  }
  await expect(page.locator(".tile")).toHaveCount(16);
});

test("RBAC: no grant hides the type (404), a held department renders", async ({ page, fx }) => {
  await fx.signIn(page, ENG);
  // saravanan-p holds operations seats → vendors visible…
  await page.goto(`${fx.baseUrl}/crm/vendors`);
  await expect(page.locator("main")).toContainText("Vendors");
  // …but no sales-delivery grant → leads are hidden entirely
  const res = await page.goto(`${fx.baseUrl}/crm/leads`);
  expect(res!.status()).toBe(404);
});

test("create a lead, advance it, and read the activity timeline", async ({ page, fx }) => {
  await fx.signIn(page, CEO);
  await page.goto(`${fx.baseUrl}/crm/leads`);

  await page.click("details.decide summary"); // "New lead"
  await page.fill('input[name="title"]', "Playwright Lead Alpha");
  await page.fill('textarea[name="summary"]', "Created by the e2e suite.");
  await page.click('form:has(input[name="title"]) button');

  await expect(page).toHaveURL(/\/crm\/leads\/LEAD-/);
  const main = page.locator("main");
  await expect(main).toContainText("Playwright Lead Alpha");
  await expect(main).toContainText("Stage: new");

  await page.click('form:has(input[value="contacted"]) button');
  await expect(page).toHaveURL(/moved=contacted/);
  await expect(main).toContainText("Stage: contacted");
  await expect(main).toContainText("moved new → contacted"); // timeline entry
});

test("gate loop: invoice draft→sent files a money APR, approval applies the stage", async ({ page, fx }) => {
  await fx.signIn(page, CEO);

  // create the invoice
  await page.goto(`${fx.baseUrl}/crm/invoices`);
  await page.click("details.decide summary");
  await page.fill('input[name="title"]', "Playwright Invoice Gate");
  await page.click('form:has(input[name="title"]) button');
  await expect(page).toHaveURL(/\/crm\/invoices\/INV-/);
  const recordUrl = page.url();

  // draft → sent is money-gated: files an APR instead of applying
  await page.click('form:has(input[value="sent"]) button');
  await expect(page).toHaveURL(/gate=APR-/);
  const aprId = new URL(page.url()).searchParams.get("gate")!;
  const main = page.locator("main");
  await expect(main).toContainText("Stage: draft"); // unchanged
  await expect(main).toContainText(`awaiting ${aprId}`);

  // the APR is a normal inbox item for the money gate (people-finance → saran)
  await page.goto(`${fx.baseUrl}/inbox`);
  await expect(page.locator("main")).toContainText("Playwright Invoice Gate");
  await page.goto(`${fx.baseUrl}/item/${aprId}`);
  await expect(page.locator("main")).toContainText("Move INV-");
  await page.click('form:has(input[value="approved"]) button');
  await expect(page).toHaveURL(/done=approved/);

  // back on the record: the detail page reconciles and applies the stage
  await page.goto(recordUrl);
  await expect(page.locator("main")).toContainText("Stage: sent");
  await expect(page.locator("main")).toContainText(`via ${aprId}`); // timeline cross-reference
});

test("rejected gate clears the pending approval and keeps the stage", async ({ page, fx }) => {
  await fx.signIn(page, CEO);
  await page.goto(`${fx.baseUrl}/crm/invoices`);
  await page.click("details.decide summary");
  await page.fill('input[name="title"]', "Playwright Invoice Reject");
  await page.click('form:has(input[name="title"]) button');
  await expect(page).toHaveURL(/\/crm\/invoices\/INV-/);
  const recordUrl = page.url();

  await page.click('form:has(input[value="sent"]) button');
  await expect(page).toHaveURL(/gate=APR-/);
  const aprId = new URL(page.url()).searchParams.get("gate")!;

  await page.goto(`${fx.baseUrl}/item/${aprId}`);
  await page.click('details.alt:has(input[value="rejected"]) summary'); // open "Reject…"
  await page.fill('form:has(input[value="rejected"]) textarea[name="reason"]', "Not yet — wrong amount.");
  await page.click('form:has(input[value="rejected"]) button');
  await expect(page).toHaveURL(/done=rejected/);

  await page.goto(recordUrl);
  const main = page.locator("main");
  await expect(main).toContainText("Stage: draft"); // stage never moved
  await expect(main).not.toContainText(`awaiting ${aprId}`); // unparked
});

test("API security: no credentials and bad bearer tokens are rejected", async ({ fx }) => {
  const noAuth = await fetch(`${fx.baseUrl}/api/crm/records?type=leads`);
  expect(noAuth.status).toBe(401);
  const badToken = await fetch(`${fx.baseUrl}/api/crm/records?type=leads`, {
    headers: { Authorization: "Bearer wrong-token", "X-Agent-Id": "sdr" },
  });
  expect(badToken.status).toBe(401);
});

test("agent bearer token works end to end through the API", async ({ fx }) => {
  const headers = {
    Authorization: "Bearer e2e-agent-token",
    "X-Agent-Id": "sdr",
    "Content-Type": "application/json",
  };
  const create = await fetch(`${fx.baseUrl}/api/crm/records`, {
    method: "POST", headers,
    body: JSON.stringify({ type: "leads", title: "API Lead Bravo", fields: { source: "api" } }),
  });
  expect(create.status).toBe(201);
  const { record } = await create.json();
  expect(record.id).toMatch(/^LEAD-/);
  expect(record.owner).toBe("sdr");

  const move = await fetch(`${fx.baseUrl}/api/crm/records/${record.id}/transition`, {
    method: "POST", headers, body: JSON.stringify({ to: "contacted" }),
  });
  expect(move.status).toBe(200);
  const moved = await move.json();
  expect(moved.record.stage).toBe("contacted");
});

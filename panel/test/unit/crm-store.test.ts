/**
 * Store semantics against a real (in-process) Postgres — PGlite in-memory.
 * Covers: create/id allocation, RBAC enforcement on every path, field
 * cleaning, transitions (valid/invalid/gated), gate park/apply/clear
 * internals, links, comments, search, overview, notifications.
 */
import { describe, it, expect, beforeAll } from "vitest";
import type { Human } from "../../lib/org";
import { resetCrmDb } from "../../lib/crm/db";
import {
  createCrmRecord, getCrmRecord, listCrmRecords, updateCrmRecord,
  transitionCrmRecord, applyStageInternal, setPendingGateInternal,
  clearPendingGateInternal, addCrmLink, addCrmComment, searchCrm, crmOverview,
  listCrmNotifications, unreadCrmCount, markCrmNotificationsRead,
  type CrmActor,
} from "../../lib/crm/store";
import { CrmError } from "../../lib/crm/lifecycles";

const agent = (id: string): CrmActor => ({ kind: "agent", id });
const humanActor = (roles: { department: string; seat: string }[]): CrmActor => ({
  kind: "human",
  human: { id: "h-test", name: "H", email: "h@x.y", title: "", availability: "available", roles } as Human,
});

const viewer = humanActor([{ department: "sales-delivery", seat: "crm-viewer" }]);
const editor = humanActor([{ department: "sales-delivery", seat: "crm-editor" }]);
const ceo = humanActor([{ department: "leadership", seat: "ceo" }]);

beforeAll(() => {
  process.env.DATABASE_URL = "pglite://memory";
  resetCrmDb(); // fresh in-memory DB; connect() auto-migrates PGlite
});

describe("create + ids", () => {
  it("creates with defaults, sequential human-readable ids, activity row", async () => {
    const a = await createCrmRecord("leads", { title: "First lead" }, agent("sdr"));
    const b = await createCrmRecord("leads", { title: "Second lead" }, agent("sdr"));
    expect(a.id).toMatch(/^LEAD-\d{8}-001$/);
    expect(b.id).toMatch(/^LEAD-\d{8}-002$/);
    expect(a.stage).toBe("new");
    expect(a.owner).toBe("sdr"); // lifecycle default
    const detail = await getCrmRecord(a.id, agent("sdr"));
    expect(detail!.activities.map((x) => x.kind)).toEqual(["created"]);
  });

  it("rejects empty titles, unknown account links, accounts on account-less types", async () => {
    await expect(createCrmRecord("leads", { title: "  " }, agent("sdr"))).rejects.toThrow(CrmError);
    await expect(createCrmRecord("leads", { title: "x", accountId: "ACC-19990101-001" }, agent("sdr")))
      .rejects.toThrow(/not found/);
    await expect(createCrmRecord("vendors", { title: "v", accountId: "ACC-19990101-001" }, agent("procurement")))
      .rejects.toThrow(/don't link/);
  });

  it("cleans fields: undeclared keys dropped, numbers coerced, bad numbers rejected", async () => {
    const r = await createCrmRecord("opportunities", {
      title: "Opp", fields: { value: "1200", bogus: "x", currency: "USD" },
    }, agent("sales"));
    expect(r.fields).toEqual({ value: 1200, currency: "USD" });
    await expect(createCrmRecord("opportunities", { title: "Bad", fields: { value: "NaN-ish" } }, agent("sales")))
      .rejects.toThrow(/must be a number/);
  });
});

describe("RBAC enforcement in the store", () => {
  it("viewer can read but not write; no grant hides even reads", async () => {
    const lead = (await listCrmRecords("leads", {}, viewer))[0];
    expect(lead).toBeTruthy();
    await expect(createCrmRecord("leads", { title: "nope" }, viewer)).rejects.toThrow(/no editor access/);
    await expect(updateCrmRecord(lead.id, { title: "nope" }, viewer)).rejects.toThrow(/no editor access/);
    await expect(addCrmComment(lead.id, "hi", viewer)).rejects.toThrow(/no editor access/);
    // people-finance types are hidden from a sales-delivery-only viewer
    await expect(listCrmRecords("invoices", {}, viewer)).rejects.toThrow(/no access/);
    const inv = await createCrmRecord("invoices", { title: "INV X" }, agent("finance"));
    await expect(getCrmRecord(inv.id, viewer)).rejects.toThrow(/no access/);
    expect(await getCrmRecord(inv.id, ceo)).toBeTruthy();
  });

  it("editor grant allows the full write surface on its department", async () => {
    const r = await createCrmRecord("leads", { title: "Editor-made" }, editor);
    const updated = await updateCrmRecord(r.id, { summary: "s", fields: { source: "event" } }, editor);
    expect(updated.summary).toBe("s");
    await addCrmComment(r.id, "note", editor);
    const t = await transitionCrmRecord(r.id, "contacted", editor);
    expect(t.applied).toBe(true);
  });
});

describe("transitions + gates", () => {
  it("rejects invalid transitions without mutating", async () => {
    const r = await createCrmRecord("leads", { title: "T1" }, agent("sdr"));
    await expect(transitionCrmRecord(r.id, "qualified", agent("sdr"))).rejects.toThrow(/invalid transition/);
    expect((await getCrmRecord(r.id, agent("sdr")))!.record.stage).toBe("new");
  });

  it("gated transition reports the gate and does NOT move the stage", async () => {
    const inv = await createCrmRecord("invoices", { title: "INV gate" }, agent("finance"));
    const res = await transitionCrmRecord(inv.id, "sent", agent("finance"));
    expect(res.applied).toBe(false);
    expect(res.gate).toBe("money");
    expect((await getCrmRecord(inv.id, agent("finance")))!.record.stage).toBe("draft");
  });

  it("gate park/apply lifecycle: set → blocked → apply clears and logs the APR id", async () => {
    const inv = await createCrmRecord("invoices", { title: "INV park" }, agent("finance"));
    const parked = await setPendingGateInternal(inv.id, "APR-20260716-901", "sent", "money", agent("finance"), "saran");
    expect(parked.aprId).toBe("APR-20260716-901");
    // double-park refused; transition refused while parked
    await expect(setPendingGateInternal(inv.id, "APR-20260716-902", "sent", "money", agent("finance")))
      .rejects.toThrow(/already has a pending approval/);
    await expect(transitionCrmRecord(inv.id, "sent", agent("finance"))).rejects.toThrow(/pending approval/);
    const applied = await applyStageInternal(inv.id, "draft", "sent", agent("finance"), "APR-20260716-901");
    expect(applied.stage).toBe("sent");
    expect(applied.aprId).toBeNull();
    const detail = await getCrmRecord(inv.id, agent("finance"));
    const stageAct = detail!.activities.find((a) => a.kind === "stage");
    expect((stageAct!.detail as { apr_id?: string }).apr_id).toBe("APR-20260716-901");
    // the assignee got notified when the gate was requested
    expect((await listCrmNotifications("saran")).some((n) => n.message.includes("APR-20260716-901"))).toBe(true);
  });

  it("gate clear (rejection) unparks without moving the stage", async () => {
    const inv = await createCrmRecord("invoices", { title: "INV clear" }, agent("finance"));
    await setPendingGateInternal(inv.id, "APR-20260716-903", "sent", "money", agent("finance"));
    const row = await clearPendingGateInternal(inv.id, "APR-20260716-903", "rejected", agent("finance"));
    expect(row.stage).toBe("draft");
    expect(row.aprId).toBeNull();
  });

  it("stale stage move is refused (concurrent transition guard)", async () => {
    const r = await createCrmRecord("leads", { title: "Race" }, agent("sdr"));
    await applyStageInternal(r.id, "new", "contacted", agent("sdr"), null);
    await expect(applyStageInternal(r.id, "new", "disqualified", agent("sdr"), null))
      .rejects.toThrow(/changed stage concurrently/);
  });
});

describe("links, comments, search, overview", () => {
  it("links validate both ends and reject self-links and bad rels", async () => {
    const acc = await createCrmRecord("accounts", { title: "LinkCo" }, agent("account-manager"));
    const opp = await createCrmRecord("opportunities", { title: "LinkCo deal", accountId: acc.id }, agent("sales"));
    await addCrmLink(opp.id, "deal-for", acc.id, agent("sales"));
    await expect(addCrmLink(opp.id, "deal-for", opp.id, agent("sales"))).rejects.toThrow(/itself/);
    await expect(addCrmLink(opp.id, "Bad Rel!", acc.id, agent("sales"))).rejects.toThrow(/kebab-case/);
    await expect(addCrmLink(opp.id, "x", "LEAD-19990101-001", agent("sales"))).rejects.toThrow(/not found/);
    const detail = await getCrmRecord(opp.id, agent("sales"));
    expect(detail!.related.some((l) => l.id === acc.id && l.rel === "deal-for")).toBe(true);
    // account 360: the opp shows up under its account
    const acc360 = await getCrmRecord(acc.id, agent("sales"));
    expect(acc360!.children.some((c) => c.id === opp.id)).toBe(true);
  });

  it("full-text search respects the RBAC matrix", async () => {
    await createCrmRecord("leads", { title: "Zephyr Industries lead" }, agent("sdr"));
    await createCrmRecord("invoices", { title: "Zephyr invoice" }, agent("finance"));
    const all = await searchCrm("zephyr", ceo);
    expect(all.length).toBe(2);
    const scoped = await searchCrm("zephyr", viewer); // sales-delivery only
    expect(scoped.length).toBe(1);
    expect(scoped[0].type).toBe("leads");
  });

  it("overview counts only visible types", async () => {
    const forViewer = await crmOverview(viewer);
    expect(forViewer.every((r) => r.type !== "invoices")).toBe(true);
    const forCeo = await crmOverview(ceo);
    expect(forCeo.some((r) => r.type === "invoices")).toBe(true);
  });
});

describe("update + filters + misc branches", () => {
  it("update validates: empty title refused, empty patch is a no-op, fields merge", async () => {
    const r = await createCrmRecord("leads", { title: "Patch me", fields: { source: "web" } }, agent("sdr"));
    await expect(updateCrmRecord(r.id, { title: "   " }, agent("sdr"))).rejects.toThrow(/title cannot be empty/);
    const same = await updateCrmRecord(r.id, {}, agent("sdr"));
    expect(same.title).toBe("Patch me");
    const merged = await updateCrmRecord(r.id, { fields: { angle: "intro" } }, agent("sdr"));
    expect(merged.fields).toEqual({ source: "web", angle: "intro" });
    await expect(updateCrmRecord("LEAD-19990101-001", { title: "x" }, agent("sdr"))).rejects.toThrow(/not found/);
  });

  it("update account link: set to a real account, clear with null, refuse on account-less types", async () => {
    const acc = await createCrmRecord("accounts", { title: "PatchCo" }, agent("account-manager"));
    const r = await createCrmRecord("leads", { title: "Linkable" }, agent("sdr"));
    expect((await updateCrmRecord(r.id, { accountId: acc.id }, agent("sdr"))).accountId).toBe(acc.id);
    expect((await updateCrmRecord(r.id, { accountId: null }, agent("sdr"))).accountId).toBeNull();
    const v = await createCrmRecord("vendors", { title: "NoAcc" }, agent("procurement"));
    await expect(updateCrmRecord(v.id, { accountId: acc.id }, agent("procurement"))).rejects.toThrow(/don't link/);
  });

  it("list filters by stage/owner/account/q", async () => {
    const acc = await createCrmRecord("accounts", { title: "FilterCo" }, agent("account-manager"));
    await createCrmRecord("leads", { title: "Filter lead one", accountId: acc.id, owner: "sdr" }, agent("sdr"));
    const byAccount = await listCrmRecords("leads", { account: acc.id }, ceo);
    expect(byAccount).toHaveLength(1);
    expect(await listCrmRecords("leads", { account: acc.id, stage: "qualified" }, ceo)).toHaveLength(0);
    expect((await listCrmRecords("leads", { q: "filter lead" }, ceo)).length).toBeGreaterThan(0);
    expect((await listCrmRecords("leads", { owner: "nobody-x" }, ceo))).toHaveLength(0);
  });

  it("REGRESSION: a q filter never escapes the type filter (OR precedence / RBAC leak)", async () => {
    // an invoice whose TITLE matches the query must not surface in a leads
    // list — before the parenthesization fix, `type = 'leads' AND id ILIKE q
    // OR title ILIKE q` returned it (and leaked hidden types to viewers)
    await createCrmRecord("invoices", { title: "Precedence probe invoice" }, agent("finance"));
    const leads = await listCrmRecords("leads", { q: "precedence probe" }, viewer);
    expect(leads).toHaveLength(0);
    const invoices = await listCrmRecords("invoices", { q: "precedence probe" }, ceo);
    expect(invoices).toHaveLength(1);
    // combined filters stay conjunctive alongside q
    expect(await listCrmRecords("invoices", { q: "precedence probe", stage: "paid" }, ceo)).toHaveLength(0);
  });

  it("misc guards: empty search/comment, missing records, transitions on unknown ids", async () => {
    expect(await searchCrm("   ", ceo)).toEqual([]);
    expect(await getCrmRecord("LEAD-19990101-009", ceo)).toBeNull();
    await expect(addCrmComment("LEAD-19990101-009", "x", ceo)).rejects.toThrow(/not found/);
    const r = await createCrmRecord("leads", { title: "NoEmpty" }, agent("sdr"));
    await expect(addCrmComment(r.id, "   ", agent("sdr"))).rejects.toThrow(/empty/);
    await expect(transitionCrmRecord("LEAD-19990101-009", "contacted", ceo)).rejects.toThrow(/not found/);
    await expect(clearPendingGateInternal(r.id, "APR-20260716-999", "rejected", ceo)).rejects.toThrow(/not pending/);
  });
});

describe("notifications", () => {
  it("assignment notifies the owner (not the actor), mark-read works", async () => {
    await createCrmRecord("tickets", { title: "Notify me", owner: "support" }, agent("chief-of-staff"));
    const unreadBefore = await unreadCrmCount("support");
    expect(unreadBefore).toBeGreaterThan(0);
    const list = await listCrmNotifications("support", { unreadOnly: true });
    expect(list.some((n) => n.message.includes("assigned to you"))).toBe(true);
    await markCrmNotificationsRead("support");
    expect(await unreadCrmCount("support")).toBe(0);
  });

  it("self-caused events don't notify the actor", async () => {
    await createCrmRecord("tickets", { title: "Self", owner: "support" }, agent("support"));
    const mine = await listCrmNotifications("support", { unreadOnly: true });
    expect(mine.some((n) => n.message.includes("Self"))).toBe(false);
  });
});

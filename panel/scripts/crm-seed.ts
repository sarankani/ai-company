/**
 * Seed a demo lead→cash chain for local dev and e2e fixtures:
 * account + contact + lead + opportunity + estimate + invoice, linked.
 * Idempotent-ish: skips if any account already exists. `npm run db:seed`.
 */
import { crmDb } from "../lib/crm/db";
import { migrateCrmDb } from "../lib/crm/migrate";
import {
  createCrmRecord, addCrmLink, addCrmComment, listCrmRecords, transitionCrmRecord,
  type CrmActor,
} from "../lib/crm/store";

const seeder: CrmActor = { kind: "agent", id: "seed" };

async function main() {
  const db = await crmDb();
  await migrateCrmDb(db);

  const existing = await listCrmRecords("accounts", {}, seeder, 1);
  if (existing.length) {
    console.log("[crm-seed] accounts already exist — skipping");
    process.exit(0);
  }

  const acc = await createCrmRecord("accounts", {
  title: "Acme Industries",
  summary: "Mid-market manufacturer exploring an inventory automation build.",
  fields: { industry: "Manufacturing", website: "https://acme.example", region: "IN" },
}, seeder);

  const con = await createCrmRecord("contacts", {
    title: "Jane Doe", accountId: acc.id,
    fields: { email: "jane@acme.example", role: "Head of Operations" },
  }, seeder);

  const lead = await createCrmRecord("leads", {
    title: "Acme — inventory automation inquiry", accountId: acc.id,
    summary: "Inbound via website form; asked for a scoping call.",
    fields: { source: "website", contact_email: "jane@acme.example" },
  }, { kind: "agent", id: "sdr" });

  const opp = await createCrmRecord("opportunities", {
    title: "Acme inventory automation build", accountId: acc.id,
    summary: "Custom inventory automation; 8–10 week build.",
    fields: { value: 24000, currency: "USD" },
  }, { kind: "agent", id: "sales" });

  const est = await createCrmRecord("estimates", {
    title: "Estimate — Acme inventory automation", accountId: acc.id,
    fields: { effort_days: 45, cost: 18000, assumptions: "Single warehouse; existing ERP API available." },
  }, { kind: "agent", id: "solutions-architect" });

  const inv = await createCrmRecord("invoices", {
    title: "INV — Acme milestone 1", accountId: acc.id,
    summary: "Milestone 1: discovery + architecture, per SOW.",
    fields: { amount: 6000, currency: "USD", po_ref: "ACME-PO-117" },
  }, { kind: "agent", id: "finance" });

  await addCrmLink(opp.id, "estimate-of", est.id, seeder);
  await addCrmLink(opp.id, "sourced-from", lead.id, seeder);
  await addCrmLink(inv.id, "invoice-for", opp.id, seeder);
  await addCrmLink(con.id, "contact-for", opp.id, seeder);
  await transitionCrmRecord(lead.id, "contacted", { kind: "agent", id: "sdr" });
  await addCrmComment(opp.id, "Discovery call booked for next Tuesday.", { kind: "agent", id: "sales" });

  console.log(`[crm-seed] created ${[acc.id, con.id, lead.id, opp.id, est.id, inv.id].join(", ")}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

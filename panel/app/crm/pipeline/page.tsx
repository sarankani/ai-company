import Link from "next/link";
import { LIFECYCLES } from "@/lib/crm/lifecycles";
import { crmAccess } from "@/lib/crm/rbac";
import { listCrmRecords } from "@/lib/crm/store";
import { requireCrmHuman, humanActor } from "@/lib/crm/session";

// Opportunity pipeline (EX-707): server-rendered Kanban, one column per
// stage. Moves happen on the record detail page (no drag-and-drop in v1).

export default async function Pipeline() {
  const me = await requireCrmHuman("/crm/pipeline");
  const lc = LIFECYCLES.opportunities;
  const access = crmAccess(me, "opportunities");

  if (access === "none") {
    return (
      <main>
        <h1>Pipeline</h1>
        <div className="empty">Opportunities are outside your CRM grants ({lc.department}).</div>
      </main>
    );
  }

  const opps = await listCrmRecords("opportunities", {}, humanActor(me), 500);
  const byStage = new Map(lc.stages.map((s) => [s, opps.filter((o) => o.stage === s)]));
  const value = (r: (typeof opps)[number]) => {
    const v = (r.fields as Record<string, unknown>).value;
    return typeof v === "number" ? v : null;
  };

  return (
    <main className="wide">
      <div className="crumbs">
        <span><Link href="/crm">CRM</Link> / Pipeline</span>
        <span className="muted"><Link href="/crm/opportunities">list view</Link></span>
      </div>
      <h1>Opportunity pipeline</h1>
      <p className="asof">{opps.length} opportunit{opps.length === 1 ? "y" : "ies"} · move stages from a card's detail page</p>

      <div className="kanban">
        {lc.stages.map((stage) => {
          const cards = byStage.get(stage) ?? [];
          const total = cards.reduce((s, c) => s + (value(c) ?? 0), 0);
          return (
            <section key={stage} className="kanban-col" aria-label={`Stage ${stage}`}>
              <div className="kanban-head">
                <span>{stage}</span>
                <span className="muted">{cards.length}{total ? ` · ${total.toLocaleString()}` : ""}</span>
              </div>
              {cards.map((c) => (
                <Link key={c.id} href={`/crm/opportunities/${c.id}`} className="kanban-card">
                  <div className="kanban-title">{c.title}</div>
                  <div className="kanban-meta">
                    <span className="mono">{c.id}</span>
                    {value(c) != null && <span>{value(c)!.toLocaleString()}</span>}
                  </div>
                  <div className="kanban-meta muted">
                    {c.owner}{c.accountId ? ` · ${c.accountId}` : ""}
                    {c.aprId ? " · 🔒 awaiting approval" : ""}
                  </div>
                </Link>
              ))}
              {!cards.length && <div className="kanban-empty">—</div>}
            </section>
          );
        })}
      </div>
    </main>
  );
}

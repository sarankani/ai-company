import Link from "next/link";
import { CRM_TYPES, LIFECYCLES } from "@/lib/crm/lifecycles";
import { crmAccess, visibleTypes } from "@/lib/crm/rbac";
import { crmOverview, recentCrmActivities, searchCrm } from "@/lib/crm/store";
import { requireCrmHuman, humanActor } from "@/lib/crm/session";

// CRM overview (EX-703/707): stage counts per visible type, global search,
// recent activity. RBAC: types outside the viewer's matrix don't render.

export default async function CrmOverview({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireCrmHuman("/crm");
  const actor = humanActor(me);
  const types = visibleTypes(me);
  const { q } = await searchParams;

  if (!types.length) {
    return (
      <main>
        <h1>CRM</h1>
        <div className="empty">
          You have no CRM access grants yet. Ask a department Head to add a
          crm-viewer or crm-editor grant for your account (via Admin).
        </div>
      </main>
    );
  }

  const [overview, recent, results] = await Promise.all([
    crmOverview(actor),
    recentCrmActivities(actor, 15),
    q?.trim() ? searchCrm(q, actor) : Promise.resolve([]),
  ]);
  const byType = new Map<string, { total: number; stages: [string, number][] }>();
  for (const t of types) byType.set(t, { total: 0, stages: [] });
  for (const row of overview) {
    const e = byType.get(row.type);
    if (!e) continue;
    e.total += row.count;
    e.stages.push([row.stage, row.count]);
  }

  return (
    <main className="wide">
      <div className="head-row">
        <h1>CRM</h1>
        <form action="/crm" className="crm-search" role="search">
          <input type="search" name="q" defaultValue={q ?? ""} placeholder="Search records…" aria-label="Search CRM records" />
          <button>Search</button>
        </form>
      </div>
      <p className="asof">Signed in as <b>{me.name}</b> ({me.id}) · business records live in the CRM database (ADR-0008)</p>

      {q?.trim() && (
        <>
          <div className="section-label">Search: “{q}” ({results.length})</div>
          {results.length ? (
            <div className="rows">
              {results.map((r) => (
                <Link key={r.id} href={`/crm/${r.type}/${r.id}`} className="row">
                  <span className="chip mono">{r.id}</span>
                  <span className="action">{r.title}</span>
                  <span className="meta">{LIFECYCLES[r.type as keyof typeof LIFECYCLES]?.label} · {r.owner}</span>
                  <span className="chip state">{r.stage}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">No records match.</div>
          )}
        </>
      )}

      <div className="section-label">Records</div>
      <div className="tiles">
        {types.map((t) => {
          const lc = LIFECYCLES[t];
          const e = byType.get(t)!;
          return (
            <Link key={t} href={`/crm/${t}`} className="tile">
              <div className="tile-name">{lc.plural}</div>
              <div className="tile-main">
                <span className="big">{e.total}</span>
                <span className="tile-label">{crmAccess(me, t) === "edit" ? "editor" : "viewer"}</span>
              </div>
              <div className="tile-row">
                {e.stages.sort((a, b) => lc.stages.indexOf(a[0]) - lc.stages.indexOf(b[0])).map(([stage, n]) => (
                  <span key={stage} className="mini">{stage}: {n}</span>
                ))}
                {!e.total && <span className="mini muted">none yet</span>}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="section-label">Recent activity</div>
      {recent.length ? (
        <ul className="timeline">
          {recent.map((a) => (
            <li key={a.id} className={a.kind === "gate" ? "human" : ""}>
              <span className="when">{a.at.toISOString().slice(0, 16).replace("T", " ")}</span>
              <span className="who">{a.actor}</span>
              {a.kind} · <Link href={`/crm/${a.recordType}/${a.recordId}`}>{a.recordId}</Link> — {a.recordTitle}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">No activity yet.</div>
      )}
    </main>
  );
}

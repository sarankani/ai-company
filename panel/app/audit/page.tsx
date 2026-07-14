import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { loadRecords } from "@/lib/records";
import { humanById, loadHumans, loadDepartments } from "@/lib/org";
import { GATE_DEPT } from "@/lib/engine";
import { buildLedger, ledgerActors, type LedgerFilters } from "@/lib/audit";

/** Decision ledger (EX-302, PRD US-12) — Head/CEO only. Every decision, hop,
 * and execution across the records you may see, filterable by department /
 * human / gate / date. Filters are a GET form (URL-persisted, no client JS).
 * Read-only over records — no new state (ADR-0002). */
export default async function Audit({
  searchParams,
}: {
  searchParams: Promise<LedgerFilters>;
}) {
  const f = await searchParams;
  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  if (!session) redirect("/signin?return=/audit");
  const me = await humanById(session);
  if (!me) redirect("/api/auth/signout");

  if (!me.roles.some((r) => r.seat === "head" || r.seat === "ceo")) {
    return (
      <main>
        <div className="card">
          <h1>Head &amp; CEO only</h1>
          <p>The decision ledger is for Head and CEO seats. Your queue is in the <Link href="/inbox">Inbox</Link>.</p>
        </div>
      </main>
    );
  }

  const [{ records: all, asOf }, departments, humans] = await Promise.all([
    loadRecords(), loadDepartments(), loadHumans(),
  ]);
  const events = buildLedger(all, me, f);
  const actors = ledgerActors(all, me);
  const gates = [...new Set(Object.keys(GATE_DEPT))].sort();
  const active = f.department || f.actor || f.gate || f.from || f.to;

  return (
    <main className="wide">
      <div className="head-row">
        <h1>Decision ledger</h1>
        <span className="asof">as of {asOf.toISOString().slice(11, 16)} UTC · {events.length} event{events.length === 1 ? "" : "s"}</span>
      </div>
      <p className="asof">Every decision, reassignment, and execution across the records you can see — append-only, computed from the Company OS.</p>

      <form className="ledger-filters" method="get">
        <select name="department" defaultValue={f.department ?? ""} aria-label="Department">
          <option value="">all departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select name="actor" defaultValue={f.actor ?? ""} aria-label="Human">
          <option value="">all humans</option>
          {actors.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select name="gate" defaultValue={f.gate ?? ""} aria-label="Gate">
          <option value="">all gates</option>
          {gates.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input type="date" name="from" defaultValue={f.from ?? ""} aria-label="From date" />
        <input type="date" name="to" defaultValue={f.to ?? ""} aria-label="To date" />
        <button type="submit">Filter</button>
        {active && <Link className="fchip clear" href="/audit">clear ✕</Link>}
      </form>

      {events.length ? (
        <div className="table-scroll">
          <table className="ledger">
            <thead>
              <tr><th>When (UTC)</th><th>Event</th><th>Record</th><th>Gate</th><th>Dept</th><th>Who</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className={e.human ? "human" : "system"}>
                  <td className="mono nowrap">{e.at.replace("T", " ").replace("Z", "")}</td>
                  <td><span className={`kind ${e.kind}`}>{e.outcome}</span></td>
                  <td><Link className="mono" href={`/item/${e.id}`}>{e.id}</Link></td>
                  <td>{e.gate}</td>
                  <td>{e.department}</td>
                  <td className={e.human ? "who-human" : "who-sys"}>{e.actor}</td>
                  <td className="detail">{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">{active ? "No events match these filters." : "No decisions recorded yet."}</div>
      )}
    </main>
  );
}

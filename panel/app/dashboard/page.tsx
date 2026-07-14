import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { loadRecords } from "@/lib/records";
import { humanById, loadDepartments, isCeoSeat } from "@/lib/org";
import { deptStats, escalatedTo, visibleTo } from "@/lib/stats";
import { slaLabel } from "@/lib/format";

/** Company Dashboard (EX-204, Design Brief §4.3): one screen answering
 * "what is the company doing and where is it stuck." Waiting-on-human is
 * the dominant number — the whole model exists to keep that small. */
export default async function Dashboard() {
  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  if (!session) redirect("/signin?return=/dashboard");
  const me = await humanById(session);
  if (!me) redirect("/api/auth/signout");

  const [{ records: all, asOf }, departments] = await Promise.all([loadRecords(), loadDepartments()]);
  const records = visibleTo(me, all);
  const now = new Date();
  const mine = escalatedTo(records, me.id);

  return (
    <main className="wide">
      <div className="head-row">
        <h1>Company Dashboard</h1>
        <span className="asof">as of {asOf.toISOString().slice(11, 16)} UTC · refreshes ≤ 5 min</span>
      </div>

      {isCeoSeat(me) && mine.length > 0 && (
        <section className="escalated" aria-label="Escalated to you">
          <div className="section-label">⚠ Escalated to you ({mine.length}) — the chain ends here</div>
          <div className="rows">
            {mine.map((r) => {
              const sla = slaLabel(r.sla_due, now);
              return (
                <Link key={r.id} href={`/item/${r.id}`} className={`row${sla.overdue ? " overdue" : ""}`}>
                  <span className="chip gate">{r.gate}</span>
                  <span className="action">{r.action}</span>
                  <span className="meta">hopped {r.hops.length}× · from {String(r.hops[r.hops.length - 1]?.from)}</span>
                  <span className={`chip sla${sla.overdue ? " overdue" : ""}`}>{sla.text}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {records.length === 0 ? (
        <div className="empty">
          No records yet — the Company OS is empty. Work appears here the moment an
          AI employee hits a gate or books a deliverable (see <code>guides/value-chain.md</code>).
        </div>
      ) : (
        <div className="tiles">
          {departments.map((d) => {
            const s = deptStats(records, d.id, now);
            return (
              <Link key={d.id} href={`/board/${d.id}`} className="tile">
                <div className="tile-name">{d.name}</div>
                <div className="tile-main">
                  <span className={`big${s.waiting ? " amber" : ""}`}>{s.waiting}</span>
                  <span className="tile-label">
                    waiting on human{s.oldestWaitingH !== null ? ` · oldest ${s.oldestWaitingH}h` : ""}
                  </span>
                </div>
                <div className="tile-row">
                  <span className="mini teal">{s.wip} in flight</span>
                  <span className={`mini${s.escalations ? " amber-line" : ""}`}>{s.escalations} escalated</span>
                  <span className="mini muted">{s.deliveredWeek} delivered/wk</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

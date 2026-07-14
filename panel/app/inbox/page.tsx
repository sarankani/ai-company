import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loadRecords, type ApprovalRecord } from "@/lib/records";
import { verifySession } from "@/lib/auth";
import { humanById, authorized } from "@/lib/org";

// Approval Inbox skeleton (EX-202 scope): sections + row anatomy + urgency
// sort per Design Brief §4.1. Rows are not yet actionable — the decide
// surface (Item Detail + DecisionPanel) is EX-203.

function slaLabel(due: string, now: Date): { text: string; overdue: boolean } {
  const ms = new Date(due).getTime() - now.getTime();
  const overdue = ms < 0;
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600_000);
  const m = Math.floor((abs % 3600_000) / 60_000);
  const span = h >= 48 ? `${Math.floor(h / 24)}d` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return { text: overdue ? `Overdue by ${span}` : `Due in ${span}`, overdue };
}

function Row({ r, now }: { r: ApprovalRecord; now: Date }) {
  const sla = slaLabel(r.sla_due, now);
  const escalated = r.hops.length > 0;
  const last = r.hops[r.hops.length - 1];
  return (
    <div className={`row${sla.overdue && r.state === "pending" ? " overdue" : ""}`}
         title="Open item — the decide surface arrives with EX-203">
      <span className="chip gate">{r.gate}</span>
      <span className="chip mono">{r.type === "question" ? "QST" : "APR"}</span>
      <span className="action">{r.action}</span>
      <span className="meta">
        {r.requested_by} · {r.department}
        {escalated && last ? ` · escalated from ${last.from}` : ""}
      </span>
      {r.state === "pending" ? (
        <span className={`chip sla${sla.overdue ? " overdue" : ""}`}>
          {sla.text}
          {sla.overdue ? "" : ""}
        </span>
      ) : (
        <span className="chip state">{r.state}</span>
      )}
    </div>
  );
}

export default async function Inbox() {
  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  if (!session) redirect("/signin?return=/inbox");
  const me = await humanById(session);
  if (!me) redirect("/api/auth/signout");

  const { records, asOf } = await loadRecords();
  const now = new Date();
  const week = 7 * 24 * 3600_000;

  const pending = records.filter((r) => r.state === "pending");
  const needsMe = pending
    .filter((r) => r.assignee === me.id || (authorized(me, r.department) && r.stamps.length > 0))
    .sort((a, b) => a.sla_due.localeCompare(b.sla_due));
  const others = pending.filter((r) => !needsMe.includes(r));
  const recent = records.filter(
    (r) => r.state !== "pending" &&
      now.getTime() - new Date((r.decision?.at as string) ?? r.created).getTime() < week,
  );

  return (
    <main>
      <h1>Approval Inbox</h1>
      <p className="asof">
        Signed in as <b>{me.name}</b> ({me.id}) · data as of{" "}
        {asOf.toISOString().slice(11, 16)} UTC · refreshes ≤ 5 min
      </p>

      <div className="section-label">Needs you ({needsMe.length})</div>
      {needsMe.length ? (
        <div className="rows">{needsMe.map((r) => <Row key={r.id} r={r} now={now} />)}</div>
      ) : (
        <div className="empty">Inbox zero — nothing needs you.</div>
      )}

      <div className="section-label">Waiting on others ({others.length})</div>
      {others.length ? (
        <div className="rows">{others.map((r) => <Row key={r.id} r={r} now={now} />)}</div>
      ) : (
        <div className="empty">Nothing pending elsewhere.</div>
      )}

      <div className="section-label">Recently decided (7 days)</div>
      {recent.length ? (
        <div className="rows">{recent.map((r) => <Row key={r.id} r={r} now={now} />)}</div>
      ) : (
        <div className="empty">No decisions in the last week.</div>
      )}
    </main>
  );
}

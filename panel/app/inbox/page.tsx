import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loadRecords, type ApprovalRecord } from "@/lib/records";
import { verifySession } from "@/lib/auth";
import { humanById, authorized } from "@/lib/org";
import { canView } from "@/lib/engine";
import { slaLabel } from "@/lib/format";

// Approval Inbox (Design Brief §4.1): sections + row anatomy + urgency sort.
// Every row opens the Item Detail decide surface (EX-203).

function Row({ r, now }: { r: ApprovalRecord; now: Date }) {
  const sla = slaLabel(r.sla_due, now);
  const escalated = r.hops.length > 0;
  const last = r.hops[r.hops.length - 1];
  return (
    <Link href={`/item/${r.id}`}
          className={`row${sla.overdue && r.state === "pending" ? " overdue" : ""}`}>
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
    </Link>
  );
}

export default async function Inbox() {
  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  if (!session) redirect("/signin?return=/inbox");
  const me = await humanById(session);
  if (!me) redirect("/api/auth/signout");

  const { records: all, asOf } = await loadRecords();
  const records = all.filter((r) => canView(me, r)); // people-gate restriction
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

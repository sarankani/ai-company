import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { loadRecords, type ApprovalRecord } from "@/lib/records";
import { humanById, loadDepartments, isHeadOf } from "@/lib/org";
import { visibleTo } from "@/lib/stats";
import { slaLabel } from "@/lib/format";

/** Department Board (EX-204, Design Brief §4.4, PRD US-7/8): one department's
 * AI work grouped by state, with composable, URL-persisted filters. Filters
 * are plain links (server-rendered, no client JS) — a chip toggles its own
 * query param and keeps the rest. */

type Filters = { emp?: string; type?: string; state?: string };

function href(dept: string, f: Filters): string {
  const q = new URLSearchParams();
  if (f.emp) q.set("emp", f.emp);
  if (f.type) q.set("type", f.type);
  if (f.state) q.set("state", f.state);
  const s = q.toString();
  return `/board/${dept}${s ? `?${s}` : ""}`;
}

function Chip({ dept, f, k, v, label }: { dept: string; f: Filters; k: keyof Filters; v: string; label: string }) {
  const active = f[k] === v;
  return (
    <Link className={`fchip${active ? " on" : ""}`}
          href={href(dept, { ...f, [k]: active ? undefined : v })}>
      {label}
    </Link>
  );
}

function Row({ r, now, canReassign }: { r: ApprovalRecord; now: Date; canReassign: boolean }) {
  const sla = slaLabel(r.sla_due, now);
  const pending = r.state === "pending";
  return (
    <Link href={`/item/${r.id}`} className={`row${pending && sla.overdue ? " overdue" : ""}`}>
      <span className="chip gate">{r.gate}</span>
      <span className="chip mono">{r.type === "question" ? "QST" : "APR"}</span>
      <span className="action">{r.action}</span>
      <span className="meta">{r.requested_by} → {r.assignee}{r.hops.length ? ` · ${r.hops.length} hop${r.hops.length > 1 ? "s" : ""}` : ""}</span>
      {pending
        ? <span className={`chip sla${sla.overdue ? " overdue" : ""}`}>{sla.text}</span>
        : <span className="chip state">{r.state}</span>}
      {pending && canReassign && <span className="chip reassign">reassign ↗</span>}
    </Link>
  );
}

export default async function Board({
  params, searchParams,
}: {
  params: Promise<{ dept: string }>;
  searchParams: Promise<Filters>;
}) {
  const { dept } = await params;
  const f = await searchParams;

  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  if (!session) redirect(`/signin?return=/board/${dept}`);
  const me = await humanById(session);
  if (!me) redirect("/api/auth/signout");

  const departments = await loadDepartments();
  const d = departments.find((x) => x.id === dept);
  if (!d) notFound();

  const { records: all, asOf } = await loadRecords();
  const now = new Date();
  const canReassign = isHeadOf(me, dept);

  let rs = visibleTo(me, all).filter((r) => r.department === dept);
  const employees = [...new Set(rs.map((r) => r.requested_by))].sort();
  if (f.emp) rs = rs.filter((r) => r.requested_by === f.emp);
  if (f.type) rs = rs.filter((r) => r.type === f.type);
  if (f.state) rs = rs.filter((r) => (f.state === "delivered" ? r.state !== "pending" && r.state !== "approved" : r.state === f.state));

  const bySla = (a: ApprovalRecord, b: ApprovalRecord) => a.sla_due.localeCompare(b.sla_due);
  const groups: { label: string; items: ApprovalRecord[] }[] = [
    { label: "Waiting on a human", items: rs.filter((r) => r.state === "pending").sort(bySla) },
    { label: "In flight (approved, executing)", items: rs.filter((r) => r.state === "approved" && !r.execution?.executed_at).sort(bySla) },
    { label: "Delivered", items: rs.filter((r) => r.state !== "pending" && !(r.state === "approved" && !r.execution?.executed_at)).sort((a, b) => String(b.decision?.at ?? "").localeCompare(String(a.decision?.at ?? ""))) },
  ];

  return (
    <main className="wide">
      <p className="crumbs"><Link href="/dashboard">← Dashboard</Link></p>
      <div className="head-row">
        <h1>{d.name} board</h1>
        <span className="asof">as of {asOf.toISOString().slice(11, 16)} UTC</span>
      </div>
      <p className="asof">AI employees: {d.employees.join(", ")} · gates: {d.gates}</p>

      <div className="filterbar" aria-label="Filters">
        {employees.map((e) => <Chip key={e} dept={dept} f={f} k="emp" v={e} label={e} />)}
        <span className="fsep" />
        <Chip dept={dept} f={f} k="type" v="approval" label="APR" />
        <Chip dept={dept} f={f} k="type" v="question" label="QST" />
        <span className="fsep" />
        <Chip dept={dept} f={f} k="state" v="pending" label="pending" />
        <Chip dept={dept} f={f} k="state" v="approved" label="approved" />
        <Chip dept={dept} f={f} k="state" v="delivered" label="delivered" />
        {(f.emp || f.type || f.state) && <Link className="fchip clear" href={href(dept, {})}>clear ✕</Link>}
      </div>

      {groups.map((g) => (
        <section key={g.label}>
          <div className="section-label">{g.label} ({g.items.length})</div>
          {g.items.length ? (
            <div className="rows">{g.items.map((r) => <Row key={r.id} r={r} now={now} canReassign={canReassign} />)}</div>
          ) : (
            <div className="empty">Nothing here.</div>
          )}
        </section>
      ))}
    </main>
  );
}

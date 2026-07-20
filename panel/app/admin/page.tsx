import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { loadRecords } from "@/lib/records";
import { humanById, loadHumans, loadDepartments, isCeoSeat } from "@/lib/org";
import { parseSeatChange, parseAddMember, canView, CHAIN } from "@/lib/engine";
import {
  proposeSeatChangeAction, applySeatChangeAction,
  proposeAddMemberAction, applyAddMemberAction,
} from "./actions";

/** People & Routing admin (EX-205, Design Brief §4.5) — Head/CEO only.
 * Seat change is a visualized two-step: propose (Head) → decide on the item
 * page (dual stamps) → apply (CEO, exactly-once commit). Never a direct edit. */
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  if (!session) redirect("/signin?return=/admin");
  const me = await humanById(session);
  if (!me) redirect("/api/auth/signout");

  const isAdmin = me.roles.some((r) => r.seat === "head" || r.seat === "ceo");
  if (!isAdmin) {
    return (
      <main>
        <div className="card">
          <h1>Head &amp; CEO only</h1>
          <p>The People &amp; Routing admin is for Head and CEO seats. Your queue is in the <Link href="/inbox">Inbox</Link>.</p>
        </div>
      </main>
    );
  }

  const [humans, departments, { records }] = await Promise.all([
    loadHumans(), loadDepartments(), loadRecords(),
  ]);
  // Seat-change records are gate:people (admin/actions.ts) — visible only to
  // People & Finance seats + CEO (EX-206 M4). A Head of another department
  // reaches /admin but must not see People-gate proposals.
  const seatChanges = records
    .filter((r) => canView(me, r))
    .map((r) => ({ r, change: parseSeatChange(r.body) }))
    .filter((x) => x.change)
    .sort((a, b) => b.r.id.localeCompare(a.r.id));
  const memberAdds = records
    .filter((r) => canView(me, r))
    .map((r) => ({ r, member: parseAddMember(r.body) }))
    .filter((x) => x.member)
    .sort((a, b) => b.r.id.localeCompare(a.r.id));
  const canSeeSeatChanges = me.roles.some((r) => r.seat === "ceo" || r.department === "people-finance");

  return (
    <main className="wide">
      <h1>People &amp; Routing</h1>
      <p className="asof">Seat changes are gated two-step (Head proposes → dual approval → CEO applies) — never a direct edit.</p>

      {sp.err === "conflict" && <p className="notice err" role="alert">Something changed underneath that action — reloaded fresh; please retry.</p>}
      {sp.err && sp.err !== "conflict" && <p className="notice err" role="alert">Refused: {sp.err}</p>}
      {sp.proposed && <p className="notice" role="status">Proposal <b>{sp.proposed}</b> created — it now needs its dual approval (people gate), then the CEO applies it here.</p>}
      {sp.applied && <p className="notice" role="status">Seat change <b>{sp.applied}</b> applied — one commit, exactly once. Routing uses the new seats from the next read.</p>}

      <div className="section-label">Humans &amp; seats</div>
      <div className="rows">
        {humans.map((h) => (
          <div key={h.id} className="row">
            <span className="who"><b>{h.name}</b> <span className="muted">({h.id})</span></span>
            <span className="meta">{h.email}</span>
            <span className={`chip avail a-${h.availability}`}>{h.availability}</span>
            <span className="seats">
              {h.roles.map((r, i) => (
                <span key={i} className="chip mono">{r.department}·{r.seat}</span>
              ))}
            </span>
          </div>
        ))}
      </div>

      <div className="section-label">Seat changes (two-step, full history)</div>
      {seatChanges.length ? (
        <div className="rows">
          {seatChanges.map(({ r, change }) => (
            <div key={r.id} className="row">
              <Link href={`/item/${r.id}`} className="mono">{r.id}</Link>
              <span className="action">{change!.department} {change!.seat}: {change!.from} → {change!.to}</span>
              {r.state === "pending" && <span className="chip sla">awaiting dual approval — decide on the item</span>}
              {r.state === "approved" && !r.execution?.executed_at && (
                isCeoSeat(me) ? (
                  <form action={applySeatChangeAction} className="inline-form">
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="apply">Apply now — exactly once</button>
                  </form>
                ) : (
                  <span className="chip state">approved — awaiting CEO apply</span>
                )
              )}
              {r.execution?.executed_at ? <span className="chip state">applied {String(r.execution.executed_at).slice(0, 10)}</span> : null}
              {r.state === "rejected" && <span className="chip state">rejected</span>}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">No seat changes proposed yet.</div>
      )}

      <div className="section-label">Propose a seat change (Head of that department, or CEO)</div>
      <form action={proposeSeatChangeAction} className="propose card-flat">
        <div className="prow">
          <select name="department" required defaultValue="" aria-label="Department">
            <option value="" disabled>department…</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select name="seat" required defaultValue="" aria-label="Seat">
            <option value="" disabled>seat…</option>
            {CHAIN.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select name="to" required defaultValue="" aria-label="New holder">
            <option value="" disabled>new holder…</option>
            {humans.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.id})</option>)}
          </select>
        </div>
        <input type="text" name="why" placeholder="Why (lands in the record summary)" aria-label="Reason" />
        <button type="submit">Propose — creates the gated record</button>
      </form>

      <div className="section-label">Members &amp; CRM grants (two-step, people-gated)</div>
      {memberAdds.length ? (
        <div className="rows">
          {memberAdds.map(({ r, member }) => (
            <div key={r.id} className="row">
              <Link href={`/item/${r.id}`} className="mono">{r.id}</Link>
              <span className="action">
                add member {member!.id} ({member!.email}) · {member!.grants.map((g) => `${g.department}:${g.seat.replace("crm-", "")}`).join(", ")}
              </span>
              {r.state === "pending" && <span className="chip sla">awaiting dual approval — decide on the item</span>}
              {r.state === "approved" && !r.execution?.executed_at && (
                isCeoSeat(me) ? (
                  <form action={applyAddMemberAction} className="inline-form">
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="apply">Apply now — exactly once</button>
                  </form>
                ) : (
                  <span className="chip state">approved — awaiting CEO apply</span>
                )
              )}
              {r.execution?.executed_at ? <span className="chip state">added {String(r.execution.executed_at).slice(0, 10)}</span> : null}
              {r.state === "rejected" && <span className="chip state">rejected</span>}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">No member additions proposed yet.</div>
      )}

      <div className="section-label">Propose a new member (CRM access only — no approval authority)</div>
      <form action={proposeAddMemberAction} className="propose card-flat">
        <div className="prow">
          <input type="text" name="id" placeholder="id (kebab-case)" aria-label="Member id" required pattern="[a-z0-9][a-z0-9-]{1,29}" />
          <input type="text" name="name" placeholder="Full name" aria-label="Full name" required />
          <input type="email" name="email" placeholder="Email (their login)" aria-label="Email" required />
          <input type="text" name="title" placeholder="Title (optional)" aria-label="Title" />
        </div>
        <div className="prow grants" role="group" aria-label="CRM grants per department">
          {departments.map((d) => (
            <label key={d.id} className="grant">
              <span>{d.name}</span>
              <select name={`grant:${d.id}`} defaultValue="" aria-label={`${d.name} grant`}>
                <option value="">no access</option>
                <option value="crm-viewer">viewer</option>
                <option value="crm-editor">editor</option>
              </select>
            </label>
          ))}
        </div>
        <button type="submit">Propose — creates the gated record</button>
      </form>

      <div className="section-label">Routing (read-only)</div>
      <p className="asof">Gate→department map, SLA table, and escalation chain live in <code>company/org/routing.md</code>; the real-world designation → agent map (role families, seniority ladders) lives in <code>company/org/designations.md</code> (Plan 006). Both are file-gated (Head proposes, CEO approves). Editing UI is out of MVP scope.</p>
    </main>
  );
}

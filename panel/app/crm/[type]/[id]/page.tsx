import Link from "next/link";
import { notFound } from "next/navigation";
import { isCrmType, lifecycleOf, nextStages, gateFor } from "@/lib/crm/lifecycles";
import { crmAccess } from "@/lib/crm/rbac";
import { getCrmRecord } from "@/lib/crm/store";
import { checkAndApplyGate } from "@/lib/crm/gates";
import { requireCrmHuman, humanActor } from "@/lib/crm/session";
import { updateCrmAction, transitionCrmAction, commentCrmAction, linkCrmAction } from "../../actions";

// Record detail (EX-703/704/706): envelope + fields, stage buttons (gated →
// approval round-trip), related records / account 360, activity timeline.

function fmt(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export default async function CrmRecordDetail({
  params, searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ err?: string; saved?: string; moved?: string; gate?: string }>;
}) {
  const { type, id } = await params;
  if (!isCrmType(type)) notFound();
  const me = await requireCrmHuman(`/crm/${type}/${id}`);
  const access = crmAccess(me, type);
  if (access === "none") notFound();
  const actor = humanActor(me);
  const lc = lifecycleOf(type);
  const { err, saved, moved, gate } = await searchParams;

  let detail = await getCrmRecord(id, actor);
  if (!detail || detail.record.type !== type) notFound();

  // pull-based gate reconciliation: a decided APR lands here (EX-706)
  let gateNote: string | null = null;
  if (detail.record.aprId) {
    try {
      const outcome = await checkAndApplyGate(detail.record, actor);
      if (outcome.status === "applied") {
        gateNote = `${outcome.aprId} approved — stage applied.`;
        detail = (await getCrmRecord(id, actor))!;
      } else if (outcome.status === "cleared") {
        gateNote = `${outcome.aprId} ${outcome.outcome} — stage unchanged.`;
        detail = (await getCrmRecord(id, actor))!;
      }
    } catch {
      gateNote = `Could not check ${detail.record.aprId} — see the inbox.`;
    }
  }

  const { record: r, related, children, activities } = detail;
  const canEdit = access === "edit";
  const nexts = nextStages(type, r.stage);
  const fields = r.fields as Record<string, string | number | null>;

  return (
    <main className="wide">
      <div className="crumbs">
        <span><Link href="/crm">CRM</Link> / <Link href={`/crm/${type}`}>{lc.plural}</Link> / {r.id}</span>
        <span className="muted">{canEdit ? "editor" : "viewer"}</span>
      </div>

      <div className="item-head">
        <span className="chip mono">{r.id}</span>
        <h1>{r.title}</h1>
        <span className="chip state">{r.stage}</span>
        {r.aprId && <span className="chip gate">awaiting {r.aprId}</span>}
      </div>
      <p className="asof">
        {lc.label} · owner <b>{r.owner}</b>
        {r.accountId && <> · account <Link href={`/crm/accounts/${r.accountId}`}>{r.accountId}</Link></>}
        {" "}· created {fmt(r.createdAt)} by {r.createdBy} · updated {fmt(r.updatedAt)} by {r.updatedBy}
      </p>

      {err && <div className="notice err">{err}</div>}
      {saved && <div className="notice">Saved.</div>}
      {moved && <div className="notice">Moved to ‘{moved}’.</div>}
      {gate && (
        <div className="notice">
          Approval requested: <Link href={`/item/${gate}`}>{gate}</Link> — the stage applies once an authorized human approves.
        </div>
      )}
      {gateNote && <div className="notice">{gateNote}</div>}

      {r.summary && <div className="artifact"><div className="artifact-head">Summary</div>{r.summary}</div>}

      {/* stage transitions */}
      {canEdit && (
        <div className="decide">
          <div className="section-label" style={{ marginTop: 0 }}>Stage: {r.stage}</div>
          {r.aprId ? (
            <p className="muted">
              Waiting on <Link href={`/item/${r.aprId}`}>{r.aprId}</Link> to move to ‘{r.pendingStage}’.
              Decide it in the <Link href="/inbox">inbox</Link>; this page applies the result.
            </p>
          ) : nexts.length ? (
            <div className="tile-row">
              {nexts.map((to) => {
                const g = gateFor(type, r.stage, to);
                return (
                  <form key={to} action={transitionCrmAction} style={{ display: "inline" }}>
                    <input type="hidden" name="type" value={type} />
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="to" value={to} />
                    <button title={g ? `Requires ${g} gate approval` : `Move to ${to}`}>
                      → {to}{g ? " 🔒" : ""}
                    </button>
                  </form>
                );
              })}
            </div>
          ) : (
            <p className="muted">Terminal stage.</p>
          )}
          {!r.aprId && nexts.some((to) => gateFor(type, r.stage, to)) && (
            <p className="muted" style={{ fontSize: 12.5 }}>🔒 = human gate: the move files an approval request instead of applying immediately.</p>
          )}
        </div>
      )}

      {/* fields + edit */}
      <div className="decide">
        <div className="section-label" style={{ marginTop: 0 }}>Details</div>
        {canEdit ? (
          <form action={updateCrmAction} className="decide-form crm-form">
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="id" value={r.id} />
            <label>Title<input type="text" name="title" defaultValue={r.title} required maxLength={200} /></label>
            <label>Summary<textarea name="summary" rows={2} defaultValue={r.summary} /></label>
            <label>Owner<input type="text" name="owner" defaultValue={r.owner} /></label>
            {lc.hasAccount && <label>Account id<input type="text" name="account_id" defaultValue={r.accountId ?? ""} placeholder="ACC-…" /></label>}
            {lc.fields.map((f) => (
              <label key={f.key}>{f.label}
                {f.kind === "textarea"
                  ? <textarea name={`field:${f.key}`} rows={2} defaultValue={fields[f.key] != null ? String(fields[f.key]) : ""} />
                  : <input type={f.kind === "date" ? "date" : f.kind === "number" ? "number" : "text"} step="any"
                      name={`field:${f.key}`} defaultValue={fields[f.key] != null ? String(fields[f.key]) : ""} />}
              </label>
            ))}
            <button>Save</button>
          </form>
        ) : (
          <table className="crm-kv"><tbody>
            {lc.fields.map((f) => (
              <tr key={f.key}><th>{f.label}</th><td>{fields[f.key] != null && fields[f.key] !== "" ? String(fields[f.key]) : "—"}</td></tr>
            ))}
          </tbody></table>
        )}
      </div>

      {/* related records */}
      <div className="section-label">Related</div>
      {related.length || children.length ? (
        <div className="rows">
          {related.map((l) => (
            <Link key={`${l.dir}:${l.rel}:${l.id}`} href={`/crm/${l.type}/${l.id}`} className="row">
              <span className="chip">{l.dir === "out" ? l.rel : `⇠ ${l.rel}`}</span>
              <span className="chip mono">{l.id}</span>
              <span className="action">{l.title}</span>
              <span className="chip state">{l.stage}</span>
            </Link>
          ))}
          {children.map((c) => (
            <Link key={c.id} href={`/crm/${c.type}/${c.id}`} className="row">
              <span className="chip">{c.type}</span>
              <span className="chip mono">{c.id}</span>
              <span className="action">{c.title}</span>
              <span className="chip state">{c.stage}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">No linked records.</div>
      )}
      {canEdit && (
        <form action={linkCrmAction} className="crm-inline-form">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="id" value={r.id} />
          <input type="text" name="rel" placeholder="rel (e.g. invoice-for)" aria-label="Relation" required />
          <input type="text" name="to" placeholder="target id (e.g. OPP-…)" aria-label="Target record id" required />
          <button>Link</button>
        </form>
      )}

      {/* activity + comments */}
      <div className="section-label">Activity</div>
      {canEdit && (
        <form action={commentCrmAction} className="crm-inline-form">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="id" value={r.id} />
          <input type="text" name="text" placeholder="Add a comment…" aria-label="Comment" required maxLength={4000} style={{ flex: 1 }} />
          <button>Comment</button>
        </form>
      )}
      {activities.length ? (
        <ul className="timeline">
          {activities.map((a) => {
            const d = a.detail as Record<string, unknown>;
            return (
              <li key={a.id} className={a.kind === "gate" ? "human" : ""}>
                <span className="when">{fmt(a.at)}</span>
                <span className="who">{a.actor}</span>
                {a.kind === "comment" ? String(d.text ?? "")
                  : a.kind === "stage" ? `moved ${String(d.from)} → ${String(d.to)}${d.apr_id ? ` (via ${String(d.apr_id)})` : ""}`
                  : a.kind === "gate" ? `gate ${String(d.event)}${d.apr_id ? ` · ${String(d.apr_id)}` : ""}${d.to ? ` → '${String(d.to)}'` : ""}`
                  : a.kind === "updated" ? (d.linked ? `linked ${String(d.linked)} (${String(d.rel)})` : `updated ${(d.changed as string[] | undefined)?.join(", ") ?? ""}`)
                  : `created (stage: ${String(d.stage ?? "")})`}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty">No activity yet.</div>
      )}
    </main>
  );
}

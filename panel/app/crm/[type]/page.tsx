import Link from "next/link";
import { notFound } from "next/navigation";
import { isCrmType, lifecycleOf } from "@/lib/crm/lifecycles";
import { crmAccess } from "@/lib/crm/rbac";
import { listCrmRecords } from "@/lib/crm/store";
import { requireCrmHuman, humanActor } from "@/lib/crm/session";
import { createCrmAction } from "../actions";

// Type list (EX-703/704): filterable rows + inline new-record form (editors).

export default async function CrmTypeList({
  params, searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ stage?: string; owner?: string; account?: string; q?: string; err?: string }>;
}) {
  const { type } = await params;
  if (!isCrmType(type)) notFound();
  const me = await requireCrmHuman(`/crm/${type}`);
  const access = crmAccess(me, type);
  if (access === "none") notFound(); // hidden without a grant — not even a 403
  const lc = lifecycleOf(type);
  const { stage, owner, account, q, err } = await searchParams;

  const records = await listCrmRecords(type, { stage, owner, account, q }, humanActor(me));

  const filterHref = (s?: string) => {
    const p = new URLSearchParams();
    if (s) p.set("stage", s);
    if (owner) p.set("owner", owner);
    if (account) p.set("account", account);
    if (q) p.set("q", q);
    const qs = p.toString();
    return `/crm/${type}${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="wide">
      <div className="crumbs">
        <span><Link href="/crm">CRM</Link> / {lc.plural}</span>
        <span className="muted">{access === "edit" ? "editor" : "viewer"}</span>
      </div>
      <h1>{lc.plural}</h1>
      <p className="asof">{records.length} record{records.length === 1 ? "" : "s"}{stage ? ` · stage: ${stage}` : ""}{q ? ` · “${q}”` : ""}</p>
      {err && <div className="notice err">{err}</div>}

      <div className="tile-row" role="navigation" aria-label="Stage filter">
        <Link className={`chip${!stage ? " state" : ""}`} href={filterHref()}>all</Link>
        {lc.stages.map((s) => (
          <Link key={s} className={`chip${stage === s ? " state" : ""}`} href={filterHref(s)}>{s}</Link>
        ))}
      </div>

      {access === "edit" && (
        <details className="decide" style={{ marginTop: 14 }}>
          <summary>New {lc.label.toLowerCase()}</summary>
          <form action={createCrmAction} className="decide-form crm-form">
            <input type="hidden" name="type" value={type} />
            <label>Title<input type="text" name="title" required maxLength={200} /></label>
            <label>Summary<textarea name="summary" rows={2} /></label>
            <label>Owner (AI employee)<input type="text" name="owner" placeholder={lc.defaultOwner} /></label>
            {lc.hasAccount && <label>Account id<input type="text" name="account_id" placeholder="ACC-…" /></label>}
            {lc.fields.map((f) => (
              <label key={f.key}>{f.label}
                {f.kind === "textarea"
                  ? <textarea name={`field:${f.key}`} rows={2} />
                  : <input type={f.kind === "date" ? "date" : f.kind === "number" ? "number" : "text"} step="any" name={`field:${f.key}`} />}
              </label>
            ))}
            <button>Create</button>
          </form>
        </details>
      )}

      <div className="section-label">Records</div>
      {records.length ? (
        <div className="rows">
          {records.map((r) => (
            <Link key={r.id} href={`/crm/${type}/${r.id}`} className="row">
              <span className="chip mono">{r.id}</span>
              <span className="action">{r.title}</span>
              <span className="meta">
                {r.owner}{r.accountId ? ` · ${r.accountId}` : ""} · updated {r.updatedAt.toISOString().slice(0, 10)}
              </span>
              {r.aprId && <span className="chip gate">gate: {r.aprId}</span>}
              <span className="chip state">{r.stage}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">No {lc.plural.toLowerCase()} yet.</div>
      )}
    </main>
  );
}

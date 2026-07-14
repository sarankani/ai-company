import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { parseRecord, repoSource, loadRecords, isRenderableArtifactPath, type InlineDict } from "@/lib/records";
import { humanById, loadHumans, authorized, type Human } from "@/lib/org";
import { contentSha, canView, DUAL_GATES, CHAIN } from "@/lib/engine";
import { slaLabel, bodySection } from "@/lib/format";
import { Markdown } from "@/components/md";
import { decideAction, delegateAction, followUpAction } from "./actions";

/** Item Detail — the decide surface (EX-203, Design Brief §4.2).
 * Server-rendered from a FRESH record read (never the cache): what you
 * decide on is what is in the repo right now, and the form carries that
 * content's sha for the optimistic-concurrency check on write. */

const ID_RE = /^(APR|QST)-\d{8}-\d{3}$/;

function Banner({ sp }: { sp: Record<string, string | undefined> }) {
  if (sp.err === "conflict")
    return <p className="notice err" role="alert">This item changed since you loaded it (a new stamp or hop landed). Showing the current state — please re-check before deciding.</p>;
  if (sp.err)
    return <p className="notice err" role="alert">Refused: {sp.err}</p>;
  if (sp.done)
    return <p className="notice" role="status">Decision recorded — <b>{sp.done}</b>. One commit, stamped and auditable.</p>;
  if (sp.stamped)
    return <p className="notice" role="status">Your stamp is recorded — this dual-approval gate still needs its second stamp.</p>;
  if (sp.delegated)
    return <p className="notice" role="status">Delegated to <b>{sp.delegated}</b> — the hop is on the record.</p>;
  if (sp.asked)
    return <p className="notice" role="status">Follow-up posted to the record&apos;s Thread. The item stays pending.</p>;
  return null;
}

function Timeline({ data }: { data: Record<string, unknown> }) {
  const events: { at: string; who: string; what: string; human: boolean }[] = [];
  events.push({ at: String(data.created), who: String(data.requested_by), what: "record created", human: false });
  for (const n of (data.notified as InlineDict[]) ?? [])
    events.push({ at: String(n.at), who: String(n.to), what: `notified (${n.kind})`, human: false });
  for (const h of (data.hops as InlineDict[]) ?? [])
    events.push({ at: String(h.at), who: `${h.from} → ${h.to}`, what: `hop (${h.reason})`, human: false });
  for (const s of (data.stamps as InlineDict[]) ?? [])
    events.push({
      at: String(s.at), who: String(s.by), human: true,
      what: `stamp: ${s.outcome}` + (s.reason ? ` — ${s.reason}` : "") + (s.conditions ? ` · conditions: ${s.conditions}` : ""),
    });
  const ex = data.execution as InlineDict | null;
  if (ex?.claimed_at) events.push({ at: String(ex.claimed_at), who: String(ex.by), what: "claimed for execution", human: false });
  if (ex?.executed_at) events.push({ at: String(ex.executed_at), who: String(ex.by), what: `executed exactly once — ${ex.result}`, human: false });
  events.sort((a, b) => a.at.localeCompare(b.at));
  return (
    <ol className="timeline">
      {events.map((e, i) => (
        <li key={i} className={e.human ? "human" : "system"}>
          <span className="when mono">{e.at.replace("T", " ").replace("Z", "")}</span>
          <span className="who">{e.who}</span>
          <span className="what">{e.what}</span>
        </li>
      ))}
    </ol>
  );
}

async function ArtifactCard({ artifact, sha, me }: { artifact: string; sha: string; me: Human }) {
  const isUrl = /^[a-z]+:\/\//.test(artifact);
  // Only render repo files that are safe (no traversal) and allowlisted
  // (EX-206 H1). If the artifact IS itself a record, re-check canView on
  // THAT record so a widely-visible record can't smuggle a People-gate
  // record's body into view.
  if (!isUrl && artifact.endsWith(".md") && isRenderableArtifactPath(artifact)) {
    try {
      const raw = await repoSource().readFile(artifact);
      const isRecord = /^company\/(approvals|questions)\//.test(artifact.replace(/\\/g, "/"));
      const viewable = !isRecord || canView(me, parseRecord(raw).data);
      if (viewable) {
        return (
          <div className="artifact">
            <div className="artifact-head mono">{artifact} · sha {sha}</div>
            <Markdown source={raw.replace(/^---\n[\s\S]*?\n---\n/, "")} />
          </div>
        );
      }
    } catch { /* fall through to link-out */ }
  }
  const gh = process.env.GITHUB_REPO;
  const href = isUrl ? artifact : gh && isRenderableArtifactPath(artifact) ? `https://github.com/${gh}/blob/main/${artifact}` : null;
  return (
    <div className="artifact linkout">
      <span className="mono">{artifact}</span>
      <span className="mono muted">sha {sha}</span>
      {href && <a href={href} target="_blank" rel="noopener noreferrer">open ↗</a>}
    </div>
  );
}

function DualMeter({ data, humans }: { data: Record<string, unknown>; humans: Human[] }) {
  if (!DUAL_GATES.has(String(data.gate)) || data.state !== "pending") return null;
  const oks = ((data.stamps as InlineDict[]) ?? []).filter((s) => s.outcome === "approved");
  const byId = new Map(humans.map((h) => [h.id, h]));
  const haveCeo = oks.some((s) => byId.get(String(s.by))?.roles.some((r) => r.seat === "ceo"));
  const haveDept = oks.some((s) =>
    byId.get(String(s.by))?.roles.some((r) => r.department === data.department && CHAIN.includes(r.seat)));
  const needs = [!haveDept && `a ${data.department} seat stamp`, !haveCeo && "a ceo-seat stamp"]
    .filter(Boolean).join(" and ");
  return (
    <p className="dual mono">
      {Math.min(oks.length, 2)} of 2 stamps{needs ? ` — needs ${needs}` : " — second stamp may be recorded"}
    </p>
  );
}

export default async function Item({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!ID_RE.test(id)) notFound();

  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  if (!session) redirect(`/signin?return=/item/${id}`);
  const me = await humanById(session);
  if (!me) redirect("/api/auth/signout");

  const path = `company/${id.startsWith("QST") ? "questions" : "approvals"}/${id}.md`;
  let raw: string;
  try {
    raw = await repoSource().readFile(path);
  } catch {
    notFound();
  }
  const { data, body } = parseRecord(raw!);
  const baseSha = contentSha(raw!);

  if (!canView(me, data)) {
    return (
      <main>
        <div className="card">
          <h1>Restricted item</h1>
          <p>This item belongs to the People &amp; Finance seat. If you believe you should have access, contact the CEO seat.</p>
          <Link href="/inbox">← Back to inbox</Link>
        </div>
      </main>
    );
  }

  const humans = await loadHumans();
  const now = new Date();
  const sla = slaLabel(String(data.sla_due), now);
  const pending = data.state === "pending";
  const isQuestion = data.type === "question";
  const mayDecide = pending && authorized(me, String(data.department));
  const ex = data.execution as InlineDict | null;
  const decision = data.decision as InlineDict | null;

  // "Next (N)" — the rest of my queue, worst SLA first (locked decision Q-1)
  const { records } = await loadRecords();
  const queue = records
    .filter((r) => r.state === "pending" && r.id !== id && canView(me, r) &&
      (r.assignee === me.id || (authorized(me, r.department) && r.stamps.length > 0)))
    .sort((a, b) => a.sla_due.localeCompare(b.sla_due));

  const delegates = humans.filter((h) => h.id !== me.id && authorized(h, String(data.department)));
  const summary = bodySection(body, "Summary");
  const thread = bodySection(body, "Thread");

  return (
    <main>
      <p className="crumbs">
        <Link href="/inbox">← Inbox</Link>
        {queue.length > 0 && <Link className="next" href={`/item/${queue[0].id}`}>Next ({queue.length}) →</Link>}
      </p>

      <Banner sp={sp} />

      <div className="item-head">
        <h1 className="mono">{id}</h1>
        <span className="chip gate">{String(data.gate)}</span>
        <span className="chip mono">{String(data.priority)}</span>
        {pending
          ? <span className={`chip sla${sla.overdue ? " overdue" : ""}`}>{sla.text}</span>
          : <span className="chip state">{String(data.state)}</span>}
        <span className="chip avail">assignee: {String(data.assignee)}</span>
      </div>

      <div className="section-label">The exact action</div>
      <div className="exact-action mono">{String(data.action)}</div>

      {summary && (
        <>
          <div className="section-label">Summary &amp; recommendation (from {String(data.requested_by)})</div>
          <Markdown source={summary} />
        </>
      )}

      <div className="section-label">Artifact</div>
      <ArtifactCard artifact={String(data.artifact)} sha={String(data.artifact_sha)} me={me} />

      <DualMeter data={data} humans={humans} />

      {mayDecide ? (
        <div className="decide" id="decide">
          <div className="section-label">Your decision — recorded as one commit, stamped {me.id}</div>

          {isQuestion ? (
            <form action={decideAction} className="decide-form">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="baseSha" value={baseSha} />
              <input type="hidden" name="outcome" value="answered" />
              <textarea name="reason" required rows={3} placeholder="Your answer (required — it lands in the stamp)" aria-label="Answer" />
              <button type="submit">Answer</button>
            </form>
          ) : (
            <>
              <form action={decideAction} className="decide-form">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="baseSha" value={baseSha} />
                <input type="hidden" name="outcome" value="approved" />
                <details>
                  <summary>Conditions (optional)</summary>
                  <input type="text" name="conditions" placeholder="e.g. fix the typo in §2 before sending" aria-label="Conditions" />
                </details>
                <button type="submit">Approve</button>
              </form>

              <details className="alt">
                <summary>Reject…</summary>
                <form action={decideAction} className="decide-form">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="baseSha" value={baseSha} />
                  <input type="hidden" name="outcome" value="rejected" />
                  <textarea name="reason" required rows={2} placeholder="Reason (required — mirrors the engine rule)" aria-label="Rejection reason" />
                  <button type="submit" className="danger">Reject</button>
                </form>
              </details>
            </>
          )}

          {delegates.length > 0 && (
            <details className="alt">
              <summary>Delegate…</summary>
              <form action={delegateAction} className="decide-form">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="baseSha" value={baseSha} />
                <select name="to" aria-label="Delegate to" required defaultValue="">
                  <option value="" disabled>Choose an authorized human…</option>
                  {delegates.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.id}) — {h.availability}
                    </option>
                  ))}
                </select>
                <button type="submit">Delegate — the hop is logged</button>
              </form>
            </details>
          )}

          <details className="alt">
            <summary>Ask a follow-up…</summary>
            <form action={followUpAction} className="decide-form">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="baseSha" value={baseSha} />
              <textarea name="text" required rows={2} placeholder="Your question — posted to the record's Thread; the item stays pending" aria-label="Follow-up question" />
              <button type="submit">Post follow-up</button>
            </form>
          </details>
        </div>
      ) : pending ? (
        <p className="notice">You hold no seat in <b>{String(data.department)}</b> — this item is read-only for you.</p>
      ) : (
        <div className="decided">
          <p className="notice" role="status">
            <b>{String(data.state)}</b> by {String(decision?.by)} at {String(decision?.at)}
            {decision?.reason ? <> — {String(decision.reason)}</> : null}
          </p>
          {data.state === "approved" && (
            <p className="exec mono">
              {ex?.executed_at
                ? `✓ executed exactly once at ${ex.executed_at} by ${ex.by}`
                : "execution pending → exactly once"}
            </p>
          )}
        </div>
      )}

      <div className="section-label">Timeline</div>
      <Timeline data={data} />

      {thread && (
        <>
          <div className="section-label">Thread</div>
          <Markdown source={thread} />
        </>
      )}
    </main>
  );
}

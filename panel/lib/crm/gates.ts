/**
 * Gate bridge (Tech Spec 002 §5, EX-706): where the CRM database meets the
 * git-native approval loop. A gated stage transition:
 *   1. creates an ordinary APR record via the engine (exact action, routed
 *      to the owning department's assignee) and commits it + the registry —
 *      identical to any other approval request (ADR-0004/0005 untouched);
 *   2. parks the CRM row (apr_id + pending_stage) via the store.
 * Pull-based completion: checkAndApplyGate() reads the APR fresh; approved →
 * exactly-once execution stamp on the APR (claim/complete, one commit) and
 * the stage applies; rejected/withdrawn → the pending gate clears. No code
 * path moves a gated stage without a named human's decision.
 */
import { parseRecord, repoSource, revalidate, type RecordData } from "../records";
import { loadHumans } from "../org";
import {
  createRecord, claimExecution, completeExecution, dumpChecked,
  rebuildRegistryText, DecisionError,
} from "../engine";
import { repoWriter } from "../write";
import { CrmError, gateFor, lifecycleOf, type CrmType } from "./lifecycles";
import {
  actorId, applyStageInternal, setPendingGateInternal, clearPendingGateInternal,
  type CrmActor,
} from "./store";
import type { CrmRecordRow } from "./schema";

const REGISTRY = "company/registry.md";

async function allApprovalRecords(): Promise<{ path: string; data: RecordData }[]> {
  const src = repoSource();
  const out: { path: string; data: RecordData }[] = [];
  for (const dir of ["company/approvals", "company/questions"]) {
    for (const name of await src.listDir(dir)) {
      if (name === "TEMPLATE.md") continue;
      const p = `${dir}/${name}`;
      out.push({ path: p, data: parseRecord(await src.readFile(p)).data });
    }
  }
  return out;
}

/** Create the APR for a gated transition and park the CRM row behind it. */
export async function requestGatedTransition(
  record: CrmRecordRow, to: string, actor: CrmActor,
): Promise<{ aprId: string; row: CrmRecordRow }> {
  const type = record.type as CrmType;
  const gate = gateFor(type, record.stage, to);
  if (!gate) throw new CrmError(`${record.id}: '${record.stage}' → '${to}' is not a gated transition`);
  if (record.aprId) throw new CrmError(`${record.id} already pending on ${record.aprId}`);

  const by = actorId(actor);
  const lc = lifecycleOf(type);
  const humans = await loadHumans();
  const records = await allApprovalRecords();
  const writer = repoWriter();

  const action = `Move ${record.id} from '${record.stage}' to '${to}' — ${lc.label}: ${record.title}`;
  const { id: aprId, data, body } = createRecord({
    type: "approval", gate, priority: "P1", requestedBy: by,
    artifact: `crm:${record.id}`, artifactShaNow: "external",
    action,
    links: `CRM record ${record.id} (${lc.label})${record.accountId ? ` · account ${record.accountId}` : ""}`,
    summary:
      `Gated CRM stage transition requested by **${by}** via the panel. ` +
      `Record: ${record.id} — ${record.title}. ` +
      `On approval, the panel applies the stage and stamps this record's execution exactly once (Tech Spec 002 §5).`,
    humans,
    existingIds: records.map((r) => String(r.data.id)),
  });

  const path = `company/approvals/${aprId}.md`;
  const recordText = dumpChecked(data, body);
  const registryText = rebuildRegistryText(
    await writer.readFresh(REGISTRY),
    [...records, { data }],
  );
  await writer.commit(
    [{ path, content: recordText }, { path: REGISTRY, content: registryText }],
    `${aprId}: gate requested for CRM ${record.id} (${record.stage} → ${to}) by ${by}`,
    {},
  );
  revalidate();

  const row = await setPendingGateInternal(
    record.id, aprId, to, gate, actor, String(data.assignee ?? "") || undefined,
  );
  return { aprId, row };
}

export type GateCheckOutcome =
  | { status: "none" }
  | { status: "pending"; aprId: string }
  | { status: "applied"; aprId: string; row: CrmRecordRow }
  | { status: "cleared"; aprId: string; outcome: string; row: CrmRecordRow };

/**
 * Reconcile a parked CRM row with its APR's current state. Called from the
 * record detail page and the transition API — pull-based, no webhooks.
 */
export async function checkAndApplyGate(record: CrmRecordRow, actor: CrmActor): Promise<GateCheckOutcome> {
  const aprId = record.aprId;
  const pendingStage = record.pendingStage;
  if (!aprId || !pendingStage) return { status: "none" };
  if (!/^APR-\d{8}-\d{3,}$/.test(aprId)) throw new CrmError(`bad apr id on ${record.id}`);

  const writer = repoWriter();
  const path = `company/approvals/${aprId}.md`;
  const raw = await writer.readFresh(path);
  const { data, body } = parseRecord(raw);
  const state = String(data.state);

  if (state === "pending") return { status: "pending", aprId };

  if (state === "approved") {
    const by = actorId(actor);
    const executed = !!(data.execution as { executed_at?: unknown } | null)?.executed_at;
    if (!executed) {
      // exactly-once: stamp the execution in the same commit that records it
      try {
        claimExecution(data, by, "external");
        completeExecution(data, `stage applied: ${record.id} → '${pendingStage}' via panel`);
      } catch (e) {
        if (e instanceof DecisionError) throw new CrmError(e.message);
        throw e;
      }
      const records = await allApprovalRecords();
      const { contentSha } = await import("../engine");
      const registryText = rebuildRegistryText(
        await writer.readFresh(REGISTRY),
        records.map((r) => (r.path === path ? { data } : r)),
      );
      await writer.commit(
        [{ path, content: dumpChecked(data, body) }, { path: REGISTRY, content: registryText }],
        `${aprId}: executed — CRM ${record.id} stage applied by ${by}\n\nDecided-by: ${String((data.decision as { by?: unknown } | null)?.by ?? "")}`,
        { [path]: contentSha(raw) },
      );
      revalidate();
    }
    // idempotent completion: if the APR is executed but the row is still
    // parked (e.g. a previous run committed then crashed), just apply.
    const row = await applyStageInternal(record.id, record.stage, pendingStage, actor, aprId);
    return { status: "applied", aprId, row };
  }

  // rejected / withdrawn → unpark, stage unchanged
  const row = await clearPendingGateInternal(record.id, aprId, state, actor);
  return { status: "cleared", aprId, outcome: state, row };
}

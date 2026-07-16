import { NextResponse } from "next/server";
import { crmRoute } from "@/lib/crm/api-auth";
import { CrmError } from "@/lib/crm/lifecycles";
import { getCrmRecord, transitionCrmRecord } from "@/lib/crm/store";
import { requestGatedTransition, checkAndApplyGate } from "@/lib/crm/gates";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST {to}: apply an ungated move (200), or file the gate APR and park the
 * row (202 + apr_id). POST {check: true}: reconcile a parked row with its
 * APR's current state (pull-based gate completion — Tech Spec 002 §5).
 */
export const POST = crmRoute<Ctx>(async (req, actor, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  if (body.check === true) {
    const detail = await getCrmRecord(id, actor);
    if (!detail) return NextResponse.json({ error: `record '${id}' not found` }, { status: 404 });
    const outcome = await checkAndApplyGate(detail.record, actor);
    return NextResponse.json(outcome);
  }

  const to = String(body.to ?? "");
  if (!to) throw new CrmError("body.to (target stage) is required");
  const result = await transitionCrmRecord(id, to, actor);
  if (result.applied) return NextResponse.json({ applied: true, record: result.record });
  const { aprId, row } = await requestGatedTransition(result.record, to, actor);
  return NextResponse.json(
    { applied: false, gate: result.gate, apr_id: aprId, record: row },
    { status: 202 },
  );
});

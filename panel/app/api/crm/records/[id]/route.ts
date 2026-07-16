import { NextResponse } from "next/server";
import { crmRoute } from "@/lib/crm/api-auth";
import { getCrmRecord, updateCrmRecord, type CrmFieldValues } from "@/lib/crm/store";

type Ctx = { params: Promise<{ id: string }> };

export const GET = crmRoute<Ctx>(async (_req, actor, ctx) => {
  const { id } = await ctx.params;
  const detail = await getCrmRecord(id, actor);
  if (!detail) return NextResponse.json({ error: `record '${id}' not found` }, { status: 404 });
  return NextResponse.json(detail);
});

export const PATCH = crmRoute<Ctx>(async (req, actor, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const record = await updateCrmRecord(id, {
    title: body.title != null ? String(body.title) : undefined,
    summary: body.summary != null ? String(body.summary) : undefined,
    owner: body.owner != null ? String(body.owner) : undefined,
    accountId: body.account_id !== undefined ? (body.account_id === null ? null : String(body.account_id)) : undefined,
    fields: body.fields as CrmFieldValues | undefined,
  }, actor);
  return NextResponse.json({ record });
});

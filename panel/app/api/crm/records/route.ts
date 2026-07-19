import { NextResponse } from "next/server";
import { crmRoute } from "@/lib/crm/api-auth";
import { CrmError, isCrmType } from "@/lib/crm/lifecycles";
import { createCrmRecord, listCrmRecords, type CrmFieldValues } from "@/lib/crm/store";

export const GET = crmRoute(async (req, actor) => {
  const p = req.nextUrl.searchParams;
  const type = p.get("type") ?? "";
  if (!isCrmType(type)) throw new CrmError("valid ?type= is required");
  const records = await listCrmRecords(type, {
    stage: p.get("stage") ?? undefined,
    owner: p.get("owner") ?? undefined,
    account: p.get("account") ?? undefined,
    q: p.get("q") ?? undefined,
  }, actor, Math.min(Number(p.get("limit") ?? 200) || 200, 500));
  return NextResponse.json({ records });
});

export const POST = crmRoute(async (req, actor) => {
  const body = await req.json().catch(() => ({}));
  const type = String(body.type ?? "");
  if (!isCrmType(type)) throw new CrmError("body.type must be a valid record type");
  const record = await createCrmRecord(type, {
    title: String(body.title ?? ""),
    summary: body.summary != null ? String(body.summary) : undefined,
    owner: body.owner != null ? String(body.owner) : undefined,
    accountId: body.account_id != null ? String(body.account_id) : null,
    fields: (body.fields ?? {}) as CrmFieldValues,
  }, actor);
  return NextResponse.json({ record }, { status: 201 });
});

import { NextResponse } from "next/server";
import { crmRoute } from "@/lib/crm/api-auth";
import { CrmError } from "@/lib/crm/lifecycles";
import { addCrmLink } from "@/lib/crm/store";

type Ctx = { params: Promise<{ id: string }> };

export const POST = crmRoute<Ctx>(async (req, actor, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const rel = String(body.rel ?? ""), to = String(body.to ?? "");
  if (!rel || !to) throw new CrmError("body.rel and body.to are required");
  await addCrmLink(id, rel, to, actor);
  return NextResponse.json({ ok: true }, { status: 201 });
});

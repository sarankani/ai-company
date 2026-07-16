import { NextResponse } from "next/server";
import { crmRoute } from "@/lib/crm/api-auth";
import { addCrmComment } from "@/lib/crm/store";

type Ctx = { params: Promise<{ id: string }> };

export const POST = crmRoute<Ctx>(async (req, actor, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  await addCrmComment(id, String(body.text ?? ""), actor);
  return NextResponse.json({ ok: true }, { status: 201 });
});

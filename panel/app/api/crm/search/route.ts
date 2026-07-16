import { NextResponse } from "next/server";
import { crmRoute } from "@/lib/crm/api-auth";
import { searchCrm } from "@/lib/crm/store";

export const GET = crmRoute(async (req, actor) => {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const records = await searchCrm(q, actor);
  return NextResponse.json({ records });
});

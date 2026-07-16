import { NextResponse } from "next/server";
import { crmRoute } from "@/lib/crm/api-auth";
import { actorId, listCrmNotifications, markCrmNotificationsRead } from "@/lib/crm/store";

/** The notification feed is per-identity: an actor reads/acks only their own. */
export const GET = crmRoute(async (req, actor) => {
  const unread = req.nextUrl.searchParams.get("unread") === "1";
  const notifications = await listCrmNotifications(actorId(actor), { unreadOnly: unread });
  return NextResponse.json({ notifications });
});

export const POST = crmRoute(async (req, actor) => {
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite) : undefined;
  await markCrmNotificationsRead(actorId(actor), ids);
  return NextResponse.json({ ok: true });
});

import Link from "next/link";
import { listCrmNotifications, crmRouteForId } from "@/lib/crm/store";
import { requireCrmHuman } from "@/lib/crm/session";
import { markNotificationsReadAction } from "../actions";

// Notification feed (EX-709): everything addressed to the signed-in human —
// records assigned, stages moved, gates awaiting/decided, comments.

export default async function Notifications() {
  const me = await requireCrmHuman("/crm/notifications");
  const notifications = await listCrmNotifications(me.id, {}, 100);
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <main>
      <div className="head-row">
        <h1>Notifications</h1>
        {unread > 0 && (
          <form action={markNotificationsReadAction}>
            <input type="hidden" name="return" value="/crm/notifications" />
            <button style={{ width: "auto", marginTop: 0 }}>Mark all read ({unread})</button>
          </form>
        )}
      </div>
      <p className="asof">CRM events addressed to <b>{me.id}</b> · gates are decided in the <Link href="/inbox">inbox</Link></p>

      {notifications.length ? (
        <div className="rows">
          {notifications.map((n) => {
            const href = n.recordId ? crmRouteForId(n.recordId) : null;
            const body = (
              <>
                <span className={`chip${n.kind === "gate" ? " gate" : ""}`}>{n.kind}</span>
                <span className="action" style={{ fontWeight: n.readAt ? 400 : 600 }}>{n.message}</span>
                <span className="meta">{n.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</span>
                {!n.readAt && <span className="chip state">new</span>}
              </>
            );
            return href ? (
              <Link key={n.id} href={href} className="row">{body}</Link>
            ) : (
              <div key={n.id} className="row">{body}</div>
            );
          })}
        </div>
      ) : (
        <div className="empty">Nothing yet — you'll see records assigned to you, stage moves, gates, and comments here.</div>
      )}
    </main>
  );
}

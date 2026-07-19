import "./globals.css";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { humanById } from "@/lib/org";
import { hasAnyCrmAccess } from "@/lib/crm/rbac";
import { unreadCrmCount } from "@/lib/crm/store";
import NotificationsLive from "./crm/notifications-live";
import { setAvailabilityAction } from "./org-actions";

export const metadata = { title: "Evalyn Control Panel" };

// Inter everywhere (Saran's preference, 2026-07-16) — self-hosted via
// next/font, exposed as a CSS variable consumed by globals.css.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const DOTS = { available: "●", busy: "◐", ooo: "○" } as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  const human = session ? await humanById(session) : null;
  const crmUser = !!human && hasAnyCrmAccess(human);
  const unread = crmUser ? await unreadCrmCount(human!.id).catch(() => 0) : 0;
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <header className="topbar">
          <a className="wordmark" href="/inbox">EVALYN<i>·</i>PANEL</a>
          {human && (
            <nav className="topnav">
              <a href="/inbox">Inbox</a>
              <a href="/dashboard">Dashboard</a>
              {hasAnyCrmAccess(human) && <a href="/crm">CRM</a>}
              {human.roles.some((r) => r.seat === "head" || r.seat === "ceo") && (
                <>
                  <a href="/audit">Ledger</a>
                  <a href="/admin">Admin</a>
                </>
              )}
            </nav>
          )}
          <span className="spacer" />
          {human && crmUser && (
            <a href="/crm/notifications" className={`chip bell${unread ? " has-unread" : ""}`}
               aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
              🔔{unread ? ` ${unread}` : ""}
            </a>
          )}
          {human && crmUser && <NotificationsLive recipient={human.id} />}
          {human && (
            <>
              <details className="avail-menu">
                <summary className={`chip avail a-${human.availability}`}>
                  {DOTS[human.availability]} {human.availability}
                </summary>
                <form action={setAvailabilityAction} className="avail-form">
                  <input type="hidden" name="return" value="/inbox" />
                  <button name="availability" value="available">● Available</button>
                  <button name="availability" value="busy">◐ Busy</button>
                  <div className="ooo-row">
                    <button name="availability" value="ooo">○ OOO until…</button>
                    <input type="date" name="ooo_until" aria-label="OOO until date" />
                  </div>
                  <p className="avail-note">Going busy/OOO reassigns your pending items now, along the chain; new requests skip you too.</p>
                </form>
              </details>
              <span className="chip">{human.id}</span>
              <a href="/api/auth/signout" style={{ fontSize: 13 }}>sign out</a>
            </>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}

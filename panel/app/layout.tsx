import "./globals.css";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { humanById } from "@/lib/org";
import { setAvailabilityAction } from "./org-actions";

export const metadata = { title: "Evalyn Control Panel" };

const DOTS = { available: "●", busy: "◐", ooo: "○" } as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  const human = session ? await humanById(session) : null;
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a className="wordmark" href="/inbox">EVALYN<i>·</i>PANEL</a>
          {human && (
            <nav className="topnav">
              <a href="/inbox">Inbox</a>
              <a href="/dashboard">Dashboard</a>
              {human.roles.some((r) => r.seat === "head" || r.seat === "ceo") && (
                <>
                  <a href="/audit">Ledger</a>
                  <a href="/admin">Admin</a>
                </>
              )}
            </nav>
          )}
          <span className="spacer" />
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

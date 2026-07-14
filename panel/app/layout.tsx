import "./globals.css";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { humanById } from "@/lib/org";

export const metadata = { title: "Evalyn Control Panel" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  const human = session ? await humanById(session) : null;
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a className="wordmark" href="/inbox">EVALYN<i>·</i>PANEL</a>
          <span className="spacer" />
          {human && (
            <>
              <span className="chip avail" title="Availability (toggle arrives with EX-205)">
                <span className="dot" /> {human.availability}
              </span>
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

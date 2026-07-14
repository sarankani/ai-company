import { humanByEmail } from "@/lib/org";
import { makeLoginToken, deliverLink, safeReturnTo } from "@/lib/auth";
import { redirect } from "next/navigation";

// Magic-link sign-in: the email must match company/org/humans/ 1:1.
// Unknown emails get the same neutral message (no account enumeration).
async function requestLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const returnTo = safeReturnTo(formData.get("return")); // EX-206 M5
  const human = await humanByEmail(email);
  if (human) {
    const token = makeLoginToken(human.id, returnTo);
    const base = process.env.PANEL_BASE_URL || "http://localhost:3000";
    await deliverLink(human.email, `${base}/api/auth/verify?token=${token}`);
  }
  redirect(`/signin?sent=1&return=${encodeURIComponent(returnTo)}`);
}

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; return?: string; err?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main>
      <div className="card">
        <h1>Sign in</h1>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Enter your seat-holder email. If it matches the humans registry, a
          sign-in link is issued (valid 15 minutes; sessions last 7 days).
        </p>
        <form action={requestLink}>
          <input type="hidden" name="return" value={sp.return ?? "/inbox"} />
          <input type="email" name="email" placeholder="you@example.com" required aria-label="Email" />
          <button type="submit">Send sign-in link</button>
        </form>
        {sp.sent && (
          <p className="notice">
            If that email holds a seat, a link was issued. Without SMTP
            configured (dev mode) the link is printed in the server log.
          </p>
        )}
        {sp.err && <p className="notice err">That link is invalid or expired — request a new one.</p>}
      </div>
    </main>
  );
}

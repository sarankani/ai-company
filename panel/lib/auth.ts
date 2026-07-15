/**
 * Magic-link auth (Tech Spec §7, Design Brief §3): email must match a record
 * in company/org/humans/ 1:1 — no shared logins. Sessions are 7 days (locked
 * decision Q-3, issue #20). Tokens are HMAC-signed with SESSION_SECRET; no
 * database, nothing stored server-side (stateless client of the repo).
 *
 * Link delivery: SMTP env when configured (same variables as the SLA job);
 * otherwise the link is logged to the server console — dev mode only, the
 * sign-in page says so honestly.
 */
import { createHmac, timingSafeEqual } from "crypto";

const LINK_TTL_S = 15 * 60; // magic link valid 15 min
export const SESSION_TTL_S = 7 * 24 * 3600; // Q-3: 7 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function pack(obj: Record<string, string | number>): string {
  const payload = Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function unpack(token: string): Record<string, string | number> | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expect = sign(payload);
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

export function makeLoginToken(humanId: string, returnTo: string): string {
  return pack({ h: humanId, r: returnTo, k: "login", exp: Math.floor(Date.now() / 1000) + LINK_TTL_S });
}

/** Only same-origin absolute paths are safe redirect targets (EX-206 M5):
 * a single leading slash, not "//host" (protocol-relative) and no scheme. */
export function safeReturnTo(v: unknown): string {
  const s = String(v ?? "");
  return /^\/(?!\/)/.test(s) ? s : "/inbox";
}

export function verifyLoginToken(token: string): { humanId: string; returnTo: string } | null {
  const p = unpack(token);
  if (!p || p.k !== "login" || Number(p.exp) < Date.now() / 1000) return null;
  return { humanId: String(p.h), returnTo: safeReturnTo(p.r) };
}

export function makeSession(humanId: string): string {
  return pack({ h: humanId, k: "session", exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S });
}

export function verifySession(cookie: string | undefined): string | null {
  if (!cookie) return null;
  const p = unpack(cookie);
  if (!p || p.k !== "session" || Number(p.exp) < Date.now() / 1000) return null;
  return String(p.h);
}

/** Canonical base URL for magic links. Prefer an explicit PANEL_BASE_URL
 * (set this for a custom domain); otherwise fall back to Vercel's stable
 * production domain so email links resolve without extra config; else dev. */
export function panelBaseUrl(): string {
  if (process.env.PANEL_BASE_URL) return process.env.PANEL_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export async function deliverLink(email: string, url: string): Promise<"sent" | "logged"> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    // Dev only: the link is a 15-min bearer credential — never log it once
    // SMTP is configured (EX-206 H2). Gate even the dev log behind a flag so
    // it can't leak in a misconfigured non-SMTP prod.
    if (process.env.AUTH_DEV_LOG === "1" || process.env.NODE_ENV !== "production") {
      console.log(`[auth] magic link for ${email}: ${url}`);
    } else {
      console.warn(`[auth] no SMTP configured and AUTH_DEV_LOG unset — link for ${email} NOT delivered`);
    }
    return "logged";
  }
  // Production SMTP delivery (EX-207). Never log the URL — that was the H2
  // leak; log only that a link was issued. Import lazily so the dev/no-SMTP
  // path never loads the mailer.
  const { createTransport } = await import("nodemailer");
  const transport = createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "1", // true for 465, false for 587/STARTTLS
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  });
  const info = await transport.sendMail({
    from: process.env.NOTIFY_FROM ?? "Evalyn Panel <no-reply@evalyn.in>",
    to: email,
    subject: "Your Evalyn Control Panel sign-in link",
    text: `Sign in to the Evalyn Control Panel:\n\n${url}\n\nThis link is valid for 15 minutes and can be used to open your approval inbox. If you didn't request it, ignore this email.`,
  });
  // "sendMail resolved" only means the SMTP server accepted the envelope — a
  // recipient can still be rejected. Surface that instead of claiming success,
  // and log the messageId + server response so delivery is traceable (never
  // the URL — EX-206 H2).
  if (info.rejected?.length) {
    console.error(`[auth] SMTP REJECTED ${email} — response: ${info.response}`);
    return "logged";
  }
  console.log(`[auth] sign-in link accepted for ${email} (id=${info.messageId}, response=${info.response})`);
  return "sent";
}

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

export function verifyLoginToken(token: string): { humanId: string; returnTo: string } | null {
  const p = unpack(token);
  if (!p || p.k !== "login" || Number(p.exp) < Date.now() / 1000) return null;
  return { humanId: String(p.h), returnTo: String(p.r || "/inbox") };
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

export async function deliverLink(email: string, url: string): Promise<"sent" | "logged"> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`[auth] magic link for ${email}: ${url}`);
    return "logged";
  }
  // Minimal SMTP submission without extra dependencies is out of MVP scope;
  // production delivery is wired in EX-207 alongside the deploy secrets.
  console.log(`[auth] SMTP configured — delivery wiring lands with EX-207. Link for ${email}: ${url}`);
  return "logged";
}

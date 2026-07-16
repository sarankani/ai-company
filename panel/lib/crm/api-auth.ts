/**
 * CRM API auth (Tech Spec 002 §4.2): one guard for /api/crm/* routes.
 * Accepts either a signed session cookie (human — RBAC matrix applies in the
 * store) or `Authorization: Bearer $CRM_AGENT_TOKEN` + `X-Agent-Id` (AI
 * employee — acts as editor; the gates protect critical transitions).
 * Token compare is constant-time, same discipline as lib/auth.ts.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { verifySession } from "../auth";
import { humanById } from "../org";
import { ConflictError } from "../write";
import { CrmError } from "./lifecycles";
import type { CrmActor } from "./store";

export class CrmAuthError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function requireCrmActor(req: NextRequest): Promise<CrmActor> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    const expect = process.env.CRM_AGENT_TOKEN;
    if (!expect) throw new CrmAuthError(401, "agent access is not configured (CRM_AGENT_TOKEN unset)");
    const a = Buffer.from(token), b = Buffer.from(expect);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new CrmAuthError(401, "invalid bearer token");
    const agent = (req.headers.get("x-agent-id") ?? "").trim();
    if (!/^[a-z0-9-]{1,40}$/.test(agent)) throw new CrmAuthError(400, "X-Agent-Id header required (kebab-case employee id)");
    return { kind: "agent", id: agent };
  }
  const session = verifySession(req.cookies.get("evalyn_session")?.value);
  const me = session ? await humanById(session) : null;
  if (!me) throw new CrmAuthError(401, "sign in or present a bearer token");
  return { kind: "human", human: me };
}

/** Route wrapper: auth + typed error → JSON status mapping. */
export function crmRoute<C>(
  fn: (req: NextRequest, actor: CrmActor, ctx: C) => Promise<NextResponse>,
): (req: NextRequest, ctx: C) => Promise<NextResponse> {
  return async (req, ctx) => {
    try {
      const actor = await requireCrmActor(req);
      return await fn(req, actor, ctx);
    } catch (e) {
      if (e instanceof CrmAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof CrmError) return NextResponse.json({ error: e.message }, { status: 400 });
      if (e instanceof ConflictError) return NextResponse.json({ error: e.message }, { status: 409 });
      throw e;
    }
  };
}

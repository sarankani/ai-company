/** Session → CRM actor resolution for the /crm pages and server actions. */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "../auth";
import { humanById, type Human } from "../org";
import type { CrmActor } from "./store";

export async function requireCrmHuman(returnTo: string): Promise<Human> {
  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  const me = session ? await humanById(session) : null;
  if (!me) redirect(`/signin?return=${encodeURIComponent(returnTo)}`);
  return me;
}

export function humanActor(h: Human): CrmActor {
  return { kind: "human", human: h };
}

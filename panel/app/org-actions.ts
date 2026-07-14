"use server";

/**
 * Availability (EX-205, PRD US-9): one tap → one commit to your own humans
 * file. Routing (SLA scan + new-record assignment) reads availability from
 * the registry, so the change is effective from the next scan (≤15 min).
 * Comment-preserving raw edit — humans files are hand-annotated.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { revalidate, repoSource, parseRecord } from "@/lib/records";
import { revalidateOrg } from "@/lib/org";
import { setAvailabilityRaw, DecisionError } from "@/lib/engine";
import { repoWriter, ConflictError } from "@/lib/write";

export async function humanFilePath(id: string): Promise<string> {
  const src = repoSource();
  for (const name of await src.listDir("company/org/humans")) {
    const p = `company/org/humans/${name}`;
    if (String(parseRecord(await src.readFile(p)).data.id) === id) return p;
  }
  throw new DecisionError(`no humans file for ${id}`);
}

export async function setAvailabilityAction(form: FormData) {
  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  if (!session) redirect("/signin");
  const availability = String(form.get("availability")) as "available" | "busy" | "ooo";
  const oooUntil = String(form.get("ooo_until") ?? "").trim() || null;
  const returnTo = String(form.get("return") ?? "/inbox");
  if (!["available", "busy", "ooo"].includes(availability)) redirect(returnTo);

  const writer = repoWriter();
  const path = await humanFilePath(session);
  const raw = await writer.readFresh(path);
  const updated = setAvailabilityRaw(raw, availability, oooUntil);
  try {
    await writer.commit(
      [{ path, content: updated }],
      `org: ${session} availability → ${availability}${availability === "ooo" && oooUntil ? ` until ${oooUntil}` : ""}\n\nDecided-by: ${session}`,
      {},
    );
  } catch (e) {
    if (!(e instanceof ConflictError)) throw e; // conflict: someone else just edited — reload shows truth
  }
  revalidate();
  revalidateOrg();
  redirect(returnTo);
}

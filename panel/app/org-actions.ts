"use server";

/**
 * Availability (EX-205, PRD US-9 + EX-301): one tap → one commit to your own
 * humans file. Going busy/ooo ALSO reassigns your pending items immediately
 * (the panel counterpart of the cron scan's unavailability skip) so nothing
 * is parked on you until the next ≤15-min scan. Comment-preserving raw edit —
 * humans files are hand-annotated.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { revalidate, repoSource, parseRecord, type RecordData } from "@/lib/records";
import { loadHumans, revalidateOrg } from "@/lib/org";
import { setAvailabilityRaw, skipUnavailableAssignee, dumpChecked, rebuildRegistryText, DecisionError } from "@/lib/engine";
import { repoWriter, ConflictError, type CommitFile } from "@/lib/write";

const REGISTRY = "company/registry.md";

async function allRecordsFresh(): Promise<{ path: string; data: RecordData; body: string }[]> {
  const src = repoSource();
  const out: { path: string; data: RecordData; body: string }[] = [];
  for (const dir of ["company/approvals", "company/questions"]) {
    for (const name of await src.listDir(dir)) {
      if (name === "TEMPLATE.md") continue;
      const p = `${dir}/${name}`;
      const { data, body } = parseRecord(await src.readFile(p));
      out.push({ path: p, data, body });
    }
  }
  return out;
}

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
  const files: CommitFile[] = [{ path, content: updated }];

  // EX-301: going unavailable reassigns my pending items now, not at next scan.
  let reassigned = 0;
  if (availability !== "available") {
    // humans list must reflect my new (unavailable) status so the skip picks
    // the next AVAILABLE seat and never lands back on me.
    const humans = (await loadHumans()).map((h) => (h.id === session ? { ...h, availability } : h));
    const records = await allRecordsFresh();
    let anyChanged = false;
    for (const r of records) {
      if (skipUnavailableAssignee(r.data, session, humans)) {
        files.push({ path: r.path, content: dumpChecked(r.data, r.body) });
        anyChanged = true;
        reassigned++;
      }
    }
    if (anyChanged) {
      const registryText = rebuildRegistryText(
        await writer.readFresh(REGISTRY),
        records.map((r) => ({ data: r.data })),
      );
      files.push({ path: REGISTRY, content: registryText });
    }
  }

  try {
    const skip = reassigned ? ` · reassigned ${reassigned} pending item${reassigned > 1 ? "s" : ""}` : "";
    await writer.commit(
      files,
      `org: ${session} availability → ${availability}${availability === "ooo" && oooUntil ? ` until ${oooUntil}` : ""}${skip}\n\nDecided-by: ${session}`,
      {},
    );
  } catch (e) {
    if (!(e instanceof ConflictError)) throw e; // conflict: someone else just edited — reload shows truth
  }
  revalidate();
  revalidateOrg();
  redirect(returnTo);
}

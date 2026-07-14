"use server";

/**
 * Seat changes (EX-205, Plan 001 risk #5): NEVER a direct edit.
 * Two-step: a Head proposes → a people-gate approval record (dual: dept +
 * ceo stamps) → decided on the normal decide surface → the approved change
 * is APPLIED through the exactly-once claim/complete path: one commit moves
 * the role line between humans files, stamps the execution, and rebuilds
 * the registry. History = the record + git.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { parseRecord, repoSource, revalidate, type RecordData } from "@/lib/records";
import { loadHumans, humanById, revalidateOrg, isHeadOf, isCeoSeat, type Human } from "@/lib/org";
import {
  createRecord, claimExecution, completeExecution, dumpChecked, contentSha,
  removeRoleRaw, addRoleRaw, rebuildRegistryText, parseSeatChange,
  DecisionError, CHAIN,
} from "@/lib/engine";
import { repoWriter, ConflictError } from "@/lib/write";
import { humanFilePath } from "../org-actions";

const REGISTRY = "company/registry.md";

async function requireHuman(): Promise<Human> {
  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  const me = session ? await humanById(session) : null;
  if (!me) redirect("/signin?return=/admin");
  return me;
}

async function allRecords(): Promise<{ path: string; data: RecordData }[]> {
  const src = repoSource();
  const out: { path: string; data: RecordData }[] = [];
  for (const dir of ["company/approvals", "company/questions"]) {
    for (const name of await src.listDir(dir)) {
      if (name === "TEMPLATE.md") continue;
      const p = `${dir}/${name}`;
      out.push({ path: p, data: parseRecord(await src.readFile(p)).data });
    }
  }
  return out;
}

export async function proposeSeatChangeAction(form: FormData) {
  const me = await requireHuman();
  const department = String(form.get("department") ?? "");
  const seat = String(form.get("seat") ?? "");
  const to = String(form.get("to") ?? "");
  const why = String(form.get("why") ?? "").trim();
  let dest = "/admin?proposed=1";
  try {
    if (!CHAIN.includes(seat)) throw new DecisionError("seat must be approver/deputy/head");
    if (!isHeadOf(me, department)) throw new DecisionError(`only the ${department} Head (or CEO) proposes seat changes`);
    const humans = await loadHumans();
    const toHuman = humans.find((h) => h.id === to);
    if (!toHuman) throw new DecisionError("unknown human");
    const holder = humans.find((h) => h.roles.some((r) => r.department === department && r.seat === seat));
    if (!holder) throw new DecisionError(`no current ${department} ${seat} found`);
    if (holder.id === to) throw new DecisionError(`${to} already holds ${department} ${seat}`);

    const writer = repoWriter();
    const artifact = await humanFilePath(holder.id);
    const records = await allRecords();
    const { id, data, body } = createRecord({
      type: "approval", gate: "people", priority: "P1", requestedBy: me.id,
      artifact, artifactShaNow: contentSha(await writer.readFresh(artifact)),
      action: `Change seat: ${department} ${seat} from ${holder.id} to ${to}`,
      links: "org seat change (Plan 001 risk #5)",
      summary:
        `Seat change proposed by **${me.id}** (${department} Head path)` +
        (why ? ` — ${why}` : "") +
        `. Dual approval required (people gate): a people-finance seat stamp AND a ceo stamp. ` +
        `On approval, apply from /admin — the panel moves the role in one exactly-once commit.`,
      bodyExtra: `## Proposed change\n\n- change: seat\n- department: ${department}\n- seat: ${seat}\n- from: ${holder.id}\n- to: ${to}`,
      humans,
      existingIds: records.map((r) => String(r.data.id)),
    });
    const path = `company/approvals/${id}.md`;
    const recordText = dumpChecked(data, body);
    const registryText = rebuildRegistryText(
      await writer.readFresh(REGISTRY),
      [...records, { data }],
    );
    await writer.commit(
      [{ path, content: recordText }, { path: REGISTRY, content: registryText }],
      `${id}: seat change proposed via panel by ${me.id}\n\nDecided-by: ${me.id}`,
      {},
    );
    revalidate();
    dest = `/admin?proposed=${id}`;
  } catch (e) {
    if (e instanceof DecisionError || e instanceof ConflictError)
      dest = `/admin?err=${encodeURIComponent(e.message)}`;
    else throw e;
  }
  redirect(dest);
}

export async function applySeatChangeAction(form: FormData) {
  const me = await requireHuman();
  const id = String(form.get("id") ?? "");
  let dest = `/admin?applied=${id}`;
  try {
    if (!/^APR-\d{8}-\d{3}$/.test(id)) throw new DecisionError("bad record id");
    if (!isCeoSeat(me)) throw new DecisionError("only the ceo seat applies approved seat changes");
    const writer = repoWriter();
    const path = `company/approvals/${id}.md`;
    const raw = await writer.readFresh(path);
    const { data, body } = parseRecord(raw);
    const change = parseSeatChange(body);
    if (!change) throw new DecisionError("not a seat-change record");

    const fromPath = await humanFilePath(change.from);
    const toPath = await humanFilePath(change.to);
    const fromRaw = await writer.readFresh(fromPath);
    const toRaw = await writer.readFresh(toPath);

    // exactly-once: claim verifies state + artifact sha, complete stamps it —
    // all in the same commit as the role move itself.
    claimExecution(data, me.id, contentSha(fromRaw));
    const fromNew = removeRoleRaw(fromRaw, change.department, change.seat);
    const toNew = addRoleRaw(toRaw, change.department, change.seat);
    completeExecution(data, `seat ${change.department}/${change.seat} moved ${change.from} → ${change.to} via panel`);
    const recordText = dumpChecked(data, body);

    const records = await allRecords();
    const registryText = rebuildRegistryText(
      await writer.readFresh(REGISTRY),
      records.map((r) => (r.path === path ? { data } : r)),
    );
    await writer.commit(
      [
        { path, content: recordText },
        { path: fromPath, content: fromNew },
        { path: toPath, content: toNew },
        { path: REGISTRY, content: registryText },
      ],
      `${id}: seat change applied via panel by ${me.id}\n\nDecided-by: ${me.id}`,
      { [path]: contentSha(raw), [fromPath]: contentSha(fromRaw), [toPath]: contentSha(toRaw) },
    );
    revalidate();
    revalidateOrg();
  } catch (e) {
    if (e instanceof ConflictError) dest = `/admin?err=conflict`;
    else if (e instanceof DecisionError) dest = `/admin?err=${encodeURIComponent(e.message)}`;
    else throw e;
  }
  redirect(dest);
}

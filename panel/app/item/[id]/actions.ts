"use server";

/**
 * Decision server actions (EX-203). Every mutation:
 *   authenticate → authorize (server-side, per routing) → conflict-check
 *   against the exact content the form was rendered from → mutate via the
 *   engine port → rebuild registry → ONE commit with a Decided-by trailer
 *   → revalidate cache → redirect back with the outcome.
 * Errors never clobber: conflicts and refusals redirect with a code and the
 * page re-renders from fresh repo state.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { parseRecord, repoSource, revalidate, type RecordData } from "@/lib/records";
import { loadHumans, humanById, type Human } from "@/lib/org";
import {
  decide, delegate, followUp, dumpChecked, contentSha, canView,
  rebuildRegistryText, DecisionError,
} from "@/lib/engine";
import { repoWriter, ConflictError } from "@/lib/write";

const ID_RE = /^(APR|QST)-\d{8}-\d{3}$/;
const REGISTRY = "company/registry.md";

function recordPath(id: string): string {
  if (!ID_RE.test(id)) throw new DecisionError("bad record id");
  return `company/${id.startsWith("QST") ? "questions" : "approvals"}/${id}.md`;
}

async function requireHuman(): Promise<Human> {
  const session = verifySession((await cookies()).get("evalyn_session")?.value);
  const me = session ? await humanById(session) : null;
  if (!me) redirect("/signin?return=/inbox");
  return me;
}

/** All records, read fresh (uncached), for the registry rebuild. */
async function allRecordsFresh(): Promise<{ path: string; data: RecordData }[]> {
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

type Mutate = (data: RecordData, body: string, me: Human, form: FormData) =>
  Promise<{ data: RecordData; body: string; result: string; trailer: string; verb: string }>;

/** Shared skeleton: fresh read → conflict check → mutate → commit → redirect. */
async function act(form: FormData, mutate: Mutate): Promise<never> {
  const me = await requireHuman();
  const id = String(form.get("id") ?? "");
  const baseSha = String(form.get("baseSha") ?? "");
  let dest: string;
  try {
    const path = recordPath(id);
    const writer = repoWriter();
    const raw = await writer.readFresh(path);
    if (contentSha(raw) !== baseSha) throw new ConflictError();
    const { data, body } = parseRecord(raw);
    if (!canView(me, data)) throw new DecisionError("this item belongs to the People & Finance seat");

    const m = await mutate(data, body, me, form);
    const recordText = dumpChecked(m.data, m.body);

    const records = await allRecordsFresh();
    const registryRaw = await writer.readFresh(REGISTRY);
    const registryText = rebuildRegistryText(
      registryRaw,
      records.map((r) => (r.path === path ? { data: m.data } : { data: r.data })),
    );

    await writer.commit(
      [{ path, content: recordText }, { path: REGISTRY, content: registryText }],
      `${id}: ${m.verb} via panel by ${me.id}\n\n${m.trailer}: ${me.id}`,
      { [path]: baseSha },
    );
    revalidate();
    dest = `/item/${id}?${m.result}`;
  } catch (e) {
    if (e instanceof ConflictError) dest = `/item/${id}?err=conflict`;
    else if (e instanceof DecisionError) dest = `/item/${id}?err=${encodeURIComponent(e.message)}`;
    else throw e;
  }
  redirect(dest);
}

export async function decideAction(form: FormData) {
  await act(form, async (data, body, me, f) => {
    const outcome = String(f.get("outcome")) as "approved" | "rejected" | "answered";
    if (!["approved", "rejected", "answered"].includes(outcome))
      throw new DecisionError("bad outcome");
    const reason = String(f.get("reason") ?? "").trim();
    const conditions = String(f.get("conditions") ?? "").trim();

    // approval-time artifact hash — same is-file-else-external rule as Python
    let artifactShaNow = "external";
    try {
      const ref = String(data.artifact ?? "");
      if (ref && !/^[a-z]+:\/\//.test(ref))
        artifactShaNow = contentSha(await repoSource().readFile(ref));
    } catch { /* not a repo file → external */ }

    const humans = await loadHumans();
    const r = decide(data, body, { by: me, outcome, reason, conditions, artifactShaNow, humans });
    return {
      data: r.data, body: r.body,
      result: r.done ? `done=${outcome}` : "stamped=1",
      trailer: "Decided-by", verb: r.done ? outcome : `${outcome} (first of two stamps)`,
    };
  });
}

export async function delegateAction(form: FormData) {
  await act(form, async (data, body, me, f) => {
    const toId = String(f.get("to") ?? "");
    const to = await humanById(toId);
    if (!to) throw new DecisionError("unknown delegate");
    const r = delegate(data, body, me, to);
    return {
      data: r.data, body: r.body, result: `delegated=${encodeURIComponent(to.id)}`,
      trailer: "Decided-by", verb: `delegated to ${to.id}`,
    };
  });
}

export async function followUpAction(form: FormData) {
  await act(form, async (data, body, me, f) => {
    const text = String(f.get("text") ?? "").trim();
    if (!text) throw new DecisionError("a follow-up needs a question");
    return {
      data, body: followUp(body, me, text), result: "asked=1",
      trailer: "Asked-by", verb: "follow-up question",
    };
  });
}

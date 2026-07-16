"use server";

/**
 * CRM write actions (EX-704/706): thin form adapters over lib/crm/store.ts —
 * RBAC, lifecycle validation, activity logging, and notifications all live
 * there. Gated transitions hand off to lib/crm/gates.ts, which files a
 * git-native APR and parks the row. Errors surface via ?err= (admin pattern).
 */
import { redirect } from "next/navigation";
import { ConflictError } from "@/lib/write";
import { CrmError, isCrmType, lifecycleOf, type CrmType } from "@/lib/crm/lifecycles";
import {
  createCrmRecord, updateCrmRecord, transitionCrmRecord, addCrmComment, addCrmLink,
  markCrmNotificationsRead, type CrmFieldValues,
} from "@/lib/crm/store";
import { requestGatedTransition } from "@/lib/crm/gates";
import { requireCrmHuman, humanActor } from "@/lib/crm/session";

function fieldsFrom(form: FormData, type: CrmType): CrmFieldValues {
  const out: CrmFieldValues = {};
  for (const f of lifecycleOf(type).fields) {
    const v = form.get(`field:${f.key}`);
    if (v !== null) out[f.key] = String(v);
  }
  return out;
}

function requireType(form: FormData): CrmType {
  const type = String(form.get("type") ?? "");
  if (!isCrmType(type)) throw new CrmError(`unknown record type '${type}'`);
  return type;
}

async function run(returnTo: string, fn: () => Promise<string>): Promise<never> {
  let dest: string;
  try {
    dest = await fn();
  } catch (e) {
    if (e instanceof CrmError || e instanceof ConflictError) {
      const sep = returnTo.includes("?") ? "&" : "?";
      dest = `${returnTo}${sep}err=${encodeURIComponent(e.message)}`;
    } else throw e;
  }
  redirect(dest);
}

export async function createCrmAction(form: FormData) {
  const type = requireType(form);
  const me = await requireCrmHuman(`/crm/${type}`);
  await run(`/crm/${type}`, async () => {
    const row = await createCrmRecord(type, {
      title: String(form.get("title") ?? ""),
      summary: String(form.get("summary") ?? ""),
      owner: String(form.get("owner") ?? "") || undefined,
      accountId: String(form.get("account_id") ?? "") || null,
      fields: fieldsFrom(form, type),
    }, humanActor(me));
    return `/crm/${type}/${row.id}`;
  });
}

export async function updateCrmAction(form: FormData) {
  const type = requireType(form);
  const id = String(form.get("id") ?? "");
  const me = await requireCrmHuman(`/crm/${type}/${id}`);
  await run(`/crm/${type}/${id}`, async () => {
    await updateCrmRecord(id, {
      title: String(form.get("title") ?? ""),
      summary: String(form.get("summary") ?? ""),
      owner: String(form.get("owner") ?? ""),
      accountId: String(form.get("account_id") ?? "") || null,
      fields: fieldsFrom(form, type),
    }, humanActor(me));
    return `/crm/${type}/${id}?saved=1`;
  });
}

export async function transitionCrmAction(form: FormData) {
  const type = requireType(form);
  const id = String(form.get("id") ?? "");
  const to = String(form.get("to") ?? "");
  const me = await requireCrmHuman(`/crm/${type}/${id}`);
  await run(`/crm/${type}/${id}`, async () => {
    const result = await transitionCrmRecord(id, to, humanActor(me));
    if (result.applied) return `/crm/${type}/${id}?moved=${encodeURIComponent(to)}`;
    // gated: file the APR and park the row (EX-706)
    const { aprId } = await requestGatedTransition(result.record, to, humanActor(me));
    return `/crm/${type}/${id}?gate=${aprId}`;
  });
}

export async function commentCrmAction(form: FormData) {
  const type = requireType(form);
  const id = String(form.get("id") ?? "");
  const me = await requireCrmHuman(`/crm/${type}/${id}`);
  await run(`/crm/${type}/${id}`, async () => {
    await addCrmComment(id, String(form.get("text") ?? ""), humanActor(me));
    return `/crm/${type}/${id}`;
  });
}

export async function linkCrmAction(form: FormData) {
  const type = requireType(form);
  const id = String(form.get("id") ?? "");
  const me = await requireCrmHuman(`/crm/${type}/${id}`);
  await run(`/crm/${type}/${id}`, async () => {
    await addCrmLink(id, String(form.get("rel") ?? ""), String(form.get("to") ?? ""), humanActor(me));
    return `/crm/${type}/${id}`;
  });
}

export async function markNotificationsReadAction(form: FormData) {
  const me = await requireCrmHuman("/crm");
  await markCrmNotificationsRead(me.id);
  redirect(String(form.get("return") ?? "/crm"));
}

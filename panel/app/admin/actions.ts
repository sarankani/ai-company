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
import { loadHumans, humanById, loadDepartments, revalidateOrg, isHeadOf, isCeoSeat, type Human } from "@/lib/org";
import {
  createRecord, claimExecution, completeExecution, dumpChecked, contentSha,
  removeRoleRaw, addRoleRaw, rebuildRegistryText, parseSeatChange, parseAddMember,
  dumpRecord, DecisionError, CHAIN,
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
    // EX-206 L8: department must be a real one before it flows into the
    // role-edit regex builder — no metacharacters, no unknown targets.
    const departments = await loadDepartments();
    if (!departments.some((d) => d.id === department)) throw new DecisionError("unknown department");
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

// ---------- add member (EX-707): humans-file creation is people-gated ----------

const GRANT_SEATS = new Set(["crm-viewer", "crm-editor"]);

export async function proposeAddMemberAction(form: FormData) {
  const me = await requireHuman();
  const id = String(form.get("id") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const title = String(form.get("title") ?? "").trim();
  let dest = "/admin";
  try {
    if (!me.roles.some((r) => r.seat === "head" || r.seat === "ceo"))
      throw new DecisionError("only a Head or the CEO proposes new members");
    if (!/^[a-z0-9][a-z0-9-]{1,29}$/.test(id)) throw new DecisionError("id must be kebab-case, 2-30 chars");
    if (!name) throw new DecisionError("name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DecisionError("valid email is required");

    const departments = await loadDepartments();
    const grants: { department: string; seat: string }[] = [];
    for (const d of departments) {
      const seat = String(form.get(`grant:${d.id}`) ?? "");
      if (!seat) continue;
      if (!GRANT_SEATS.has(seat)) throw new DecisionError(`bad grant for ${d.id}`);
      grants.push({ department: d.id, seat });
    }
    if (!grants.length) throw new DecisionError("pick at least one department grant");

    const humans = await loadHumans();
    if (humans.some((h) => h.id === id)) throw new DecisionError(`id '${id}' is taken`);
    if (humans.some((h) => h.email.toLowerCase() === email)) throw new DecisionError(`email '${email}' is already registered`);

    const writer = repoWriter();
    const records = await allRecords();
    const grantText = grants.map((g) => `${g.department}:${g.seat}`).join(", ");
    const { id: aprId, data, body } = createRecord({
      type: "approval", gate: "people", priority: "P1", requestedBy: me.id,
      artifact: `company/org/humans/${id}.md`, artifactShaNow: "external",
      action: `Add member ${id} (${email}) with access grants: ${grantText}`,
      links: "member RBAC (Tech Spec 002 §4.1)",
      summary:
        `New member proposed by **${me.id}**. Access grants only — no approval authority ` +
        `(crm-* seats never decide gates). Dual approval required (people gate); ` +
        `on approval, the CEO applies from /admin — one commit creates the humans file.`,
      bodyExtra:
        `## Proposed change\n\n- change: add-member\n- id: ${id}\n- name: ${name}\n- email: ${email}\n- title: ${title || "Member"}\n` +
        grants.map((g) => `- grant: ${g.department}:${g.seat}`).join("\n"),
      humans,
      existingIds: records.map((r) => String(r.data.id)),
    });
    const path = `company/approvals/${aprId}.md`;
    const registryText = rebuildRegistryText(
      await writer.readFresh(REGISTRY),
      [...records, { data }],
    );
    await writer.commit(
      [{ path, content: dumpChecked(data, body) }, { path: REGISTRY, content: registryText }],
      `${aprId}: add-member ${id} proposed via panel by ${me.id}\n\nDecided-by: ${me.id}`,
      {},
    );
    revalidate();
    dest = `/admin?proposed=${aprId}`;
  } catch (e) {
    if (e instanceof DecisionError || e instanceof ConflictError)
      dest = `/admin?err=${encodeURIComponent(e.message)}`;
    else throw e;
  }
  redirect(dest);
}

export async function applyAddMemberAction(form: FormData) {
  const me = await requireHuman();
  const id = String(form.get("id") ?? "");
  let dest = `/admin?applied=${id}`;
  try {
    if (!/^APR-\d{8}-\d{3}$/.test(id)) throw new DecisionError("bad record id");
    if (!isCeoSeat(me)) throw new DecisionError("only the ceo seat applies approved member additions");
    const writer = repoWriter();
    const path = `company/approvals/${id}.md`;
    const raw = await writer.readFresh(path);
    const { data, body } = parseRecord(raw);
    const member = parseAddMember(body);
    if (!member) throw new DecisionError("not an add-member record");

    const humans = await loadHumans();
    if (humans.some((h) => h.id === member.id || h.email.toLowerCase() === member.email.toLowerCase()))
      throw new DecisionError(`'${member.id}' already exists — withdraw this record`);

    // exactly-once: claim + complete in the same commit that creates the file
    claimExecution(data, me.id, "external");
    const humanPath = `company/org/humans/${member.id}.md`;
    const humanText = dumpRecord(
      {
        id: member.id, name: member.name, email: member.email,
        title: member.title || "Member", availability: "available", ooo_until: null,
        roles: member.grants.map((g) => ({ department: g.department, seat: g.seat })),
      },
      `\nAdded via the panel add-member flow (${id}). Access grants only — no approval seats.\n`,
    );
    parseRecord(humanText); // roundtrip guard before it ever lands in org config
    completeExecution(data, `member ${member.id} created with ${member.grants.length} grant(s) via panel`);

    const records = await allRecords();
    const registryText = rebuildRegistryText(
      await writer.readFresh(REGISTRY),
      records.map((r) => (r.path === path ? { data } : r)),
    );
    await writer.commit(
      [
        { path, content: dumpChecked(data, body) },
        { path: humanPath, content: humanText },
        { path: REGISTRY, content: registryText },
      ],
      `${id}: member ${member.id} added via panel by ${me.id}\n\nDecided-by: ${me.id}`,
      { [path]: contentSha(raw) },
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

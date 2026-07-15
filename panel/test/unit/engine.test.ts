import { describe, it, expect } from "vitest";
import {
  dumpRecord, dumpChecked, contentSha, nowIso,
  decide, delegate, followUp, slaDueFrom, resolveAssignee,
  skipUnavailableAssignee, nextId, createRecord,
  claimExecution, completeExecution,
  setAvailabilityRaw, removeRoleRaw, addRoleRaw,
  parseSeatChange, rebuildRegistryText, canView,
  GATE_DEPT, DecisionError,
} from "../../lib/engine";
import { parseRecord } from "../../lib/records";
import type { Human } from "../../lib/org";

// ---------- fixtures ----------

const human = (
  id: string,
  roles: [string, string][],
  availability: Human["availability"] = "available",
): Human => ({
  id, name: id, email: `${id}@evalyn.local`, title: "", availability,
  roles: roles.map(([department, seat]) => ({ department, seat })),
});

const approver = human("saravanan-p", [["engineering", "approver"]]);
const ceo = human("saran", [
  ["leadership", "ceo"], ["engineering", "deputy"], ["engineering", "head"],
  ["people-finance", "approver"],
]);
const HUMANS = [approver, ceo];
const AT = "2026-07-15T10:00:00Z";

const mk = (gate = "merge-deploy", humans = HUMANS) =>
  createRecord({
    type: gate === "people" ? "approval" : "approval",
    gate, priority: "P1", requestedBy: "developer",
    artifact: "docs/x.md", artifactShaNow: "sha-abc", action: "do the thing",
    summary: "s", humans, existingIds: [], at: AT,
  });

// ---------- dump / parse ----------

describe("dump", () => {
  it("roundtrips a record through parse", () => {
    const { data, body } = mk();
    const text = dumpRecord(data, body);
    const back = parseRecord(text);
    expect(back.data.id).toBe(data.id);
    expect(dumpRecord(back.data, back.body)).toBe(text);
  });

  it("quotes values the parser would otherwise mis-read; empty string is quoted", () => {
    const text = dumpRecord({ a: "x: y", b: "", c: "trailing " }, "\n## Summary\n");
    expect(text).toContain('a: "x: y"');
    expect(text).toContain('b: ""'); // bare empty means 'start of list' — must quote
    expect(text).toContain('c: "trailing "');
  });

  it("dumpChecked throws if dump/parse is not stable", () => {
    expect(() => dumpChecked(mk().data, mk().body)).not.toThrow();
  });
});

describe("contentSha", () => {
  it("is stable across a BOM and CRLF line endings", () => {
    const base = "state: pending\nx: 1\n";
    expect(contentSha("﻿" + base.replace(/\n/g, "\r\n"))).toBe(contentSha(base));
  });
  it("differs for different content", () => {
    expect(contentSha("a")).not.toBe(contentSha("b"));
  });
});

describe("nowIso", () => {
  it("has no milliseconds and ends in Z", () => {
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});

// ---------- decide ----------

describe("decide", () => {
  it("rejects a non-pending record", () => {
    const { data, body } = mk();
    data.state = "approved";
    expect(() => decide(data, body, { by: approver, outcome: "approved", artifactShaNow: "x", humans: HUMANS, at: AT }))
      .toThrow(DecisionError);
  });

  it("rejects an unauthorized decider", () => {
    const outsider = human("nobody", [["marketing-support", "approver"]]);
    const { data, body } = mk();
    expect(() => decide(data, body, { by: outsider, outcome: "approved", artifactShaNow: "x", humans: HUMANS, at: AT }))
      .toThrow(/no seat in engineering/);
  });

  it("requires a reason to reject", () => {
    const { data, body } = mk();
    expect(() => decide(data, body, { by: approver, outcome: "rejected", artifactShaNow: "x", humans: HUMANS, at: AT }))
      .toThrow(/reject requires a reason/);
  });

  it("won't answer an approval or approve a question", () => {
    const a = mk();
    expect(() => decide(a.data, a.body, { by: approver, outcome: "answered", artifactShaNow: "x", humans: HUMANS, at: AT }))
      .toThrow(/approve\/reject/);
    const q = createRecord({ type: "question", gate: "merge-deploy", priority: "P2", requestedBy: "developer",
      artifact: "d", artifactShaNow: "x", action: "which?", summary: "s", humans: HUMANS, existingIds: [], at: AT });
    expect(() => decide(q.data, q.body, { by: approver, outcome: "approved", artifactShaNow: "x", humans: HUMANS, at: AT }))
      .toThrow(/answer/);
  });

  it("single-approves a merge-deploy record in one stamp", () => {
    const { data, body } = mk();
    const r = decide(data, body, { by: approver, outcome: "approved", artifactShaNow: "sha-now", humans: HUMANS, at: AT });
    expect(r.done).toBe(true);
    expect(r.data.state).toBe("approved");
    expect(r.data.approved_artifact_sha).toBe("sha-now");
    expect((r.data.decision as any).by).toBe("saravanan-p");
    expect(r.body).toContain("**approved** by saravanan-p");
  });

  it("dual people gate at n=1: the ceo (both seats) still needs two stamps", () => {
    const { data, body } = mk("people");
    const r1 = decide(data, body, { by: ceo, outcome: "approved", artifactShaNow: "x", humans: HUMANS, at: AT });
    expect(r1.done).toBe(false); // one stamp is never enough (0→1 of 2)
    expect(r1.data.state).toBe("pending");
    const r2 = decide(r1.data, r1.body, { by: ceo, outcome: "approved", artifactShaNow: "x", humans: HUMANS, at: AT });
    expect(r2.done).toBe(true); // same human co-signs at n=1 (documented — EX-008 note b)
    expect(r2.data.state).toBe("approved");
  });

  it("dual people gate needs distinct stampers once two are qualified", () => {
    const pfApprover = human("pf", [["people-finance", "approver"]]);
    const ceoOnly = human("boss", [["leadership", "ceo"]]);
    const humans = [pfApprover, ceoOnly];
    const { data, body } = mk("people", humans);
    // pf stamp alone: has dept, no ceo → not done
    const r1 = decide(data, body, { by: pfApprover, outcome: "approved", artifactShaNow: "x", humans, at: AT });
    expect(r1.done).toBe(false);
    expect(r1.data.state).toBe("pending");
    // ceo stamp: now dept + ceo from DISTINCT humans → done
    const r2 = decide(r1.data, r1.body, { by: ceoOnly, outcome: "approved", artifactShaNow: "x", humans, at: AT });
    expect(r2.done).toBe(true);
    expect(r2.data.state).toBe("approved");
  });
});

// ---------- delegate / followUp ----------

describe("delegate", () => {
  it("moves the assignee and appends a manual-delegate hop", () => {
    const { data, body } = mk();
    const r = delegate(data, body, approver, ceo, AT);
    expect(r.data.assignee).toBe("saran");
    const hops = r.data.hops as any[];
    expect(hops.at(-1)).toMatchObject({ to: "saran", reason: "manual-delegate" });
  });
  it("refuses to delegate to an unauthorized target", () => {
    const outsider = human("x", [["operations", "approver"]]);
    const { data, body } = mk();
    expect(() => delegate(data, body, approver, outsider, AT)).toThrow(/not authorized/);
  });
});

describe("followUp", () => {
  it("appends a dated line to the Thread and keeps the body", () => {
    const { body } = mk();
    const out = followUp(body, approver, "is it rebased?", AT);
    expect(out).toContain("## Thread");
    expect(out).toMatch(/2026-07-15 · saravanan-p \(via panel\): is it rebased\?/);
  });
});

// ---------- SLA math ----------

describe("slaDueFrom", () => {
  it("P0 is wall-clock (+2h), ignoring weekends", () => {
    expect(slaDueFrom(new Date("2026-07-18T10:00:00Z"), "P0")).toBe("2026-07-18T12:00:00Z"); // Sat
  });
  it("P1 adds 24 business hours, skipping the weekend", () => {
    // Fri 10:00 + 24 business hours -> Mon 10:00
    expect(slaDueFrom(new Date("2026-07-17T10:00:00Z"), "P1")).toBe("2026-07-20T10:00:00Z");
  });
  it("throws on an unknown priority", () => {
    expect(() => slaDueFrom(new Date(AT), "P9")).toThrow(DecisionError);
  });
});

// ---------- routing ----------

describe("resolveAssignee", () => {
  it("assigns the available approver", () => {
    expect(resolveAssignee(HUMANS, "engineering").assignee).toBe("saravanan-p");
  });
  it("skips an unavailable approver to the deputy", () => {
    const busy = human("saravanan-p", [["engineering", "approver"]], "busy");
    expect(resolveAssignee([busy, ceo], "engineering").assignee).toBe("saran");
  });
  it("falls back to the ceo backstop when the chain is empty", () => {
    expect(resolveAssignee([ceo], "operations").assignee).toBe("saran");
  });
});

describe("skipUnavailableAssignee", () => {
  it("reassigns a pending item off a now-busy assignee, with a hop", () => {
    const { data } = mk();
    expect(data.assignee).toBe("saravanan-p");
    const busy = human("saravanan-p", [["engineering", "approver"]], "busy");
    const moved = skipUnavailableAssignee(data, "saravanan-p", [busy, ceo], AT);
    expect(moved).toBe(true);
    expect(data.assignee).toBe("saran");
    expect((data.hops as any[]).at(-1)).toMatchObject({ reason: "unavailable-skip" });
  });
  it("is a no-op when the human is not the assignee", () => {
    const { data } = mk();
    expect(skipUnavailableAssignee(data, "someone-else", HUMANS, AT)).toBe(false);
  });
});

// ---------- ids / creation ----------

describe("nextId", () => {
  it("increments per day and pads to 3 digits", () => {
    expect(nextId("approval", [], AT)).toBe("APR-20260715-001");
    expect(nextId("approval", ["APR-20260715-001", "APR-20260715-004"], AT)).toBe("APR-20260715-005");
    expect(nextId("question", [], AT)).toBe("QST-20260715-001");
  });
});

describe("createRecord", () => {
  it("routes the gate to its department, assigns, and stamps an SLA", () => {
    const { id, data, body } = mk();
    expect(id).toBe("APR-20260715-001");
    expect(data.department).toBe(GATE_DEPT["merge-deploy"]);
    expect(data.assignee).toBe("saravanan-p");
    expect(data.sla_due).toBe(slaDueFrom(new Date(AT), "P1"));
    expect(body).toContain("## Summary");
    expect(body).toContain("## Decision");
  });
  it("throws on an unknown gate", () => {
    expect(() => createRecord({ type: "approval", gate: "nope", priority: "P1", requestedBy: "d",
      artifact: "a", artifactShaNow: "x", action: "a", summary: "s", humans: HUMANS, existingIds: [], at: AT }))
      .toThrow(/unknown gate/);
  });
});

// ---------- execution (exactly-once) ----------

describe("execution", () => {
  const approved = () => {
    const { data, body } = mk();
    const r = decide(data, body, { by: approver, outcome: "approved", artifactShaNow: "sha-now", humans: HUMANS, at: AT });
    return r.data;
  };

  it("claims then completes exactly once", () => {
    const data = approved();
    claimExecution(data, "devops", "sha-now", AT);
    expect((data.execution as any).claimed_at).toBe(AT);
    completeExecution(data, "merged", AT);
    expect((data.execution as any).executed_at).toBe(AT);
    expect((data.execution as any).result).toBe("merged");
  });

  it("refuses a second claim and a second complete", () => {
    const data = approved();
    claimExecution(data, "devops", "sha-now", AT);
    expect(() => claimExecution(data, "other", "sha-now", AT)).toThrow(/already claimed/);
    completeExecution(data, "done", AT);
    expect(() => completeExecution(data, "again", AT)).toThrow(/already executed/);
  });

  it("blocks execution when the artifact changed after approval", () => {
    const data = approved();
    expect(() => claimExecution(data, "devops", "sha-DIFFERENT", AT)).toThrow(/artifact changed/);
  });

  it("won't claim a non-approved record", () => {
    const { data } = mk();
    expect(() => claimExecution(data, "devops", "x", AT)).toThrow(/not approved/);
  });
});

// ---------- org-file surgery (comment-preserving) ----------

const HUMAN_FILE = `---
id: saravanan-p
email: saravanan@vitetech.in
availability: available        # available | busy | ooo
ooo_until: null                # ISO date
roles:
  - {department: engineering, seat: approver}
created: 2026-07-13
---

# body
`;

describe("org-file edits", () => {
  it("sets availability and preserves the trailing comment", () => {
    const out = setAvailabilityRaw(HUMAN_FILE, "busy", null);
    expect(out).toMatch(/availability: busy\s+# available \| busy \| ooo/);
    expect(parseRecord(out).data.availability).toBe("busy");
  });
  it("writes ooo_until when going ooo", () => {
    const out = setAvailabilityRaw(HUMAN_FILE, "ooo", "2026-08-01");
    expect(parseRecord(out).data.ooo_until).toBe("2026-08-01");
  });
  it("adds and removes role lines", () => {
    const added = addRoleRaw(HUMAN_FILE, "product-design", "head");
    expect(added).toContain("{department: product-design, seat: head}");
    const removed = removeRoleRaw(added, "engineering", "approver");
    expect(removed).not.toContain("{department: engineering, seat: approver}");
  });
  it("throws removing a role that isn't there", () => {
    expect(() => removeRoleRaw(HUMAN_FILE, "sales-delivery", "head")).toThrow(/not found/);
  });
});

// ---------- proposals / registry / visibility ----------

describe("parseSeatChange", () => {
  it("reads a machine-readable proposal section", () => {
    const body = "\n## Summary\n\ns\n\n## Proposed change\n- change: seat\n- department: engineering\n- seat: approver\n- from: saravanan-p\n- to: saran\n\n## Decision\n";
    expect(parseSeatChange(body)).toEqual({ department: "engineering", seat: "approver", from: "saravanan-p", to: "saran" });
  });
  it("returns null when there is no proposal", () => {
    expect(parseSeatChange("\n## Summary\n\nnothing\n")).toBeNull();
  });
});

describe("rebuildRegistryText", () => {
  const reg = `head\n<!-- approvals:begin -->\nold\n<!-- approvals:end -->\ntail`;
  it("lists pending and approved-unexecuted; excludes executed and terminal", () => {
    const pending = mk().data;
    const approvedUnexec = mk().data; approvedUnexec.id = "APR-20260715-002"; approvedUnexec.state = "approved";
    const executed = mk().data; executed.id = "APR-20260715-003"; executed.state = "approved"; executed.execution = { executed_at: AT } as any;
    const rejected = mk().data; rejected.id = "APR-20260715-004"; rejected.state = "rejected";
    const out = rebuildRegistryText(reg, [{ data: pending }, { data: approvedUnexec }, { data: executed }, { data: rejected }]);
    expect(out).toContain("APR-20260715-001");
    expect(out).toContain("APR-20260715-002");
    expect(out).not.toContain("APR-20260715-003");
    expect(out).not.toContain("APR-20260715-004");
    expect(out.startsWith("head\n")).toBe(true);
    expect(out.endsWith("tail")).toBe(true);
  });
});

describe("canView", () => {
  it("hides people-gate items from non-people, non-ceo seats", () => {
    expect(canView(approver, { gate: "people" })).toBe(false);
    expect(canView(approver, { gate: "merge-deploy" })).toBe(true);
    expect(canView(ceo, { gate: "people" })).toBe(true);
    const pf = human("pf", [["people-finance", "approver"]]);
    expect(canView(pf, { gate: "people" })).toBe(true);
  });
});

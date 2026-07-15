import { describe, it, expect } from "vitest";
import { execFileSync } from "child_process";
import { writeFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import path from "path";
import { createRecord, decide, dumpRecord, slaDueFrom } from "../../lib/engine";
import { parseRecord } from "../../lib/records";
import type { Human } from "../../lib/org";

/**
 * TS ↔ Python parity: the two engines must agree byte-for-byte on the record
 * format and the SLA math, and a record the TS engine writes must validate
 * under the Python engine. Skipped if no python3 is available.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BRIDGE = path.join(HERE, "..", "parity", "engine_bridge.py");

function resolvePython(): string | null {
  for (const c of ["python3", "python", "py"]) {
    try {
      execFileSync(c, ["--version"], { stdio: "ignore" });
      return c;
    } catch {
      /* try next */
    }
  }
  return null;
}
const PY = resolvePython();
const py = (args: string[], input?: string) =>
  execFileSync(PY!, [BRIDGE, ...args], { input, encoding: "utf8", maxBuffer: 16 << 20 });

const ceo: Human = {
  id: "saran", name: "saran", email: "saran@x", title: "", availability: "available",
  roles: [{ department: "leadership", seat: "ceo" }, { department: "engineering", seat: "approver" }],
};
const AT = "2026-07-15T10:00:00Z";

const mkRecord = () =>
  createRecord({
    type: "approval", gate: "merge-deploy", priority: "P1", requestedBy: "developer",
    artifact: "docs/plans/002-execution-plan.md", artifactShaNow: "external",
    action: "Merge PR #123 into main", summary: "Parity fixture.",
    humans: [ceo], existingIds: [], at: AT,
  });

describe.skipIf(!PY)("TS↔Python parity", () => {
  it("parse+dump agree byte-for-byte on the record format", () => {
    const { data, body } = mkRecord();
    const tsText = dumpRecord(data, body);
    const pyText = py(["parse-dump"], tsText); // Python parse_record → dump_record
    expect(pyText).toBe(tsText);
  });

  it("parse+dump agree after a decision (stamp + body rewrite)", () => {
    const { data, body } = mkRecord();
    const decided = decide(data, body, {
      by: ceo, outcome: "approved", artifactShaNow: "external", humans: [ceo], at: AT,
    });
    const tsText = dumpRecord(decided.data, decided.body);
    expect(py(["parse-dump"], tsText)).toBe(tsText);
  });

  it("SLA math matches across priorities and the weekend boundary", () => {
    const cases: [string, string][] = [
      ["2026-07-18T10:00:00Z", "P0"], // Saturday, wall-clock
      ["2026-07-17T10:00:00Z", "P1"], // Friday, business hours
      ["2026-07-15T10:00:00Z", "P2"],
    ];
    for (const [start, prio] of cases) {
      const ts = slaDueFrom(new Date(start), prio);
      const python = py(["sla", start, prio]).trim();
      expect(python, `${prio} from ${start}`).toBe(ts);
    }
  });

  it("a TS-written record validates under the Python engine", () => {
    const { data, body } = mkRecord();
    const decided = decide(data, body, {
      by: ceo, outcome: "approved", artifactShaNow: "external", humans: [ceo], at: AT,
    });
    const dir = mkdtempSync(path.join(tmpdir(), "parity-"));
    try {
      const file = path.join(dir, `${data.id}.md`);
      writeFileSync(file, dumpRecord(decided.data, decided.body), "utf8");
      expect(py(["validate", file]).trim()).toBe("OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

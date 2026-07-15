/**
 * EX-601 self-check — proves the fixtures create/seed/reset/launch/teardown
 * correctly, with NO browser (fast; runs in CI's node without playwright).
 *
 *   cd panel && node test/self-check.mjs
 *
 * Exits non-zero on the first failed assertion. This is the AC's
 * "self-check that fixtures create/seed correctly" and doubles as a smoke
 * test for the harness itself before the real specs depend on it.
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { createFixture } from "./fixtures/index.mjs";

let failures = 0;
const ok = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${extra ? " — " + extra : ""}`);
  if (!cond) failures++;
};
const read = (fx, rel) => readFileSync(path.join(fx.dir, rel), "utf8");

const fx = await createFixture();
try {
  // 1. create → isolated clone with the company tree, never the real checkout
  ok("clone created in an OS temp dir", fx.dir.includes("evalyn-fx-") && existsSync(fx.dir));
  ok("clone is not the working repo", !fx.dir.startsWith(process.cwd()));
  ok("clone carries the company OS", existsSync(path.join(fx.dir, "company/registry.md")));
  ok("clone carries the engine", existsSync(path.join(fx.dir, "scripts/approval_engine.py")));

  // 2. seed an approval → file written, engine validates it
  const apr = await fx.seedApproval({
    gate: "merge-deploy", priority: "P1",
    action: "Merge the fixtures self-check PR #1 into main",
    summary: "Self-check record. **Recommendation: approve.**",
  });
  ok("seedApproval returns an APR id", /^APR-\d{8}-\d+$/.test(apr), apr);
  ok("approval record file exists in the clone", existsSync(path.join(fx.dir, `company/approvals/${apr}.md`)));
  ok("record holds the exact action", read(fx, `company/approvals/${apr}.md`).includes("Merge the fixtures self-check PR #1 into main"));
  ok("engine validates the seeded record", (await fx.py(["validate"])).includes("OK"));
  ok("registry indexes the seeded record", read(fx, "company/registry.md").includes(apr));

  // 3. seed a question
  const qst = await fx.seedQuestion({ action: "Which provider for the self-check?", priority: "P2" });
  ok("seedQuestion returns a QST id", /^QST-\d{8}-\d+$/.test(qst), qst);
  ok("question record file exists", existsSync(path.join(fx.dir, `company/questions/${qst}.md`)));

  // 4. seed a human WITH slack_id (UC2) + a department
  await fx.seedHuman({
    id: "fixture-approver", name: "Fixture Approver", email: "fx@evalyn.local",
    title: "Test Approver", slackId: "U0FIXTURE",
    roles: [{ department: "engineering", seat: "approver" }],
  });
  const humanFile = read(fx, "company/org/humans/fixture-approver.md");
  ok("seeded human carries slack_id", humanFile.includes("slack_id: U0FIXTURE"));
  ok("seeded human carries a role", humanFile.includes("{department: engineering, seat: approver}"));

  await fx.seedDepartment({ id: "lab", name: "Lab", employees: ["researcher"], gates: "experiments" });
  ok("seeded department row is parser-shaped", /^\|\s*`lab`\s*\|\s*Lab\s*\|/m.test(read(fx, "company/org/departments.md")));

  // 5. snapshot → mutate → reset restores exactly (UC1/UC3: no state leak)
  await fx.snapshot();
  const headAtSnapshot = (await fx.git(["rev-parse", "HEAD"])).trim();
  const ephemeral = await fx.seedApproval({ action: "Ephemeral record that reset() must erase" });
  ok("ephemeral record present before reset", existsSync(path.join(fx.dir, `company/approvals/${ephemeral}.md`)));
  await fx.reset();
  ok("reset erases the post-snapshot record", !existsSync(path.join(fx.dir, `company/approvals/${ephemeral}.md`)));
  ok("reset keeps the pre-snapshot records", existsSync(path.join(fx.dir, `company/approvals/${apr}.md`)));
  ok("reset returns HEAD to the snapshot", (await fx.git(["rev-parse", "HEAD"])).trim() === headAtSnapshot);
  ok("working tree clean after reset", (await fx.git(["status", "--porcelain"])).trim() === "");

  // 6. startPanel → server answers, auth is enforced, uses the temp clone
  await fx.startPanel();
  ok("panel baseUrl assigned", /^http:\/\/localhost:\d+$/.test(fx.baseUrl), fx.baseUrl);
  const signin = await fetch(`${fx.baseUrl}/signin`);
  ok("/signin answers 200", signin.status === 200);
  // a protected route redirects unauthenticated users to /signin (no session)
  const inbox = await fetch(`${fx.baseUrl}/inbox`, { redirect: "manual" });
  ok("/inbox is gated (redirects when signed out)", inbox.status >= 300 && inbox.status < 400);
  // a bogus verify token is rejected (auth wiring is live against this clone)
  const badVerify = await fetch(`${fx.baseUrl}/api/auth/verify?token=nope`, { redirect: "manual" });
  ok("bad magic-link token rejected", badVerify.status >= 300 && badVerify.status < 400);

  console.log(failures ? `\nSELF-CHECK: ${failures} FAILURE(S)` : "\nSELF-CHECK: ALL PASS");
} finally {
  await fx.teardown();
  // teardown must leave nothing behind
  ok("teardown removed the temp clone", !existsSync(fx.dir));
}

process.exit(failures ? 1 : 0);

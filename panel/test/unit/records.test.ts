import { describe, it, expect } from "vitest";
import { parseRecord, safeRepoPath, isRenderableArtifactPath } from "../../lib/records";

describe("parseRecord", () => {
  it("parses scalars, inline dicts and lists", () => {
    const text = [
      "---",
      "id: APR-1",
      "chain_pos: 2",
      "decision: {by: saran, at: t, outcome: approved}",
      "stamps:",
      "  - {by: a, outcome: approved}",
      "  - {by: b, outcome: rejected}",
      "notified:",
      "---",
      "\n## Summary\n\nhi",
    ].join("\n");
    const { data, body } = parseRecord(text);
    expect(data.id).toBe("APR-1");
    expect(data.chain_pos).toBe(2); // numeric coercion
    expect((data.decision as any).outcome).toBe("approved");
    expect((data.stamps as any[]).length).toBe(2);
    expect(data.notified).toEqual([]); // empty value => empty list
    expect(body).toContain("## Summary");
  });

  it("strips a comment only outside quotes and braces", () => {
    const { data } = parseRecord('---\navailability: busy   # a | b | c\naction: "ship #1 now"\n---\n');
    expect(data.availability).toBe("busy");
    expect(data.action).toBe("ship #1 now"); // the # inside quotes is preserved
  });

  it("normalizes CRLF and a BOM", () => {
    const { data } = parseRecord("﻿---\r\nid: X\r\nstate: pending\r\n---\r\nbody");
    expect(data.id).toBe("X");
    expect(data.state).toBe("pending");
  });

  it("throws when there is no frontmatter block", () => {
    expect(() => parseRecord("no frontmatter here")).toThrow(/no frontmatter/);
  });
});

describe("safeRepoPath", () => {
  it("accepts a normal repo-relative path (normalizing slashes)", () => {
    expect(safeRepoPath("company\\approvals\\APR-1.md")).toBe("company/approvals/APR-1.md");
  });
  it("rejects traversal, absolute paths and NUL", () => {
    expect(() => safeRepoPath("../../etc/passwd")).toThrow(/unsafe/);
    expect(() => safeRepoPath("/etc/hosts")).toThrow(/unsafe/);
    expect(() => safeRepoPath("a/\0/b")).toThrow(/unsafe/);
    expect(() => safeRepoPath("")).toThrow(/unsafe/);
  });
});

describe("isRenderableArtifactPath", () => {
  it("allows only paths under the artifact allowlist", () => {
    expect(isRenderableArtifactPath("company/approvals/APR-1.md")).toBe(true);
    expect(isRenderableArtifactPath("docs/plans/x.md")).toBe(true);
    expect(isRenderableArtifactPath("../../../etc/hosts")).toBe(false);
    expect(isRenderableArtifactPath("/etc/hosts")).toBe(false);
    expect(isRenderableArtifactPath("secrets/keys.txt")).toBe(false); // not an allowlisted top dir
  });
});

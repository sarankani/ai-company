import { describe, it, expect, vi, afterEach } from "vitest";
import {
  makeLoginToken, verifyLoginToken, makeSession, verifySession,
  safeReturnTo, panelBaseUrl,
} from "../../lib/auth";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("login tokens", () => {
  it("round-trips a valid login token", () => {
    const t = makeLoginToken("saran", "/inbox");
    expect(verifyLoginToken(t)).toEqual({ humanId: "saran", returnTo: "/inbox" });
  });

  it("rejects a tampered token", () => {
    const t = makeLoginToken("saran", "/inbox");
    const bad = t.slice(0, -1) + (t.at(-1) === "A" ? "B" : "A");
    expect(verifyLoginToken(bad)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifyLoginToken("garbage")).toBeNull();
    expect(verifyLoginToken("")).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T10:00:00Z"));
    const t = makeLoginToken("saran", "/inbox");
    vi.setSystemTime(new Date("2026-07-15T10:16:00Z")); // link TTL is 15 min
    expect(verifyLoginToken(t)).toBeNull();
  });

  it("won't accept a session token as a login token (wrong kind)", () => {
    expect(verifyLoginToken(makeSession("saran"))).toBeNull();
  });

  it("sanitizes an off-site returnTo baked into a token", () => {
    const t = makeLoginToken("saran", "https://evil.example");
    expect(verifyLoginToken(t)?.returnTo).toBe("/inbox");
  });
});

describe("sessions", () => {
  it("round-trips a session", () => {
    expect(verifySession(makeSession("saravanan-p"))).toBe("saravanan-p");
  });
  it("rejects an undefined or wrong-kind cookie", () => {
    expect(verifySession(undefined)).toBeNull();
    expect(verifySession(makeLoginToken("saran", "/inbox"))).toBeNull(); // login token isn't a session
  });
  it("rejects an expired session", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T10:00:00Z"));
    const s = makeSession("saran");
    vi.setSystemTime(new Date("2026-07-23T10:00:00Z")); // > 7 days
    expect(verifySession(s)).toBeNull();
  });
});

describe("safeReturnTo", () => {
  it("keeps same-origin absolute paths", () => {
    expect(safeReturnTo("/inbox")).toBe("/inbox");
    expect(safeReturnTo("/board/engineering?x=1")).toBe("/board/engineering?x=1");
  });
  it("rejects protocol-relative, absolute-url, and empty targets", () => {
    expect(safeReturnTo("//evil.example")).toBe("/inbox");
    expect(safeReturnTo("https://evil.example")).toBe("/inbox");
    expect(safeReturnTo("")).toBe("/inbox");
    expect(safeReturnTo(undefined)).toBe("/inbox");
  });
});

describe("panelBaseUrl", () => {
  it("prefers PANEL_BASE_URL and strips a trailing slash", () => {
    vi.stubEnv("PANEL_BASE_URL", "https://panel.evalyn.in/");
    expect(panelBaseUrl()).toBe("https://panel.evalyn.in");
  });
  it("falls back to the Vercel production domain", () => {
    vi.stubEnv("PANEL_BASE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "ai-company-jet.vercel.app");
    expect(panelBaseUrl()).toBe("https://ai-company-jet.vercel.app");
  });
  it("falls back to localhost in dev", () => {
    vi.stubEnv("PANEL_BASE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(panelBaseUrl()).toBe("http://localhost:3000");
  });
});

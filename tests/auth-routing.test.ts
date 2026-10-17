import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { getAuthHref, getReturnPath } from "../lib/auth-redirects";
import { proxy } from "../proxy";

describe("auth return paths", () => {
  it.each([
    "/notes", "/notes/abc?view=grid#checklist", "/canvas/abc", "/kanban?board=abc", "/admin",
  ])("preserves app destination %s", (path) => {
    expect(getReturnPath(path)).toBe(path);
  });

  it.each([
    null, undefined, ["/canvas"], "", "https://example.com", "//example.com", "/\\example.com",
    "/login", "/register?next=/login", "/notes/../../login", "/notes/%2e%2e/login",
    "/notes-other", "/api/auth/sign-out", "/notes\nLocation: https://example.com",
  ])("rejects external or non-app destination %s", (path) => {
    expect(getReturnPath(path)).toBe("/notes");
  });

  it("keeps the destination while switching auth mode or reporting expiry", () => {
    const path = "/canvas/abc?zoom=2#idea";
    const login = new URL(getAuthHref("login", path, "expired"), "https://noteworthy.invalid");
    expect(login.searchParams.get("next")).toBe(path);
    expect(login.searchParams.get("reason")).toBe("expired");
    expect(new URL(getAuthHref("register", login.searchParams.get("next")), login).searchParams.get("next")).toBe(path);
    expect(getAuthHref("login", "/admin", "banned")).toContain("banned=true");
  });

  it("uses the actual requested path even if a client sends a forged header", () => {
    const response = proxy(new NextRequest("https://noteworthy.invalid/canvas/abc?zoom=2", {
      headers: { "x-noteworthy-path": "https://example.com" },
    }));
    expect(response.headers.get("x-middleware-request-x-noteworthy-path")).toBe("/canvas/abc?zoom=2");
  });
});

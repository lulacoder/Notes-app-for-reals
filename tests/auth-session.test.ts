import { getFunctionName, makeFunctionReference } from "convex/server";
import { ConvexHttpClient } from "convex/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { getToken } from "../lib/auth-server";
import { getAuthSession, requireAppSession } from "../lib/auth-session";
import { account, setup } from "./convex";

vi.mock("../lib/auth-server", async () => {
  const { preloadQuery } = await import("convex/nextjs");
  return { getToken: vi.fn(), preloadAuthQuery: preloadQuery };
});
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-noteworthy-path": "/canvas/saved?zoom=2" }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function backend(banned = false) {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://auth-test.convex.cloud");
  vi.mocked(getToken).mockResolvedValue("still-valid-jwt");
  const t = setup();
  const owner = await account(t, "user", banned);
  vi.spyOn(ConvexHttpClient.prototype, "query").mockImplementation(async (...[query, args]: Parameters<ConvexHttpClient["query"]>) => {
    return owner.client.query(makeFunctionReference<"query">(getFunctionName(query)), args ?? {});
  });
  return { t, owner };
}

describe("server session checks", () => {
  it("redirects a missing session back through the requested canvas", async () => {
    vi.mocked(getToken).mockResolvedValue(undefined);
    expect(await getAuthSession()).toBeNull();
    await expect(requireAppSession()).rejects.toMatchObject({ digest: "NEXT_REDIRECT;replace;/login?next=%2Fcanvas%2Fsaved%3Fzoom%3D2;307;" });
  });

  it("returns the live user with the preloaded subscription", async () => {
    const { owner } = await backend();
    const session = await requireAppSession();
    expect(session.user._id).toBe(owner.user._id);
    expect(session.preloadedCurrentUser._name).toBe("auth:getCurrentUser");
  });

  it("checks the live session again after revocation, even with the same token", async () => {
    const { t, owner } = await backend();
    expect(await getAuthSession()).not.toBeNull();
    const admin = await account(t, "admin");
    await admin.client.mutation(api.admin.setBanned, { userId: owner.user._id, banned: true });
    expect(await getAuthSession()).toBeNull();
    await expect(requireAppSession()).rejects.toMatchObject({ digest: "NEXT_REDIRECT;replace;/login?next=%2Fcanvas%2Fsaved%3Fzoom%3D2;307;" });
  });

  it("blocks a suspended account with an explanatory login destination", async () => {
    await backend(true);
    await expect(requireAppSession()).rejects.toMatchObject({ digest: "NEXT_REDIRECT;replace;/login?next=%2Fcanvas%2Fsaved%3Fzoom%3D2&banned=true;307;" });
  });
});

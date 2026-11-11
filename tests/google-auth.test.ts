import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import type { createClient } from "@convex-dev/better-auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import { createAuth, createAuthOptions } from "../convex/auth";
import { account, setup } from "./convex";

afterEach(() => { vi.unstubAllEnvs(); });

it("registers and signs in through the upgraded Convex authentication adapter", async () => {
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv("BETTER_AUTH_SECRET", "test-only-better-auth-secret-at-least-32-characters");
  const t = setup();
  await t.run(async (ctx) => {
    const auth = createAuth(ctx);
    const created = await auth.api.signUpEmail({ body: { email: "new@example.com", name: "Writer", password: "Original-password-123" } });
    const signedIn = await auth.api.signInEmail({ body: { email: "new@example.com", password: "Original-password-123" } });
    expect(signedIn.user.id).toBe(created.user.id);
  });
});

it("exports the atomic adapter operations needed by Better Auth 1.7", async () => {
  const t = setup();
  const adapter = (components.betterAuth as unknown as Parameters<typeof createClient>[0]).adapter;
  const now = Date.now();
  await t.mutation(adapter.create, { input: { model: "verification", data: {
    identifier: "single-use", value: "token", expiresAt: now + 60000, createdAt: now, updatedAt: now,
  } } });
  const consume = { input: { model: "verification", where: [{ field: "identifier", value: "single-use" }] } };
  expect(await t.mutation(adapter.consumeOne, consume)).toMatchObject({ value: "token" });
  expect(await t.mutation(adapter.consumeOne, consume)).toBeNull();

  await t.mutation(adapter.create, { input: { model: "rateLimit", data: { key: "attempts", count: 1, lastRequest: now } } });
  const updated = await t.mutation(adapter.incrementOne, { input: {
    model: "rateLimit", where: [{ field: "key", value: "attempts" }], increment: { count: 1 },
  } });
  expect(updated).toMatchObject({ count: 2 });
});

async function authFixture(emailVerified: boolean, googleEmail = "writer@example.com") {
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
  const t = setup();
  const options = await t.run(async (ctx) => {
    const { baseURL, emailAndPassword, socialProviders, account, session } = createAuthOptions(ctx);
    return { baseURL, emailAndPassword, socialProviders, account, session };
  });
  const auth = betterAuth({
    ...options,
    secret: "test-only-better-auth-secret-at-least-32-characters",
    database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    plugins: [],
    socialProviders: {
      google: {
        ...options.socialProviders.google,
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        // Stub only Google's remote token validation. Better Auth still runs its real linking rules.
        verifyIdToken: async () => true,
        getUserInfo: async () => ({
          user: { email: googleEmail, name: "Google writer", emailVerified: true },
          data: {
            sub: "google-writer", email: googleEmail, email_verified: true,
            name: "Google writer", given_name: "Google", family_name: "writer",
            aud: "test-client-id", azp: "test-client-id", iss: "https://accounts.google.com",
            iat: 1, exp: 9999999999, picture: "",
          },
        }),
      },
    },
  });
  const created = await auth.api.signUpEmail({ body: { email: "writer@example.com", name: "Writer", password: "Original-password-123" } });
  if (emailVerified) await (await auth.$context).internalAdapter.updateUser(created.user.id, { emailVerified: true });
  return { auth, userId: created.user.id };
}

describe("Google account identity", () => {
  it("uses the existing verified password user's ID when Google has the same email", async () => {
    const { auth, userId } = await authFixture(true);
    const google = await auth.api.signInSocial({ body: { provider: "google", idToken: { token: "test-token" } } });
    expect("user" in google && google.user?.id).toBe(userId);
    const password = await auth.api.signInEmail({ body: { email: "writer@example.com", password: "Original-password-123" } });
    expect(password.user.id).toBe(userId);
    expect((await (await auth.$context).internalAdapter.findAccounts(userId)).map((item) => item.providerId).sort()).toEqual(["credential", "google"]);
  });

  it("blocks implicit linking into an unverified pre-registered password account", async () => {
    const { auth, userId } = await authFixture(false);
    await expect(auth.api.signInSocial({ body: { provider: "google", idToken: { token: "test-token" } } })).rejects.toThrow();
    expect((await (await auth.$context).internalAdapter.findAccounts(userId)).map((item) => item.providerId)).toEqual(["credential"]);
    const password = await auth.api.signInEmail({ body: { email: "writer@example.com", password: "Original-password-123" }, asResponse: true });
    const cookie = password.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    await auth.api.linkSocialAccount({ headers: new Headers({ cookie }), body: { provider: "google", idToken: { token: "test-token" } } });
    const google = await auth.api.signInSocial({ body: { provider: "google", idToken: { token: "test-token" } } });
    expect("user" in google && google.user?.id).toBe(userId);
  });

  it("refuses to explicitly connect a Google account with another email", async () => {
    const { auth, userId } = await authFixture(false, "another@example.com");
    const password = await auth.api.signInEmail({ body: { email: "writer@example.com", password: "Original-password-123" }, asResponse: true });
    const cookie = password.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    await expect(auth.api.linkSocialAccount({ headers: new Headers({ cookie }), body: { provider: "google", idToken: { token: "test-token" } } })).rejects.toThrow();
    expect((await (await auth.$context).internalAdapter.findAccounts(userId)).map((item) => item.providerId)).toEqual(["credential"]);
  });

  it("lets a Google-first user add a password and sign into the same user ID", async () => {
    const { auth } = await authFixture(false, "google-first@example.com");
    const google = await auth.api.signInSocial({ body: { provider: "google", idToken: { token: "test-token" } }, asResponse: true });
    const cookie = google.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    const headers = new Headers({ cookie });
    const session = await auth.api.getSession({ headers });
    expect(session?.user.email).toBe("google-first@example.com");
    await auth.api.setPassword({ headers, body: { newPassword: "Google-first-password-123" } });
    const password = await auth.api.signInEmail({ body: { email: "google-first@example.com", password: "Google-first-password-123" } });
    expect(password.user.id).toBe(session?.user.id);
  });
});

async function googleAccount() {
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv("BETTER_AUTH_SECRET", "test-only-better-auth-secret-at-least-32-characters");
  const t = setup();
  const owner = await account(t, "user");
  await t.mutation(components.betterAuth.adapter.create, { input: { model: "account", data: {
    userId: owner.user._id, accountId: "google-writer", providerId: "google", createdAt: Date.now(), updatedAt: Date.now(),
  } } });
  return { t, owner };
}

describe("password setup for Google users", () => {
  it("adds a hashed password on the same user and refuses to overwrite it", async () => {
    const { t, owner } = await googleAccount();
    expect(await owner.client.query(api.auth.getSignInMethods)).toMatchObject({ hasGoogle: true, hasPassword: false });
    expect(await owner.client.mutation(api.auth.addPassword, { newPassword: "Added-password-123" })).toEqual({ status: true });
    expect(await owner.client.query(api.auth.getSignInMethods)).toMatchObject({ hasGoogle: true, hasPassword: true });
    const stored = await t.query(components.betterAuth.adapter.findOne, { model: "account", where: [{ field: "providerId", value: "credential" }, { field: "userId", value: owner.user._id }] });
    expect(stored?.password).toBeTruthy();
    expect(stored?.password).not.toBe("Added-password-123");
    await expect(owner.client.mutation(api.auth.addPassword, { newPassword: "Overwrite-password-123" })).rejects.toThrow();
  });

  it("rejects unauthenticated users, suspended users, unverified emails, and weak passwords", async () => {
    const { t, owner } = await googleAccount();
    await expect(t.mutation(api.auth.addPassword, { newPassword: "Added-password-123" })).rejects.toThrow("Unauthenticated");
    await expect(owner.client.mutation(api.auth.addPassword, { newPassword: "short" })).rejects.toThrow();
    await t.mutation(components.betterAuth.adapter.updateOne, { input: { model: "user", where: [{ field: "_id", value: owner.user._id }], update: { emailVerified: false } } });
    await expect(owner.client.mutation(api.auth.addPassword, { newPassword: "Added-password-123" })).rejects.toThrow("Verify your email");
    await t.mutation(components.betterAuth.adapter.updateOne, { input: { model: "user", where: [{ field: "_id", value: owner.user._id }], update: { banned: true } } });
    await expect(owner.client.mutation(api.auth.addPassword, { newPassword: "Added-password-123" })).rejects.toThrow("Account suspended");
  });

  it("rejects expired, revoked, and old sessions even if their JWT identity remains", async () => {
    const { t, owner } = await googleAccount();
    await t.mutation(components.betterAuth.adapter.updateMany, { input: { model: "session", where: [{ field: "userId", value: owner.user._id }], update: { createdAt: Date.now() - 6 * 60 * 1000 } }, paginationOpts: { cursor: null, numItems: 100 } });
    await expect(owner.client.mutation(api.auth.addPassword, { newPassword: "Added-password-123" })).rejects.toThrow("Sign in again");
    await t.mutation(components.betterAuth.adapter.updateMany, { input: { model: "session", where: [{ field: "userId", value: owner.user._id }], update: { expiresAt: Date.now() - 1 } }, paginationOpts: { cursor: null, numItems: 100 } });
    await expect(owner.client.mutation(api.auth.addPassword, { newPassword: "Added-password-123" })).rejects.toThrow("Unauthenticated");
    await t.mutation(components.betterAuth.adapter.deleteMany, { input: { model: "session", where: [{ field: "userId", value: owner.user._id }] }, paginationOpts: { cursor: null, numItems: 100 } });
    await expect(owner.client.mutation(api.auth.addPassword, { newPassword: "Added-password-123" })).rejects.toThrow("Unauthenticated");
  });
});

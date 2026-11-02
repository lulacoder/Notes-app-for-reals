import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { admin } from "better-auth/plugins";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";

// The checked-in generated server does not export env yet. Keep this access until
// codegen can be upgraded with declared variables and both deployments reviewed.
export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  // These secrets belong to the Convex deployment, never NEXT_PUBLIC_ variables.
  // eslint-disable-next-line @convex-dev/no-process-env
  const { SITE_URL: siteUrl, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  return {
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET ? {
      google: {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
    } : {},
    account: {
      accountLinking: {
        enabled: true,
        requireLocalEmailVerified: true,
        allowDifferentEmails: false,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Refresh session after 1 day of activity
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minute cache to reduce DB hits
      },
    },
    plugins: [
      convex({
        authConfig,
        jwt: {
          expirationSeconds: 60 * 60, // 1 hour JWT for stable WebSocket connection
        },
        jwksRotateOnTokenGenerationError: true, // For algorithm migration
      }),
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
    ],
  } satisfies BetterAuthOptions;
};

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: {
      schema: authSchema,
    },
  }
);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    return user ?? null;
  },
});

export const getSignInMethods = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (user.banned) throw new Error("Account suspended");
    return getUserSignInMethods(ctx, user);
  },
});

async function getUserSignInMethods(ctx: GenericCtx<DataModel>, user: { _id: string; email: string }) {
  const accounts = z.object({ page: z.array(z.object({ providerId: z.string(), password: z.string().nullish() })) }).parse(await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: "account",
    where: [{ field: "userId", value: user._id }],
    paginationOpts: { cursor: null, numItems: 100 },
  }));
  return {
    email: user.email,
    hasGoogle: accounts.page.some((account) => account.providerId === "google"),
    hasPassword: accounts.page.some((account) => account.providerId === "credential" && Boolean(account.password)),
  };
}

export const addPassword = mutation({
  args: { newPassword: v.string() },
  handler: async (ctx, { newPassword }): Promise<{ status: boolean }> => {
    const user = await authComponent.getAuthUser(ctx);
    if (user.banned) throw new Error("Account suspended");
    if (!user.emailVerified) throw new Error("Verify your email with Google before adding a password.");
    const methods = await getUserSignInMethods(ctx, user);
    if (!methods.hasGoogle) throw new Error("Connect Google before adding a password.");
    const identity = await ctx.auth.getUserIdentity();
    const session = z.object({ createdAt: z.number() }).parse(await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "session",
      where: [{ field: "_id", value: String(identity?.sessionId) }],
    }));
    if (session.createdAt < Date.now() - 5 * 60 * 1000) throw new Error("Sign in again before adding a password.");
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    // Better Auth checks the authoritative session, password rules, and existing credentials.
    return await auth.api.setPassword({ headers, body: { newPassword } });
  },
});

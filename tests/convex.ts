import { convexTest } from "convex-test";
import { components } from "../convex/_generated/api";
import schema from "../convex/schema";
import authSchema from "../convex/betterAuth/schema";
import { authUserSchema } from "../convex/lib/auth-records";
import { z } from "zod";

const modules = import.meta.glob("../convex/**/*.ts");
const authModules = import.meta.glob("../convex/betterAuth/**/*.ts");

export function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", authSchema, authModules);
  return t;
}

export async function account(t: ReturnType<typeof setup>, role: "admin" | "user", banned = false) {
  const now = Date.now();
  const user = authUserSchema.parse(await t.mutation(components.betterAuth.adapter.create, {
    input: { model: "user", data: {
      name: role, email: `${crypto.randomUUID()}@example.com`, emailVerified: true,
      role, banned, createdAt: now, updatedAt: now,
    } },
  }));
  const session = z.object({ _id: z.string() }).parse(await t.mutation(components.betterAuth.adapter.create, {
    input: { model: "session", data: {
      userId: user._id, token: crypto.randomUUID(), expiresAt: now + 3600000,
      createdAt: now, updatedAt: now,
    } },
  }));
  return { user, client: t.withIdentity({ subject: user._id, sessionId: session._id }) };
}

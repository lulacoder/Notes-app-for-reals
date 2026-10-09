import { describe, expect, it } from "vitest";
import { api, components } from "../convex/_generated/api";
import { setup, account } from "./convex";

describe("admin authorization", () => {
  it("rejects anonymous, regular, and banned administrator reads", async () => {
    const t = setup();
    const regular = await account(t, "user");
    const banned = await account(t, "admin", true);
    await expect(t.query(api.admin.listUsers)).rejects.toThrow("Authentication required");
    await expect(regular.client.query(api.admin.listUsers)).rejects.toThrow("Administrator role required");
    await expect(banned.client.query(api.admin.listUsers)).rejects.toThrow("Account is suspended");
  });

  it("prevents self-demotion, self-ban, and self-deletion", async () => {
    const t = setup();
    const admin = await account(t, "admin");
    await expect(admin.client.mutation(api.admin.setRole, { userId: admin.user._id, role: "user" })).rejects.toThrow("your own role");
    await expect(admin.client.mutation(api.admin.setBanned, { userId: admin.user._id, banned: true })).rejects.toThrow("your own account");
    await expect(admin.client.mutation(api.admin.deleteUser, { userId: admin.user._id })).rejects.toThrow("your own account");
    expect(await admin.client.query(api.admin.listUsers)).toHaveLength(1);
  });

  it("ends the target's authenticated session when an administrator bans them", async () => {
    const t = setup();
    const admin = await account(t, "admin");
    const target = await account(t, "user");
    expect(await target.client.query(api.auth.getCurrentUser)).not.toBeNull();
    await admin.client.mutation(api.admin.setBanned, { userId: target.user._id, banned: true });
    expect(await target.client.query(api.auth.getCurrentUser)).toBeNull();
    const users = await admin.client.query(api.admin.listUsers);
    expect(users.find((user) => user._id === target.user._id)?.banned).toBe(true);
  });

  it("rejects a revoked or banned identity even if its JWT has not expired", async () => {
    const t = setup();
    const admin = await account(t, "admin");
    const target = await account(t, "user");
    const noteId = await target.client.mutation(api.notes.createNote, { title: "Private" });
    await admin.client.mutation(api.admin.setBanned, { userId: target.user._id, banned: true });
    expect(await target.client.query(api.notes.getNote, { id: noteId })).toBeNull();
    expect(await target.client.query(api.notes.listNoteSummaries)).toEqual([]);
    await expect(target.client.mutation(api.notes.updateNote, { id: noteId, title: "Changed" })).rejects.toThrow("Not authenticated");
  });

  it("revokes sessions beyond the first adapter page", async () => {
    const t = setup();
    const admin = await account(t, "admin");
    const target = await account(t, "user");
    const now = Date.now();
    for (let i = 0; i < 201; i++) {
      await t.mutation(components.betterAuth.adapter.create, {
        input: { model: "session", data: {
          userId: target.user._id, token: `extra-${i}`, expiresAt: now + 3600000,
          createdAt: now, updatedAt: now,
        } },
      });
    }
    await admin.client.mutation(api.admin.setBanned, { userId: target.user._id, banned: true });
    const remaining = await t.query(components.betterAuth.adapter.findMany, {
      model: "session", where: [{ field: "userId", operator: "eq", value: target.user._id }],
      paginationOpts: { numItems: 200, cursor: null },
    });
    expect(remaining.page).toEqual([]);
  });
});

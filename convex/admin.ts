import { internalMutation, mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { hashPassword } from "better-auth/crypto";
import { authUserSchema, authUsersPageSchema, authAccountSchema, paginationSchema } from "./lib/auth-records";

export const ROOT_ADMIN_EMAIL = "leul15370@gmail.com";

// Helper to enforce admin authorization
async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const currentUser = await authComponent.safeGetAuthUser(ctx);
  if (!currentUser) {
    throw new Error("Unauthorized: Authentication required");
  }
  if (currentUser.banned) {
    throw new Error("Unauthorized: Account is suspended");
  }
  if (currentUser.role !== "admin") {
    throw new Error("Unauthorized: Administrator role required");
  }
  return currentUser;
}

async function listAuthUsers(ctx: QueryCtx | MutationCtx, role?: string) {
  const users: Array<ReturnType<typeof authUserSchema.parse>> = [];
  let cursor: string | null = null;
  for (;;) {
    const result = authUsersPageSchema.parse(await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      ...(role ? { where: [{ field: "role", operator: "eq", value: role }] } : {}),
      paginationOpts: { numItems: 200, cursor },
    }));
    users.push(...result.page);
    if (result.isDone) return { page: users };
    cursor = result.continueCursor;
  }
}

async function deleteAuthRecords(ctx: MutationCtx, model: "session" | "account", userId: string) {
  let cursor: string | null = null;
  for (;;) {
    const result = paginationSchema.parse(await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: { model, where: [{ field: "userId", operator: "eq", value: userId }] },
      paginationOpts: { numItems: 200, cursor },
    }));
    if (result.isDone) return;
    cursor = result.continueCursor;
  }
}

/**
 * One-time setup mutation to bootstrap the initial admin user.
 * Protected against hijacking: once an active admin exists, only an authenticated admin can run setup/reset.
 */
export const setupInitialAdmin = internalMutation({
  args: {
    email: v.optional(v.string()),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if an active administrator already exists
    const adminCheck = await listAuthUsers(ctx, "admin");

    const existingAdmins = (adminCheck?.page || []).filter((u) => !u.banned);
    const caller = await authComponent.safeGetAuthUser(ctx);

    // If an active admin already exists in the system, prevent unauthorized bootstrap
    if (existingAdmins.length > 0) {
      if (!caller || caller.banned || caller.role !== "admin") {
        throw new Error(
          "Forbidden: Administrator already exists. Only an active administrator can invoke admin setup."
        );
      }
    }

    const targetEmail = (args.email || ROOT_ADMIN_EMAIL).trim().toLowerCase();
    const targetPassword = args.password;
    if (targetPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const hashedPassword = await hashPassword(targetPassword);

    // Look for existing user by email
    const existingUser = authUserSchema.nullable().parse((await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", operator: "eq", value: targetEmail }],
    })));

    if (existingUser) {
      const userId = existingUser._id;

      // Update user to admin
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "user",
          where: [{ field: "_id", operator: "eq", value: userId }],
          update: {
            role: "admin",
            banned: false,
            banReason: null,
            banExpires: null,
            updatedAt: Date.now(),
          },
        },
      });

      // Check if credential account exists
      const existingAccount = authAccountSchema.nullable().parse((await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "account",
        where: [
          { field: "userId", operator: "eq", value: userId },
          { field: "providerId", operator: "eq", value: "credential" },
        ],
      })));

      if (existingAccount) {
        const accountId = existingAccount._id;
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "account",
            where: [{ field: "_id", operator: "eq", value: accountId }],
            update: {
              password: hashedPassword,
              updatedAt: Date.now(),
            },
          },
        });
      } else {
        await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "account",
            data: {
              accountId: userId,
              providerId: "credential",
              userId: userId,
              password: hashedPassword,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        });
      }

      return {
        success: true,
        action: "promoted",
        email: targetEmail,
        message: `Existing user ${targetEmail} promoted to administrator.`,
      };
    } else {
      // Create brand new user
      const now = Date.now();
      const newUser = authUserSchema.parse((await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "user",
          data: {
            name: "Admin",
            email: targetEmail,
            emailVerified: true,
            role: "admin",
            banned: false,
            createdAt: now,
            updatedAt: now,
          },
        },
      })));

      const userId = newUser._id;

      await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "account",
          data: {
            accountId: userId,
            providerId: "credential",
            userId: userId,
            password: hashedPassword,
            createdAt: now,
            updatedAt: now,
          },
        },
      });

      return {
        success: true,
        action: "created",
        email: targetEmail,
        message: `New administrator account ${targetEmail} created successfully.`,
      };
    }
  },
});

/**
 * List all users for the Admin Panel.
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const result = await listAuthUsers(ctx);

    const users = result?.page || [];

    return users.map((u) => ({
      _id: u._id,
      id: u._id,
      name: u.name || "Unnamed User",
      email: u.email,
      role: u.role || "user",
      banned: !!u.banned,
      banReason: u.banReason || null,
      banExpires: u.banExpires || null,
      createdAt: u.createdAt || u._creationTime,
      image: u.image || null,
    }));
  },
});

/**
 * Update a user's role (admin / user).
 * Prevents self-demotion, protecting root admin and last active admin.
 */
export const setRole = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const currentAdminId = adminUser._id;

    // Fetch target user
    const targetUser = authUserSchema.nullable().parse((await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", operator: "eq", value: args.userId }],
    })));

    if (!targetUser) {
      throw new Error("User not found");
    }

    const targetUserId = targetUser._id;

    // Prevent changing self role
    if (
      currentAdminId === targetUserId ||
      adminUser.email.toLowerCase() === targetUser.email.toLowerCase()
    ) {
      throw new Error("You cannot change your own role");
    }

    // Protect root admin from demotion
    if (
      targetUser.email.toLowerCase() === ROOT_ADMIN_EMAIL &&
      args.role !== "admin"
    ) {
      throw new Error(
        `The primary system administrator (${ROOT_ADMIN_EMAIL}) cannot be demoted.`
      );
    }

    // If demoting an admin, ensure at least one other active admin remains
    if (targetUser.role === "admin" && args.role === "user") {
      const allAdmins = await listAuthUsers(ctx, "admin");

      const otherActiveAdmins = (allAdmins?.page || []).filter(
        (u) => !u.banned && (u._id) !== targetUserId
      );

      if (otherActiveAdmins.length === 0) {
        throw new Error(
          "Cannot demote this user: the system must retain at least one active administrator."
        );
      }
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", operator: "eq", value: targetUserId }],
        update: { role: args.role, updatedAt: Date.now() },
      },
    });

    return { success: true };
  },
});

/**
 * Ban or unban a user.
 * Terminates all active sessions immediately upon ban.
 */
export const setBanned = mutation({
  args: {
    userId: v.string(),
    banned: v.boolean(),
    banReason: v.optional(v.string()),
    banExpires: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const currentAdminId = adminUser._id;

    // Fetch target user
    const targetUser = authUserSchema.nullable().parse((await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", operator: "eq", value: args.userId }],
    })));

    if (!targetUser) {
      throw new Error("User not found");
    }

    const targetUserId = targetUser._id;

    // Prevent self-ban
    if (
      currentAdminId === targetUserId ||
      adminUser.email.toLowerCase() === targetUser.email.toLowerCase()
    ) {
      throw new Error("You cannot ban your own account");
    }

    // Protect root admin from ban
    if (targetUser.email.toLowerCase() === ROOT_ADMIN_EMAIL && args.banned) {
      throw new Error(
        `The primary system administrator (${ROOT_ADMIN_EMAIL}) cannot be banned.`
      );
    }

    // If banning an admin, ensure at least one other active admin remains
    if (targetUser.role === "admin" && args.banned) {
      const allAdmins = await listAuthUsers(ctx, "admin");

      const otherActiveAdmins = (allAdmins?.page || []).filter(
        (u) => !u.banned && (u._id) !== targetUserId
      );

      if (otherActiveAdmins.length === 0) {
        throw new Error(
          "Cannot ban this administrator: the system must retain at least one active administrator."
        );
      }
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", operator: "eq", value: targetUserId }],
        update: {
          banned: args.banned,
          banReason: args.banned
            ? args.banReason || "Suspended by administrator"
            : null,
          banExpires: args.banned ? args.banExpires || null : null,
          updatedAt: Date.now(),
        },
      },
    });

    // If banning user, terminate all their active sessions immediately
    if (args.banned) {
      await deleteAuthRecords(ctx, "session", targetUserId);
    }

    return { success: true };
  },
});

/**
 * Permanently delete a user account and cascade delete all user-owned data.
 */
export const deleteUser = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const currentAdminId = adminUser._id;

    // Fetch target user
    const targetUser = authUserSchema.nullable().parse((await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", operator: "eq", value: args.userId }],
    })));

    if (!targetUser) {
      throw new Error("User not found");
    }

    const targetUserId = targetUser._id;

    // Prevent self-deletion from admin panel
    if (
      currentAdminId === targetUserId ||
      adminUser.email.toLowerCase() === targetUser.email.toLowerCase()
    ) {
      throw new Error("You cannot delete your own account from the admin panel");
    }

    // Protect root admin from deletion
    if (targetUser.email.toLowerCase() === ROOT_ADMIN_EMAIL) {
      throw new Error(
        `The primary system administrator (${ROOT_ADMIN_EMAIL}) cannot be deleted.`
      );
    }

    // If deleting an admin, ensure at least one other active admin remains
    if (targetUser.role === "admin") {
      const allAdmins = await listAuthUsers(ctx, "admin");

      const otherActiveAdmins = (allAdmins?.page || []).filter(
        (u) => !u.banned && (u._id) !== targetUserId
      );

      if (otherActiveAdmins.length === 0) {
        throw new Error(
          "Cannot delete this administrator: the system must retain at least one active administrator."
        );
      }
    }

    // Cascade delete user-owned data in Convex tables:
    // 1. Notes & Note Versions
    const userNotes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();
    for (const note of userNotes) {
      const versions = await ctx.db
        .query("noteVersions")
        .withIndex("by_note", (q) => q.eq("noteId", note._id))
        .collect();
      for (const ver of versions) {
        await ctx.db.delete(ver._id);
      }
      await ctx.db.delete(note._id);
    }

    // 2. Tags
    const userTags = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();
    for (const tag of userTags) {
      await ctx.db.delete(tag._id);
    }

    const storageIds = new Set<Id<"_storage">>();
    // 3. Canvases & Canvas Assets
    const userCanvases = await ctx.db
      .query("canvases")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();
    for (const canvas of userCanvases) {
      const assets = await ctx.db
        .query("canvasAssets")
        .withIndex("by_canvas", (q) => q.eq("canvasId", canvas._id))
        .collect();
      for (const a of assets) {
        storageIds.add(a.storageId);
        await ctx.db.delete(a._id);
      }
      await ctx.db.delete(canvas._id);
    }

    // 4. Kanban Boards, Columns, Cards
    const userBoards = await ctx.db
      .query("kanbanBoards")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();
    for (const board of userBoards) {
      const cols = await ctx.db
        .query("kanbanColumns")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const col of cols) {
        await ctx.db.delete(col._id);
      }
      const cards = await ctx.db
        .query("kanbanCards")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const card of cards) {
        await ctx.db.delete(card._id);
      }
      await ctx.db.delete(board._id);
    }

    // 5. Uploads
    const userUploads = await ctx.db
      .query("uploads")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();
    for (const upload of userUploads) {
      storageIds.add(upload.storageId);
      await ctx.db.delete(upload._id);
    }
    for (const storageId of storageIds) await ctx.storage.delete(storageId);

    // 6. Delete Better Auth sessions
    await deleteAuthRecords(ctx, "session", targetUserId);

    // 7. Delete Better Auth accounts
    await deleteAuthRecords(ctx, "account", targetUserId);

    // 8. Delete Better Auth user record
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "user",
        where: [{ field: "_id", operator: "eq", value: targetUserId }],
      },
    });

    return { success: true };
  },
});

/**
 * Create a new user directly from the Admin Panel.
 */
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const email = args.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("Please enter a valid email address");
    }
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    const existingUser = authUserSchema.nullable().parse((await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", operator: "eq", value: email }],
    })));

    if (existingUser) {
      throw new Error("A user with this email address already exists");
    }

    const now = Date.now();
    const hashedPassword = await hashPassword(args.password);

    const newUser = authUserSchema.parse((await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name: args.name.trim() || "User",
          email,
          emailVerified: true,
          role: args.role,
          banned: false,
          createdAt: now,
          updatedAt: now,
        },
      },
    })));

    const userId = newUser._id;

    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "account",
        data: {
          accountId: userId,
          providerId: "credential",
          userId,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        },
      },
    });

    return {
      success: true,
      userId,
      email,
      message: `User ${email} created successfully.`,
    };
  },
});

/**
 * Reset a user's password from the Admin Panel.
 */
export const resetPassword = mutation({
  args: {
    userId: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const currentAdminId = adminUser._id;

    if (args.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters long");
    }

    const targetUser = authUserSchema.nullable().parse((await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", operator: "eq", value: args.userId }],
    })));

    if (!targetUser) {
      throw new Error("User not found");
    }

    const targetUserId = targetUser._id;

    // Protect root admin password from being reset by other admins
    if (
      targetUser.email.toLowerCase() === ROOT_ADMIN_EMAIL &&
      adminUser.email.toLowerCase() !== ROOT_ADMIN_EMAIL
    ) {
      throw new Error(
        `Only the primary administrator can reset the primary administrator's password.`
      );
    }

    const hashedPassword = await hashPassword(args.newPassword);

    // Look for credential account
    const existingAccount = authAccountSchema.nullable().parse((await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "account",
      where: [
        { field: "userId", operator: "eq", value: targetUserId },
        { field: "providerId", operator: "eq", value: "credential" },
      ],
    })));

    if (existingAccount) {
      const accountId = existingAccount._id;
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "account",
          where: [{ field: "_id", operator: "eq", value: accountId }],
          update: {
            password: hashedPassword,
            updatedAt: Date.now(),
          },
        },
      });
    } else {
      await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "account",
          data: {
            accountId: targetUserId,
            providerId: "credential",
            userId: targetUserId,
            password: hashedPassword,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
      });
    }

    // Invalidate target user's active sessions so they must sign in with new password
    if (currentAdminId !== targetUserId) {
      await deleteAuthRecords(ctx, "session", targetUserId);
    }

    return { success: true };
  },
});

/**
 * Inspection query to view counts of users, notes, tags, and kanban boards on the deployment.
 * Protected with requireAdmin.
 */
export const getDeploymentStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const userResult = await listAuthUsers(ctx);

    const users = userResult?.page || [];
    const notesCount = (await ctx.db.query("notes").collect()).length;
    const tagsCount = (await ctx.db.query("tags").collect()).length;
    const canvasesCount = (await ctx.db.query("canvases").collect()).length;
    const boardsCount = (await ctx.db.query("kanbanBoards").collect()).length;

    return {
      usersCount: users.length,
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        banned: u.banned,
      })),
      notesCount,
      tagsCount,
      canvasesCount,
      boardsCount,
    };
  },
});

/**
 * Seed sample users and rich demo data to the remote Convex deployment.
 * Protected with requireAdmin.
 */
export const seedSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    // Sample accounts require an administrator password reset before use.
    const defaultPasswordHash = await hashPassword(crypto.randomUUID());

    // 1. Ensure primary admin exists
    const adminEmail = ROOT_ADMIN_EMAIL;
    const adminUser = authUserSchema.nullable().parse((await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", operator: "eq", value: adminEmail }],
    })));

    let adminId: string;
    if (!adminUser) {
      const createdAdmin = authUserSchema.parse((await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "user",
          data: {
            name: "Leul Tesfaye",
            email: adminEmail,
            emailVerified: true,
            role: "admin",
            banned: false,
            createdAt: now,
            updatedAt: now,
          },
        },
      })));
      adminId = createdAdmin._id;
      await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "account",
          data: {
            accountId: adminId,
            providerId: "credential",
            userId: adminId,
            password: defaultPasswordHash,
            createdAt: now,
            updatedAt: now,
          },
        },
      });
    } else {
      adminId = adminUser._id;
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "user",
          where: [{ field: "_id", operator: "eq", value: adminId }],
          update: { role: "admin", updatedAt: now },
        },
      });
    }

    // 2. Sample Users to populate Admin Panel
    const sampleUsers = [
      { name: "Sarah Connor", email: "sarah.dev@example.com", role: "user", banned: false },
      { name: "Michael Chang", email: "michael.ops@example.com", role: "admin", banned: false },
      { name: "Alex Rivera", email: "alex.design@example.com", role: "user", banned: false },
      {
        name: "Spam Bot 99",
        email: "spammer99@example.com",
        role: "user",
        banned: true,
        banReason: "Automated spam activities detected",
      },
      { name: "Emma Watson", email: "emma.writer@example.com", role: "user", banned: false },
    ];

    let createdUsersCount = 0;
    for (const sample of sampleUsers) {
      const existing = authUserSchema.nullable().parse((await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "email", operator: "eq", value: sample.email }],
      })));

      if (!existing) {
        const newUser = authUserSchema.parse((await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "user",
            data: {
              name: sample.name,
              email: sample.email,
              emailVerified: true,
              role: sample.role,
              banned: sample.banned,
              banReason: "banReason" in sample ? sample.banReason : null,
              createdAt: now - Math.floor(Math.random() * 7 * 86400000),
              updatedAt: now,
            },
          },
        })));

        const uid = newUser._id;
        await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "account",
            data: {
              accountId: uid,
              providerId: "credential",
              userId: uid,
              password: defaultPasswordHash,
              createdAt: now,
              updatedAt: now,
            },
          },
        });
        createdUsersCount++;
      }
    }

    // 3. Seed Sample Tags for Admin
    const tagColors = [
      { name: "Engineering", color: "#3b82f6" },
      { name: "Design", color: "#ec4899" },
      { name: "Urgent", color: "#ef4444" },
      { name: "Personal", color: "#10b981" },
    ];

    const tagIds: Id<"tags">[] = [];
    for (const t of tagColors) {
      const existingTag = await ctx.db
        .query("tags")
        .withIndex("by_user_name", (q) => q.eq("userId", adminId).eq("name", t.name))
        .first();

      if (existingTag) {
        tagIds.push(existingTag._id);
      } else {
        const newTagId = await ctx.db.insert("tags", {
          name: t.name,
          color: t.color,
          userId: adminId,
          createdAt: now,
        });
        tagIds.push(newTagId);
      }
    }

    // 4. Seed Sample Notes
    const existingNotes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", adminId))
      .first();

    let createdNotesCount = 0;
    if (!existingNotes) {
      await ctx.db.insert("notes", {
        title: "🚀 Welcome to Notes & Canvas!",
        content:
          "<h2>Welcome aboard!</h2><p>This is a rich note powered by Tiptap editor. You can format text, embed links, organize with tags, and pin important thoughts to the top.</p><p>Explore the <strong>Infinite Canvas</strong> and <strong>Kanban Boards</strong> in the navigation above!</p>",
        contentFormat: "html",
        userId: adminId,
        createdAt: now,
        updatedAt: now,
        isPinned: true,
        pinnedAt: now,
        tagIds: [tagIds[0], tagIds[3]],
      });

      await ctx.db.insert("notes", {
        title: "🎨 UI/UX Architecture Review",
        content:
          "<p>Key design principles to keep in mind:</p><ul><li>Maintain clean visual hierarchy</li><li>Responsive layouts for desktop and mobile</li><li>Fast reactive queries powered by Convex Cloud</li></ul>",
        contentFormat: "html",
        userId: adminId,
        createdAt: now - 3600000,
        updatedAt: now - 3600000,
        isPinned: false,
        tagIds: [tagIds[1]],
      });

      await ctx.db.insert("notes", {
        title: "🛡️ Admin Panel Capabilities",
        content:
          "<p>The Admin Panel allows administrators to:</p><ol><li>Inspect all registered users</li><li>Promote or demote user roles</li><li>Ban abusive accounts and terminate active sessions</li><li>Safely delete accounts</li></ol>",
        contentFormat: "html",
        userId: adminId,
        createdAt: now - 7200000,
        updatedAt: now - 7200000,
        isPinned: false,
        tagIds: [tagIds[0], tagIds[2]],
      });
      createdNotesCount = 3;
    }

    // 5. Seed Sample Kanban Board
    const existingBoard = await ctx.db
      .query("kanbanBoards")
      .withIndex("by_user", (q) => q.eq("userId", adminId))
      .first();

    let createdBoardsCount = 0;
    if (!existingBoard) {
      const boardId = await ctx.db.insert("kanbanBoards", {
        title: "Sprint Planning",
        userId: adminId,
        createdAt: now,
        updatedAt: now,
        isPinned: true,
        pinnedAt: now,
      });

      const colTodo = await ctx.db.insert("kanbanColumns", {
        boardId,
        title: "To Do",
        order: 1,
        userId: adminId,
        createdAt: now,
      });

      const colInProgress = await ctx.db.insert("kanbanColumns", {
        boardId,
        title: "In Progress",
        order: 2,
        userId: adminId,
        createdAt: now,
      });

      const colDone = await ctx.db.insert("kanbanColumns", {
        boardId,
        title: "Done",
        order: 3,
        userId: adminId,
        createdAt: now,
      });

      await ctx.db.insert("kanbanCards", {
        boardId,
        columnId: colTodo,
        title: "Review mobile navigation drawer",
        description: "<p>Check responsiveness and touch interactions.</p>",
        order: 1,
        userId: adminId,
        createdAt: now,
        updatedAt: now,
        tagIds: [tagIds[1]],
      });

      await ctx.db.insert("kanbanCards", {
        boardId,
        columnId: colInProgress,
        title: "Verify Admin Panel permissions",
        description: "<p>Ensure non-admin users cannot access admin routes or mutations.</p>",
        order: 1,
        userId: adminId,
        createdAt: now,
        updatedAt: now,
        tagIds: [tagIds[0], tagIds[2]],
      });

      await ctx.db.insert("kanbanCards", {
        boardId,
        columnId: colDone,
        title: "Setup Better Auth Admin Plugin",
        description:
          "<p>Integrated Better Auth admin plugin with local Convex component schema.</p>",
        order: 1,
        userId: adminId,
        createdAt: now,
        updatedAt: now,
        tagIds: [tagIds[0]],
      });

      createdBoardsCount = 1;
    }

    return {
      success: true,
      adminEmail,
      createdUsersCount,
      createdNotesCount,
      createdBoardsCount,
      message: `Remote database seeded. Admin (${adminEmail}) and sample data ready.`,
    };
  },
});

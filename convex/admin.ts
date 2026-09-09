import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { hashPassword } from "better-auth/crypto";

// Helper to enforce admin authorization
async function requireAdmin(ctx: any) {
  const currentUser = await authComponent.safeGetAuthUser(ctx);
  if (!currentUser || currentUser.role !== "admin") {
    throw new Error("Unauthorized: Admin role required");
  }
  return currentUser;
}

/**
 * One-time setup mutation to bootstrap the initial admin user.
 * Creates or updates the user with email and sets role to 'admin'.
 * Default email: leul15370@gmail.com
 * Default password: 12345678 (1-8)
 */
export const setupInitialAdmin = mutation({
  args: {
    email: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const targetEmail = (args.email || "leul15370@gmail.com").trim().toLowerCase();
    const targetPassword = args.password || "12345678";
    const hashedPassword = await hashPassword(targetPassword);

    // Look for existing user by email
    const existingUser = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", operator: "eq", value: targetEmail }],
    })) as any;

    if (existingUser) {
      const userId = existingUser._id || existingUser.id;

      // Update user to admin
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "user",
          where: [{ field: "_id", operator: "eq", value: userId }],
          update: {
            role: "admin",
            banned: false,
            banReason: null,
            updatedAt: Date.now(),
          },
        },
      });

      // Check if credential account exists
      const existingAccount = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "account",
        where: [
          { field: "userId", operator: "eq", value: userId },
          { field: "providerId", operator: "eq", value: "credential" },
        ],
      })) as any;

      if (existingAccount) {
        const accountId = existingAccount._id || existingAccount.id;
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
        message: `Existing user ${targetEmail} promoted to admin with updated password.`,
      };
    } else {
      // Create brand new user
      const now = Date.now();
      const newUser = (await ctx.runMutation(components.betterAuth.adapter.create, {
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
      })) as any;

      const userId = newUser.id || newUser._id;

      // Create credential account with password
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
        message: `New admin user ${targetEmail} created with password.`,
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
    const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { numItems: 500, cursor: null },
    })) as any;

    const users = result?.page || [];

    return users.map((u: any) => ({
      _id: u._id || u.id,
      id: u.id || u._id,
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
 */
export const setRole = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const currentAdminId = (adminUser as any)._id || (adminUser as any).id;
    if (currentAdminId === args.userId) {
      throw new Error("You cannot change your own role");
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", operator: "eq", value: args.userId }],
        update: { role: args.role, updatedAt: Date.now() },
      },
    });

    return { success: true };
  },
});

/**
 * Ban or unban a user.
 */
export const setBanned = mutation({
  args: {
    userId: v.string(),
    banned: v.boolean(),
    banReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const currentAdminId = (adminUser as any)._id || (adminUser as any).id;
    if (currentAdminId === args.userId) {
      throw new Error("You cannot ban yourself");
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", operator: "eq", value: args.userId }],
        update: {
          banned: args.banned,
          banReason: args.banned ? (args.banReason || "Banned by administrator") : null,
          updatedAt: Date.now(),
        },
      },
    });

    // If banning user, terminate all their active sessions
    if (args.banned) {
      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "session",
          where: [{ field: "userId", operator: "eq", value: args.userId }],
        },
        paginationOpts: { numItems: 100, cursor: null },
      });
    }

    return { success: true };
  },
});

/**
 * Permanently delete a user account, sessions, and credentials.
 */
export const deleteUser = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const currentAdminId = (adminUser as any)._id || (adminUser as any).id;
    if (currentAdminId === args.userId) {
      throw new Error("You cannot delete your own account");
    }

    // Delete sessions
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "session",
        where: [{ field: "userId", operator: "eq", value: args.userId }],
      },
      paginationOpts: { numItems: 100, cursor: null },
    });

    // Delete accounts
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "account",
        where: [{ field: "userId", operator: "eq", value: args.userId }],
      },
      paginationOpts: { numItems: 100, cursor: null },
    });

    // Delete user record
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "user",
        where: [{ field: "_id", operator: "eq", value: args.userId }],
      },
    });

    return { success: true };
  },
});

/**
 * Inspection query to view counts of users, notes, tags, and kanban boards on the deployment.
 */
export const getDeploymentStats = query({
  args: {},
  handler: async (ctx) => {
    const userResult = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { numItems: 500, cursor: null },
    })) as any;

    const users = userResult?.page || [];
    const notesCount = (await ctx.db.query("notes").collect()).length;
    const tagsCount = (await ctx.db.query("tags").collect()).length;
    const canvasesCount = (await ctx.db.query("canvases").collect()).length;
    const boardsCount = (await ctx.db.query("kanbanBoards").collect()).length;

    return {
      usersCount: users.length,
      users: users.map((u: any) => ({
        id: u._id || u.id,
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
 */
export const seedSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const defaultPasswordHash = await hashPassword("12345678");

    // 1. Ensure primary admin exists
    const adminEmail = "leul15370@gmail.com";
    let adminUser = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", operator: "eq", value: adminEmail }],
    })) as any;

    let adminId: string;
    if (!adminUser) {
      const createdAdmin = (await ctx.runMutation(components.betterAuth.adapter.create, {
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
      })) as any;
      adminId = createdAdmin._id || createdAdmin.id;
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
      adminId = adminUser._id || adminUser.id;
      // Ensure role is admin
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
      const existing = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "email", operator: "eq", value: sample.email }],
      })) as any;

      if (!existing) {
        const newUser = (await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "user",
            data: {
              name: sample.name,
              email: sample.email,
              emailVerified: true,
              role: sample.role,
              banned: sample.banned,
              banReason: (sample as any).banReason || null,
              createdAt: now - Math.floor(Math.random() * 7 * 86400000),
              updatedAt: now,
            },
          },
        })) as any;

        const uid = newUser._id || newUser.id;
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

    const tagIds: any[] = [];
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
        content: "<h2>Welcome aboard!</h2><p>This is a rich note powered by Tiptap editor. You can format text, embed links, organize with tags, and pin important thoughts to the top.</p><p>Explore the <strong>Infinite Canvas</strong> and <strong>Kanban Boards</strong> in the navigation above!</p>",
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
        content: "<p>Key design principles to keep in mind:</p><ul><li>Maintain clean visual hierarchy</li><li>Responsive layouts for desktop and mobile</li><li>Fast reactive queries powered by Convex Cloud</li></ul>",
        contentFormat: "html",
        userId: adminId,
        createdAt: now - 3600000,
        updatedAt: now - 3600000,
        isPinned: false,
        tagIds: [tagIds[1]],
      });

      await ctx.db.insert("notes", {
        title: "🛡️ Admin Panel Capabilities",
        content: "<p>The Admin Panel allows administrators to:</p><ol><li>Inspect all registered users</li><li>Promote or demote user roles</li><li>Ban abusive accounts and terminate active sessions</li><li>Safely delete accounts</li></ol>",
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
        description: "<p>Integrated Better Auth admin plugin with local Convex component schema.</p>",
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
      message: `Remote database successfully seeded! Admin (${adminEmail}) and ${createdUsersCount} sample users ready.`,
    };
  },
});

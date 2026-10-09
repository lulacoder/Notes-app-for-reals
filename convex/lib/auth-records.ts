import { z } from "zod";

// The component adapter returns untyped records. Validate them once at this boundary.
export const authUserSchema = z.object({
  _id: z.string(),
  _creationTime: z.number().optional(),
  name: z.string(),
  email: z.string(),
  createdAt: z.number(),
  role: z.string().nullish(),
  banned: z.boolean().nullish(),
  banReason: z.string().nullish(),
  banExpires: z.number().nullish(),
  image: z.string().nullish(),
});

export const paginationSchema = z.object({ isDone: z.boolean(), continueCursor: z.string() });
export const authUsersPageSchema = paginationSchema.extend({ page: z.array(authUserSchema) });
export const authAccountSchema = z.object({ _id: z.string(), userId: z.string() });

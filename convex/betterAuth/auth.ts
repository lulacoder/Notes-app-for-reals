import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "../_generated/dataModel";
import { createAuth } from "../auth";

// The Better Auth schema generator only inspects configuration and does not execute queries.
export const auth = createAuth({} as GenericCtx<DataModel>);

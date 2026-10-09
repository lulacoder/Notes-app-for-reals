import { authComponent } from "../auth";
import type { MutationCtx, QueryCtx } from "../_generated/server";

// JWTs can outlive a revoked session. Check the live account before reading or writing data.
export async function getActiveIdentity(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  return user && !user.banned ? { subject: user._id } : null;
}

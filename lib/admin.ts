import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type AdminUser = FunctionReturnType<typeof api.admin.listUsers>[number];
export type DeploymentStats = FunctionReturnType<typeof api.admin.getDeploymentStats>;
export type AdminRoleFilter = "all" | "admin" | "active" | "banned";
export type AdminUserSort = "newest" | "oldest" | "name" | "email";

export interface AdminUserActionHandlers {
  onChangeRole: (user: AdminUser) => void;
  onResetPassword: (user: AdminUser) => void;
  onSuspend: (user: AdminUser) => void;
  onReactivate: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

export const ROOT_ADMIN_EMAIL = "leul15370@gmail.com";

export function getAdminUserProtection(user: AdminUser, currentUserId: string) {
  if (user.email.toLowerCase() === ROOT_ADMIN_EMAIL) {
    return "The primary administrator account is protected.";
  }
  if (user.id === currentUserId) {
    return "You cannot change your own account from the admin panel.";
  }
  return null;
}

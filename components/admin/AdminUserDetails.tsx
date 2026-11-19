"use client";

import { format } from "date-fns";
import { KeyRound, ShieldCheck, Trash2, UserCheck, UserRound, UserX } from "lucide-react";
import { KanbanDropdown } from "@/components/kanban/KanbanDropdown";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getAdminUserProtection, type AdminUser, type AdminUserActionHandlers } from "@/lib/admin";
import { AdminUserAvatar, AdminUserLabels, AdminUserStatusBadge } from "./AdminUserIdentity";

interface AdminUserDetailsProps {
  user: AdminUser | null | undefined;
  currentUserId: string;
  actions: AdminUserActionHandlers;
}

export function AdminUserDetails({ user, currentUserId, actions }: AdminUserDetailsProps) {
  const protection = user ? getAdminUserProtection(user, currentUserId) : null;

  return (
    <aside id="admin-user-details" aria-label="Account details" className="flex scroll-mt-6 flex-col rounded-xl border bg-card p-5 lg:p-6">
      {user ? (
        <>
          <div className="flex items-start gap-3" aria-live="polite">
            <AdminUserAvatar user={user} className="size-14 text-2xl" />
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-lg font-semibold tracking-tight">{user.name}</h2>
              <p className="mt-0.5 break-all text-xs text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <AdminUserStatusBadge user={user} />
                <AdminUserLabels user={user} currentUserId={currentUserId} />
              </div>
            </div>
          </div>

          <div className="mt-7 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-user-role" className="text-xs">Role</Label>
              <KanbanDropdown
                id="admin-user-role"
                label="Account role"
                variant="field"
                value={user.role === "admin" ? "admin" : "user"}
                disabled={Boolean(protection)}
                onChange={(value) => {
                  if (value !== user.role) actions.onChangeRole(user);
                }}
                options={[
                  { value: "user", label: "User" },
                  { value: "admin", label: "Admin" },
                ]}
              />
            </div>
            <dl className="text-sm">
              <dt className="text-xs text-muted-foreground">Joined</dt>
              <dd className="mt-1.5">{user.createdAt ? format(user.createdAt, "MMM d, yyyy") : "—"}</dd>
              {user.banned && (
                <>
                  <dt className="mt-5 text-xs text-muted-foreground">Suspension reason</dt>
                  <dd className="mt-1.5 break-words">{user.banReason || "No reason provided."}</dd>
                  <dt className="mt-5 text-xs text-muted-foreground">Suspension expires</dt>
                  <dd className="mt-1.5">{user.banExpires ? format(user.banExpires, "MMM d, yyyy, h:mm a") : "Permanent"}</dd>
                </>
              )}
            </dl>
            <Button variant="outline" disabled={Boolean(protection)} onClick={() => actions.onResetPassword(user)} className="w-full sm:w-auto lg:w-full">
              <KeyRound className="size-4" />
              Reset password
            </Button>
          </div>

          <div className="mt-auto pt-8">
            {protection ? (
              <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                {protection}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 border-t pt-4 lg:flex-col">
                {user.banned ? (
                  <Button variant="outline" size="sm" onClick={() => actions.onReactivate(user)}>
                    <UserCheck className="size-4" />
                    Reactivate account
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => actions.onSuspend(user)}>
                    <UserX className="size-4" />
                    Suspend account
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => actions.onDelete(user)}>
                  <Trash2 className="size-4" />
                  Delete account
                </Button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex min-h-60 flex-1 flex-col items-center justify-center text-center">
          <UserRound className="mb-3 size-7 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-medium">Account details</h2>
          <p className="mt-1 max-w-52 text-sm text-muted-foreground">{user === undefined ? "Loading account details..." : "Choose an account from the list to manage access."}</p>
        </div>
      )}
    </aside>
  );
}

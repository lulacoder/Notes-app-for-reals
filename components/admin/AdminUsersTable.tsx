"use client";

import { format } from "date-fns";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminUser, AdminUserActionHandlers } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { AdminUserAvatar, AdminUserLabels, AdminUserRoleBadge, AdminUserStatusBadge } from "./AdminUserIdentity";
import { AdminUserMenu } from "./AdminUserMenu";

interface AdminUsersTableProps {
  users: AdminUser[] | undefined;
  totalCount: number;
  selectedUserId: string | null;
  currentUserId: string;
  onSelect: (id: string) => void;
  onResetFilters: () => void;
  actions: AdminUserActionHandlers;
}

export function AdminUsersTable({ users, totalCount, selectedUserId, currentUserId, onSelect, onResetFilters, actions }: AdminUsersTableProps) {
  if (users === undefined) {
    return (
      <div className="space-y-5 p-5" role="status" aria-label="Loading accounts">
        <span className="sr-only">Loading accounts...</span>
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex animate-pulse items-center gap-3 motion-reduce:animate-none">
            <div className="size-9 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <Users className="mx-auto mb-3 size-7 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-medium">{totalCount === 0 ? "No accounts yet" : "No matching accounts"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{totalCount === 0 ? "Create an account to get started." : "Try a different name, email, or filter."}</p>
        {totalCount > 0 && <Button variant="outline" size="sm" className="mt-4" onClick={onResetFilters}>Reset filters</Button>}
      </div>
    );
  }

  return (
    <div className="max-h-[32rem] overflow-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">User accounts. Choose an account to view its details.</caption>
        <thead className="sticky top-0 z-1 bg-card">
          <tr className="border-b text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium">Account</th>
            <th scope="col" className="hidden px-3 py-3 font-medium sm:table-cell">Role</th>
            <th scope="col" className="px-3 py-3 font-medium">Status</th>
            <th scope="col" className="hidden px-3 py-3 font-medium xl:table-cell">Joined</th>
            <th scope="col" className="px-3 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {users.map((user) => {
            const selected = user.id === selectedUserId;
            return (
              <tr key={user.id} className={cn("transition-colors", selected ? "bg-primary/[0.07]" : "hover:bg-muted/40")}>
                <td className="relative w-1/2 max-w-0 px-4 py-3.5 sm:w-[45%]">
                  {selected && <span aria-hidden="true" className="absolute bottom-3 left-0 top-3 w-0.5 rounded-r bg-primary" />}
                  <button
                    type="button"
                    aria-label={`View account for ${user.name}`}
                    aria-pressed={selected}
                    aria-controls="admin-user-details"
                    onClick={() => onSelect(user.id)}
                    className="flex w-full min-w-0 items-center gap-3 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card"
                  >
                    <AdminUserAvatar user={user} className="size-8 sm:size-9" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{user.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{user.email}</span>
                      <span className="flex flex-wrap items-center gap-2"><AdminUserLabels user={user} currentUserId={currentUserId} /></span>
                    </span>
                  </button>
                </td>
                <td className="hidden px-3 py-3.5 sm:table-cell"><AdminUserRoleBadge user={user} /></td>
                <td className="px-3 py-3.5"><AdminUserStatusBadge user={user} /></td>
                <td className="hidden whitespace-nowrap px-3 py-3.5 text-xs text-muted-foreground xl:table-cell">
                  {user.createdAt ? format(user.createdAt, "MMM d, yyyy") : "—"}
                </td>
                <td className="px-3 py-3.5 text-right"><AdminUserMenu user={user} currentUserId={currentUserId} actions={actions} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

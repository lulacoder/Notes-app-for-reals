"use client";

import { KeyRound, MoreHorizontal, Shield, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getAdminUserProtection,
  type AdminUser,
  type AdminUserActionHandlers,
} from "@/lib/admin";

interface AdminUserMenuProps {
  user: AdminUser;
  currentUserId: string;
  actions: AdminUserActionHandlers;
}

export function AdminUserMenu({ user, currentUserId, actions }: AdminUserMenuProps) {
  const protection = getAdminUserProtection(user, currentUserId);

  if (protection) {
    return <span className="text-xs text-muted-foreground" title={protection}>Protected</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => actions.onChangeRole(user)}>
          <Shield className="mr-2 size-4" />
          {user.role === "admin" ? "Demote to user" : "Promote to admin"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.onResetPassword(user)}>
          <KeyRound className="mr-2 size-4" />
          Reset password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.banned ? (
          <DropdownMenuItem onClick={() => actions.onReactivate(user)}>
            <UserCheck className="mr-2 size-4" />
            Reactivate account
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => actions.onSuspend(user)} className="text-destructive focus:text-destructive">
            <UserX className="mr-2 size-4" />
            Suspend account
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => actions.onDelete(user)} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 size-4" />
          Delete account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

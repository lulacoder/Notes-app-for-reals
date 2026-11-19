"use client";

import { ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROOT_ADMIN_EMAIL, type AdminUser } from "@/lib/admin";
import { cn } from "@/lib/utils";

interface AdminUserAvatarProps {
  user: AdminUser;
  className?: string;
}

export function AdminUserAvatar({ user, className }: AdminUserAvatarProps) {
  const initials = (user.name || user.email)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <Avatar className={cn("size-9", className)}>
      {user.image && <AvatarImage src={user.image} alt="" />}
      <AvatarFallback className="bg-primary/10 text-primary text-[0.8em] font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function AdminUserRoleBadge({ user }: { user: AdminUser }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-md border-transparent font-normal",
        user.role === "admin" && "bg-primary/10 text-primary",
      )}
    >
      {user.role === "admin" ? "Admin" : "User"}
    </Badge>
  );
}

export function AdminUserStatusBadge({ user }: { user: AdminUser }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-md border-transparent font-medium",
        user.banned
          ? "bg-destructive/10 text-destructive"
          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {user.banned ? "Suspended" : "Active"}
    </Badge>
  );
}

interface AdminUserLabelsProps {
  user: AdminUser;
  currentUserId: string;
}

export function AdminUserLabels({ user, currentUserId }: AdminUserLabelsProps) {
  return (
    <>
      {user.id === currentUserId && (
        <span className="text-xs font-normal text-muted-foreground">You</span>
      )}
      {user.email.toLowerCase() === ROOT_ADMIN_EMAIL && (
        <span className="inline-flex items-center gap-1 text-xs font-normal text-primary">
          <ShieldCheck className="size-3" aria-hidden="true" />
          Primary admin
        </span>
      )}
    </>
  );
}

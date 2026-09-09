"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  Trash2,
  Users,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";

export interface AdminUser {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason?: string | null;
  banExpires?: number | null;
  createdAt?: number;
  image?: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const users = useQuery(api.admin.listUsers);

  const setRole = useMutation(api.admin.setRole);
  const setBanned = useMutation(api.admin.setBanned);
  const deleteUser = useMutation(api.admin.deleteUser);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user" | "banned">("all");

  // State for Ban Dialog
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUserForBan, setSelectedUserForBan] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [isBanning, setIsBanning] = useState(false);

  // State for Delete Alert Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const typedUsers = users as AdminUser[];
    return typedUsers.filter((user: AdminUser) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (roleFilter === "admin") return user.role === "admin";
      if (roleFilter === "user") return user.role === "user" && !user.banned;
      if (roleFilter === "banned") return user.banned;

      return true;
    });
  }, [users, searchQuery, roleFilter]);

  // Handle loading state
  if (currentUser === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking authorization...</p>
        </div>
      </div>
    );
  }

  // Guard against non-admin access
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-xl border border-destructive/20 bg-destructive/5">
          <div className="inline-flex p-3 rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">
            You do not have administrative privileges to access this page. Please return to the
            dashboard or contact your system administrator.
          </p>
          <Button onClick={() => router.push("/notes")} className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Notes
          </Button>
        </div>
      </div>
    );
  }

  const handleToggleRole = async (targetUser: any) => {
    const nextRole = targetUser.role === "admin" ? "user" : "admin";
    try {
      await setRole({ userId: targetUser.id, role: nextRole });
    } catch (err: any) {
      alert(err.message || "Failed to update user role");
    }
  };

  const handleConfirmBan = async () => {
    if (!selectedUserForBan) return;
    setIsBanning(true);
    try {
      await setBanned({
        userId: selectedUserForBan.id,
        banned: true,
        banReason: banReason.trim() || undefined,
      });
      setBanDialogOpen(false);
      setSelectedUserForBan(null);
      setBanReason("");
    } catch (err: any) {
      alert(err.message || "Failed to ban user");
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnban = async (targetUser: any) => {
    try {
      await setBanned({ userId: targetUser.id, banned: false });
    } catch (err: any) {
      alert(err.message || "Failed to unban user");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUserForDelete) return;
    setIsDeleting(true);
    try {
      await deleteUser({ userId: selectedUserForDelete.id });
      setDeleteDialogOpen(false);
      setSelectedUserForDelete(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const currentUserId = currentUser._id;
  const typedAllUsers = (users || []) as AdminUser[];
  const totalCount = typedAllUsers.length;
  const adminCount = typedAllUsers.filter((u: AdminUser) => u.role === "admin").length;
  const bannedCount = typedAllUsers.filter((u: AdminUser) => u.banned).length;
  const activeCount = totalCount - bannedCount;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6 lg:p-8">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={() => router.push("/notes")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Notes
              </Button>
              <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Portal
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Monitor, grant administrator privileges, and manage accounts.
            </p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border bg-card/60 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Users</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{totalCount}</div>
          </div>
          <div className="p-4 rounded-xl border bg-card/60 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Admins</span>
              <Shield className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{adminCount}</div>
          </div>
          <div className="p-4 rounded-xl border bg-card/60 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Active Users</span>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">{activeCount}</div>
          </div>
          <div className="p-4 rounded-xl border bg-card/60 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Banned</span>
              <UserX className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold">{bannedCount}</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(["all", "admin", "user", "banned"] as const).map((filter) => (
              <Button
                key={filter}
                variant={roleFilter === filter ? "default" : "outline"}
                size="sm"
                className="h-8 capitalize text-xs"
                onClick={() => setRoleFilter(filter)}
              >
                {filter === "all" ? "All Users" : filter}
              </Button>
            ))}
          </div>
        </div>

        {/* Users Table / List */}
        <div className="rounded-xl border bg-card/40 shadow-xs overflow-hidden">
          {users === undefined ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-medium">No users found</p>
              <p className="text-xs text-muted-foreground">
                Try refining your search query or filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 hidden md:table-cell">Created At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredUsers.map((user: AdminUser) => {
                    const isSelf = user.id === currentUserId || user._id === currentUserId;
                    const initial = (user.name || user.email).charAt(0).toUpperCase();

                    return (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border">
                              {user.image && <AvatarImage src={user.image} alt={user.name} />}
                              <AvatarFallback className="text-xs font-semibold bg-muted">
                                {initial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium truncate flex items-center gap-1.5">
                                {user.name}
                                {isSelf && (
                                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {user.role === "admin" ? (
                            <Badge className="bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 gap-1 font-medium">
                              <ShieldCheck className="h-3 w-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="font-normal text-muted-foreground">
                              User
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {user.banned ? (
                            <div className="space-y-0.5">
                              <Badge variant="destructive" className="gap-1 font-medium">
                                <AlertCircle className="h-3 w-3" />
                                Banned
                              </Badge>
                              {user.banReason && (
                                <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                  {user.banReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1 font-medium"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">
                          {user.createdAt
                            ? format(new Date(user.createdAt), "MMM d, yyyy")
                            : "—"}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {isSelf ? (
                            <span className="text-xs text-muted-foreground italic pr-2">
                              Self
                            </span>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleToggleRole(user)}>
                                  <Shield className="mr-2 h-4 w-4" />
                                  {user.role === "admin" ? "Demote to User" : "Promote to Admin"}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {user.banned ? (
                                  <DropdownMenuItem onClick={() => handleUnban(user)}>
                                    <UserCheck className="mr-2 h-4 w-4 text-emerald-600" />
                                    Unban User
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUserForBan(user);
                                      setBanDialogOpen(true);
                                    }}
                                    className="text-amber-600"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Ban User
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUserForDelete(user);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Ban Reason Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="h-5 w-5" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to ban{" "}
              <span className="font-semibold text-foreground">
                {selectedUserForBan?.email}
              </span>
              ? They will be immediately signed out and blocked from logging in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="ban-reason" className="text-xs font-medium">
              Reason for ban (optional)
            </Label>
            <Input
              id="ban-reason"
              placeholder="e.g. Terms of service violation"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanDialogOpen(false)}
              disabled={isBanning}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBan}
              disabled={isBanning}
              className="gap-2"
            >
              {isBanning && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the account for{" "}
              <span className="font-semibold text-foreground">
                {selectedUserForDelete?.email}
              </span>
              , along with their login credentials and active sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

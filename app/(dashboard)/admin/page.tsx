"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, Copy, KeyRound, Loader2, Shield, ShieldAlert, Sparkles, Trash2, UserPlus, UserX } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AdminAccountStats, AdminDeploymentSummary } from "@/components/admin/AdminOverview";
import { AdminUserDetails } from "@/components/admin/AdminUserDetails";
import { AdminUserFilters } from "@/components/admin/AdminUserFilters";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast-notification";
import type { AdminRoleFilter, AdminUser, AdminUserActionHandlers, AdminUserSort } from "@/lib/admin";
import { getErrorMessage } from "@/lib/errors";

const BAN_PRESET_REASONS = [
  "Terms of service violation",
  "Suspicious or abusive activity",
  "Spamming or automated bot behavior",
  "Account security compromise",
  "User request or voluntary deactivation",
];

export default function AdminPage() {
  const { success, error: toastError, info } = useToast();

  const currentUser = useQuery(api.auth.getCurrentUser);
  const isAdmin = currentUser?.role === "admin" && !currentUser.banned;
  const users = useQuery(api.admin.listUsers, isAdmin ? {} : "skip");
  const stats = useQuery(api.admin.getDeploymentStats, isAdmin ? {} : "skip");

  const setRoleMutation = useMutation(api.admin.setRole);
  const setBannedMutation = useMutation(api.admin.setBanned);
  const deleteUserMutation = useMutation(api.admin.deleteUser);
  const createUserMutation = useMutation(api.admin.createUser);
  const resetPasswordMutation = useMutation(api.admin.resetPassword);
  const seedSampleDataMutation = useMutation(api.admin.seedSampleData);

  // Search, filter, and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AdminRoleFilter>("all");
  const [sortBy, setSortBy] = useState<AdminUserSort>("newest");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Role Confirmation Dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<AdminUser | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Ban Dialog state
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUserForBan, setSelectedUserForBan] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<"permanent" | "1d" | "7d" | "30d">("permanent");
  const [isBanning, setIsBanning] = useState(false);

  // Delete Alert Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create User Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [isCreating, setIsCreating] = useState(false);

  // Reset Password Dialog state
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<AdminUser | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Seed sample data state
  const [isSeeding, setIsSeeding] = useState(false);

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = searchQuery.toLowerCase().trim();
    const filtered = users.filter((user) => {
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (roleFilter === "admin") return user.role === "admin";
      if (roleFilter === "active") return !user.banned;
      if (roleFilter === "banned") return user.banned;

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "newest") return (b.createdAt || 0) - (a.createdAt || 0);
      if (sortBy === "oldest") return (a.createdAt || 0) - (b.createdAt || 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "email") return a.email.localeCompare(b.email);
      return 0;
    });
  }, [users, searchQuery, roleFilter, sortBy]);

  // Loading state
  if (currentUser === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Checking authorization...</p>
        </div>
      </div>
    );
  }

  // Guard against non-admin or banned users
  if (!currentUser || currentUser.banned || currentUser.role !== "admin") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl border border-destructive/20 bg-destructive/5 backdrop-blur-sm shadow-xl">
          <div className="inline-flex p-3.5 rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-9 w-9" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Administrative privileges are required to access this portal. If you believe this is
            an error, contact your system administrator.
          </p>
          <Button asChild className="mt-4 gap-2">
            <Link href="/notes"><ArrowLeft className="h-4 w-4" />Back to Notes</Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentUserId = currentUser._id;
  // Store only the ID so the pane follows live updates and never keeps a deleted account.
  const selectedUser = users === undefined
    ? undefined
    : filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null;

  // Handlers
  const handleInitiateToggleRole = (targetUser: AdminUser) => {
    setSelectedUserForRole(targetUser);
    setRoleDialogOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUserForRole) return;
    setIsUpdatingRole(true);
    const targetRole = selectedUserForRole.role === "admin" ? "user" : "admin";
    try {
      await setRoleMutation({
        userId: selectedUserForRole.id,
        role: targetRole,
      });
      success(
        "Role Updated",
        `${selectedUserForRole.name || selectedUserForRole.email} is now assigned the role '${targetRole}'.`
      );
      setRoleDialogOpen(false);
      setSelectedUserForRole(null);
    } catch (err) {
      toastError("Failed to update role", getErrorMessage(err, "An unexpected error occurred."));
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleInitiateBan = (targetUser: AdminUser) => {
    setSelectedUserForBan(targetUser);
    setBanReason("");
    setBanDuration("permanent");
    setBanDialogOpen(true);
  };

  const handleConfirmBan = async () => {
    if (!selectedUserForBan) return;
    setIsBanning(true);

    let banExpires: number | undefined = undefined;
    const now = Date.now();
    if (banDuration === "1d") banExpires = now + 86400000;
    else if (banDuration === "7d") banExpires = now + 7 * 86400000;
    else if (banDuration === "30d") banExpires = now + 30 * 86400000;

    try {
      await setBannedMutation({
        userId: selectedUserForBan.id,
        banned: true,
        banReason: banReason.trim() || undefined,
        banExpires,
      });
      success(
        "User Suspended",
        `${selectedUserForBan.email} has been suspended and their active sessions revoked.`
      );
      setBanDialogOpen(false);
      setSelectedUserForBan(null);
      setBanReason("");
    } catch (err) {
      toastError("Failed to suspend user", getErrorMessage(err, "An unexpected error occurred."));
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnban = async (targetUser: AdminUser) => {
    try {
      await setBannedMutation({ userId: targetUser.id, banned: false });
      success("Account Reactivated", `${targetUser.email} has been unbanned.`);
    } catch (err) {
      toastError("Failed to reactivate user", getErrorMessage(err, "An unexpected error occurred."));
    }
  };

  const handleInitiateDelete = (targetUser: AdminUser) => {
    setSelectedUserForDelete(targetUser);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUserForDelete) return;
    setIsDeleting(true);
    try {
      await deleteUserMutation({ userId: selectedUserForDelete.id });
      success(
        "Account Deleted",
        `${selectedUserForDelete.email} and all user data have been permanently erased.`
      );
      setDeleteDialogOpen(false);
      setSelectedUserForDelete(null);
    } catch (err) {
      toastError("Failed to delete user", getErrorMessage(err, "An unexpected error occurred."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    setIsCreating(true);
    try {
      await createUserMutation({
        name: newName.trim() || "User",
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: newRole,
      });
      success("User Provisioned", `${newEmail} created successfully with role '${newRole}'.`);
      setCreateDialogOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("user");
    } catch (err) {
      toastError("Creation Failed", getErrorMessage(err, "Could not create user account."));
    } finally {
      setIsCreating(false);
    }
  };

  const handleInitiateResetPassword = (targetUser: AdminUser) => {
    setSelectedUserForPassword(targetUser);
    setNewPasswordValue("");
    setCopiedPassword(false);
    setResetPasswordDialogOpen(true);
  };

  const generateStrongPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const values = crypto.getRandomValues(new Uint32Array(14));
    const pwd = Array.from(values, (value) => chars[value % chars.length]).join("");
    setNewPasswordValue(pwd);
    setCopiedPassword(false);
  };

  const handleCopyPassword = () => {
    if (!newPasswordValue) return;
    navigator.clipboard.writeText(newPasswordValue);
    setCopiedPassword(true);
    info("Copied to clipboard", "Password has been copied to your clipboard.");
    setTimeout(() => setCopiedPassword(false), 3000);
  };

  const handleConfirmResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPasswordValue) return;
    setIsResettingPassword(true);
    try {
      await resetPasswordMutation({
        userId: selectedUserForPassword.id,
        newPassword: newPasswordValue,
      });
      success(
        "Password Reset",
        `Password updated for ${selectedUserForPassword.email}. Existing sessions invalidated.`
      );
      setResetPasswordDialogOpen(false);
      setSelectedUserForPassword(null);
      setNewPasswordValue("");
    } catch (err) {
      toastError("Reset Failed", getErrorMessage(err, "Could not reset user password."));
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSeedDemoData = async () => {
    setIsSeeding(true);
    try {
      const res = await seedSampleDataMutation();
      success("Database Seeded", res.message || "Demo data successfully populated.");
    } catch (err) {
      toastError("Seeding Failed", getErrorMessage(err, "Could not seed demo data."));
    } finally {
      setIsSeeding(false);
    }
  };

  const userActions: AdminUserActionHandlers = {
    onChangeRole: handleInitiateToggleRole,
    onResetPassword: handleInitiateResetPassword,
    onSuspend: handleInitiateBan,
    onReactivate: handleUnban,
    onDelete: handleInitiateDelete,
  };

  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-muted/30">
      <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div id="admin-users" className="scroll-mt-6 space-y-5">
          <Link href="/notes" className="inline-flex items-center gap-2 rounded-sm text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="size-4" />
            Back to Notes
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">User management</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Manage accounts, roles, and access.</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <UserPlus className="size-4" />
              Create user
            </Button>
          </div>
        </div>

        <AdminAccountStats users={users} />

        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-label="User accounts" className="min-w-0 overflow-hidden rounded-xl border bg-card">
            <AdminUserFilters
              search={searchQuery}
              role={roleFilter}
              sort={sortBy}
              onSearchChange={setSearchQuery}
              onRoleChange={setRoleFilter}
              onSortChange={setSortBy}
            />
            <AdminUsersTable
              users={users === undefined ? undefined : filteredUsers}
              totalCount={users?.length ?? 0}
              selectedUserId={selectedUser?.id ?? null}
              currentUserId={currentUserId}
              onSelect={setSelectedUserId}
              onResetFilters={() => { setSearchQuery(""); setRoleFilter("all"); }}
              actions={userActions}
            />
            {users !== undefined && (
              <p className="border-t px-4 py-3 text-xs text-muted-foreground" role="status">
                Showing {filteredUsers.length} of {users.length} accounts
              </p>
            )}
          </section>
          <AdminUserDetails user={selectedUser} currentUserId={currentUserId} actions={userActions} />
        </div>

        <AdminDeploymentSummary stats={stats} isSeeding={isSeeding} onSeed={handleSeedDemoData} />
      </div>

      {/* Role Change Confirmation Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Confirm Role Change
            </DialogTitle>
            <DialogDescription className="text-left pt-1">
              Are you sure you want to change the role of{" "}
              <span className="font-semibold text-foreground">
                {selectedUserForRole?.name || selectedUserForRole?.email}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground uppercase">
                {selectedUserForRole?.role === "admin" ? "user" : "admin"}
              </span>
              ?
              {selectedUserForRole?.role !== "admin" && (
                <span className="block mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  Warning: Granting administrator privileges allows full access to user
                  management, role changes, and deployment statistics.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setRoleDialogOpen(false)}
              disabled={isUpdatingRole}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmRoleChange} disabled={isUpdatingRole} className="gap-2">
              {isUpdatingRole && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Role Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="h-5 w-5" />
              Suspend User Account
            </DialogTitle>
            <DialogDescription className="text-left pt-1">
              Suspending{" "}
              <span className="font-semibold text-foreground">
                {selectedUserForBan?.email}
              </span>{" "}
              will terminate all their active sessions immediately and block them from logging in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Preset Reason</Label>
              <div className="flex flex-wrap gap-1.5">
                {BAN_PRESET_REASONS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={banReason === preset ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[11px] rounded-full px-2.5 font-normal"
                    onClick={() => setBanReason(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-ban-reason" className="text-xs font-semibold">
                Reason Description
              </Label>
              <Input
                id="custom-ban-reason"
                placeholder="Enter specific reason for suspension..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ban-duration-select" className="text-xs font-semibold">
                Suspension Duration
              </Label>
              <select
                id="ban-duration-select"
                value={banDuration}
                onChange={(e) => { const value = e.target.value; if (value === "permanent" || value === "1d" || value === "7d" || value === "30d") setBanDuration(value); }}
                className="w-full h-9 px-3 text-xs rounded-lg border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="permanent">Permanent suspension</option>
                <option value="1d">Temporary — 24 Hours</option>
                <option value="7d">Temporary — 7 Days</option>
                <option value="30d">Temporary — 30 Days</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
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
              Confirm Suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Permanently Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left leading-relaxed">
              This action <strong className="text-foreground font-semibold">cannot be undone</strong>.
              All notes, versions, tags, infinite canvases, kanban boards, active sessions, and
              credentials associated with{" "}
              <span className="font-semibold text-foreground">
                {selectedUserForDelete?.email}
              </span>{" "}
              will be permanently and completely deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Provision / Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleCreateUser}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Create user
              </DialogTitle>
              <DialogDescription className="text-left pt-1">
                Create an account and choose its access level.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-name" className="text-xs font-semibold">
                  Full Name
                </Label>
                <Input
                  id="create-name"
                  placeholder="e.g. Jane Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="e.g. jane@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-password" className="text-xs font-semibold">
                  Temporary Password
                </Label>
                <Input
                  id="create-password"
                  type="text"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-role" className="text-xs font-semibold">
                  Role Privilege
                </Label>
                <select
                  id="create-role"
                  value={newRole}
                  onChange={(e) => { const value = e.target.value; if (value === "user" || value === "admin") setNewRole(value); }}
                  className="w-full h-9 px-3 text-xs rounded-lg border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="user">User (Standard Access)</option>
                  <option value="admin">Admin (Full Management Privileges)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="gap-2">
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleConfirmResetPassword}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Reset password
              </DialogTitle>
              <DialogDescription className="text-left pt-1">
                Assign a new password for{" "}
                <span className="font-semibold text-foreground">
                  {selectedUserForPassword?.email}
                </span>
                . Active sessions for this user will be revoked.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-pwd-input" className="text-xs font-semibold">
                    New Password
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-primary gap-1 px-1.5"
                    onClick={generateStrongPassword}
                  >
                    <Sparkles className="h-3 w-3" />
                    Generate Strong Password
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="new-pwd-input"
                    type="text"
                    placeholder="Min. 8 characters"
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    minLength={8}
                    required
                    className="pr-10"
                  />
                  {newPasswordValue && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title="Copy password"
                    >
                      {copiedPassword ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Make sure to share this new password with the user securely.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetPasswordDialogOpen(false)}
                disabled={isResettingPassword}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isResettingPassword} className="gap-2">
                {isResettingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

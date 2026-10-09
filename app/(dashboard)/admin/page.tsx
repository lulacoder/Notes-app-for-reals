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
import { useToast } from "@/components/ui/toast-notification";
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
  KeyRound,
  Database,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Copy,
  Check,
  FileText,
  Layers,
  LayoutDashboard,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/errors";
import type { FunctionReturnType } from "convex/server";

export type AdminUser = FunctionReturnType<typeof api.admin.listUsers>[number];

const ROOT_ADMIN_EMAIL = "leul15370@gmail.com";

const BAN_PRESET_REASONS = [
  "Terms of service violation",
  "Suspicious or abusive activity",
  "Spamming or automated bot behavior",
  "Account security compromise",
  "User request or voluntary deactivation",
];

export default function AdminPage() {
  const router = useRouter();
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
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user" | "banned">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "email">("newest");
  const [showStatsOverview, setShowStatsOverview] = useState(false);

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
    const typedUsers = users.slice();

    const filtered = typedUsers.filter((user: AdminUser) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (roleFilter === "admin") return user.role === "admin";
      if (roleFilter === "user") return user.role === "user" && !user.banned;
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
          <Button onClick={() => router.push("/notes")} className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentUserId = currentUser._id;
  const typedAllUsers = (users || []) as AdminUser[];
  const totalCount = typedAllUsers.length;
  const adminCount = typedAllUsers.filter((u: AdminUser) => u.role === "admin").length;
  const bannedCount = typedAllUsers.filter((u: AdminUser) => u.banned).length;
  const activeCount = totalCount - bannedCount;

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

  const handleCreateUser = async (e: React.FormEvent) => {
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

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-muted-foreground hover:text-foreground -ml-2"
                onClick={() => router.push("/notes")}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Notes
              </Button>
              <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary bg-primary/5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Portal
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Monitor active accounts, govern security privileges, and inspect deployment status.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              onClick={() => setShowStatsOverview((prev) => !prev)}
            >
              <Database className="h-4 w-4 text-primary" />
              <span>Deployment Stats</span>
              {showStatsOverview ? (
                <ChevronUp className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
              )}
            </Button>
            <Button
              size="sm"
              className="h-9 gap-2 text-xs shadow-xs"
              onClick={() => setCreateDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Provision User
            </Button>
          </div>
        </div>

        {/* Collapsible Deployment Stats Overview */}
        {showStatsOverview && (
          <div className="p-5 rounded-2xl border bg-card/60 shadow-xs space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Convex Cloud Health
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 border-dashed"
                onClick={handleSeedDemoData}
                disabled={isSeeding}
              >
                {isSeeding ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 text-amber-500" />
                )}
                Seed Demo Data
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="p-3 rounded-xl border bg-background/50 flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Active Notes</p>
                  <p className="text-lg font-bold">{stats?.notesCount ?? "—"}</p>
                </div>
              </div>
              <div className="p-3 rounded-xl border bg-background/50 flex items-center gap-3">
                <Layers className="h-5 w-5 text-purple-500 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Canvases</p>
                  <p className="text-lg font-bold">{stats?.canvasesCount ?? "—"}</p>
                </div>
              </div>
              <div className="p-3 rounded-xl border bg-background/50 flex items-center gap-3">
                <LayoutDashboard className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Kanban Boards</p>
                  <p className="text-lg font-bold">{stats?.boardsCount ?? "—"}</p>
                </div>
              </div>
              <div className="p-3 rounded-xl border bg-background/50 flex items-center gap-3">
                <Tag className="h-5 w-5 text-rose-500 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Tags Defined</p>
                  <p className="text-lg font-bold">{stats?.tagsCount ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl border bg-card/70 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Accounts</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight">
              {users === undefined ? (
                <div className="h-7 w-12 bg-muted animate-pulse rounded-md" />
              ) : (
                totalCount
              )}
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-card/70 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Administrators</span>
              <Shield className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight">
              {users === undefined ? (
                <div className="h-7 w-12 bg-muted animate-pulse rounded-md" />
              ) : (
                adminCount
              )}
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-card/70 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Users</span>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight">
              {users === undefined ? (
                <div className="h-7 w-12 bg-muted animate-pulse rounded-md" />
              ) : (
                activeCount
              )}
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-card/70 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Suspended</span>
              <UserX className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight">
              {users === undefined ? (
                <div className="h-7 w-12 bg-muted animate-pulse rounded-md" />
              ) : (
                bannedCount
              )}
            </div>
          </div>
        </div>

        {/* Filters, Search and Sorting */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-xs text-muted-foreground hidden sm:inline">
                Sort:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => { const value = e.target.value; if (value === "newest" || value === "oldest" || value === "name" || value === "email") setSortBy(value); }}
                className="h-9 px-2.5 text-xs rounded-lg border bg-card/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name (A-Z)</option>
                <option value="email">Email (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant={roleFilter === "all" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs rounded-full px-3"
                onClick={() => setRoleFilter("all")}
              >
                All ({totalCount})
              </Button>
              <Button
                variant={roleFilter === "admin" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs rounded-full px-3"
                onClick={() => setRoleFilter("admin")}
              >
                Admins ({adminCount})
              </Button>
              <Button
                variant={roleFilter === "user" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs rounded-full px-3"
                onClick={() => setRoleFilter("user")}
              >
                Active ({activeCount})
              </Button>
              <Button
                variant={roleFilter === "banned" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs rounded-full px-3"
                onClick={() => setRoleFilter("banned")}
              >
                Suspended ({bannedCount})
              </Button>
            </div>

            <span className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredUsers.length}</span>{" "}
              of {totalCount} accounts
            </span>
          </div>
        </div>

        {/* User Table and Card List */}
        <div className="rounded-2xl border bg-card/50 shadow-xs overflow-hidden">
          {users === undefined ? (
            /* Skeleton Loading State */
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="h-6 w-16 bg-muted animate-pulse rounded-full hidden sm:block" />
                    <div className="h-6 w-16 bg-muted animate-pulse rounded-full hidden sm:block" />
                    <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            /* Empty Filtered State */
            <div className="p-12 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-muted/60 text-muted-foreground">
                <Users className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold">No accounts match your criteria</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  We couldn&apos;t find any accounts matching &quot;{searchQuery}&quot; or the active
                  filter.
                </p>
              </div>
              {(searchQuery || roleFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setRoleFilter("all");
                  }}
                  className="mt-2 text-xs"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 hidden md:table-cell">Registered</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredUsers.map((user: AdminUser) => {
                    const isSelf = user.id === currentUserId || user._id === currentUserId;
                    const isRootAdmin = user.email.toLowerCase() === ROOT_ADMIN_EMAIL;
                    const initial = (user.name || user.email).charAt(0).toUpperCase();

                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          isSelf ? "bg-primary/[0.02]" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border/60 shrink-0">
                              {user.image && <AvatarImage src={user.image} alt={user.name} />}
                              <AvatarFallback className="text-xs font-bold bg-muted text-muted-foreground">
                                {initial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 max-w-[200px] sm:max-w-xs">
                              <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                    You
                                  </span>
                                )}
                                {isRootAdmin && (
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50">
                                    Primary Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {user.role === "admin" ? (
                            <Badge className="bg-purple-600/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 gap-1 font-semibold text-xs py-0.5">
                              <ShieldCheck className="h-3 w-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="font-normal text-muted-foreground text-xs py-0.5"
                            >
                              User
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {user.banned ? (
                            <div className="space-y-0.5">
                              <Badge variant="destructive" className="gap-1 font-semibold text-xs py-0.5">
                                <AlertCircle className="h-3 w-3" />
                                Suspended
                              </Badge>
                              {user.banReason && (
                                <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                                  {user.banReason}
                                </p>
                              )}
                              {user.banExpires && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  Expires {format(new Date(user.banExpires), "MMM d")}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 gap-1.5 font-medium text-xs py-0.5"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-muted-foreground hidden md:table-cell">
                          {user.createdAt
                            ? format(new Date(user.createdAt), "MMM d, yyyy")
                            : "—"}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isSelf ? (
                            <span className="text-xs text-muted-foreground italic pr-2 select-none">
                              Self
                            </span>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-lg hover:bg-muted"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl">
                                {isRootAdmin ? (
                                  <div className="p-2 text-xs text-muted-foreground italic">
                                    Primary administrator account is protected.
                                  </div>
                                ) : (
                                  <>
                                    <DropdownMenuItem onClick={() => handleInitiateToggleRole(user)}>
                                      <Shield className="mr-2 h-4 w-4" />
                                      {user.role === "admin"
                                        ? "Demote to User"
                                        : "Promote to Admin"}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => handleInitiateResetPassword(user)}
                                    >
                                      <KeyRound className="mr-2 h-4 w-4 text-blue-500" />
                                      Reset Password
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    {user.banned ? (
                                      <DropdownMenuItem onClick={() => handleUnban(user)}>
                                        <UserCheck className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        Reactivate Account
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => handleInitiateBan(user)}
                                        className="text-amber-600 dark:text-amber-400"
                                      >
                                        <UserX className="mr-2 h-4 w-4" />
                                        Suspend Account
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      onClick={() => handleInitiateDelete(user)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Account
                                    </DropdownMenuItem>
                                  </>
                                )}
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
                Provision New Account
              </DialogTitle>
              <DialogDescription className="text-left pt-1">
                Create a registered account with direct credentials and assign an authorization role.
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
                Provision Account
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
                <KeyRound className="h-5 w-5 text-blue-500" />
                Reset User Password
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

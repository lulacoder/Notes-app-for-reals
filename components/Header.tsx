"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { useConvexAuth, type Preloaded } from "convex/react";
import {
  LogOut,
  Keyboard,
  Download,
  Command,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { signOut } from "@/lib/auth-client";
import { getAuthHref, replaceAuthLocation } from "@/lib/auth-redirects";
import { useToast } from "@/components/ui/toast-notification";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShortcutHints } from "@/components/KeyboardShortcuts";
import { usePWAInstall } from "@/components/MobileNav";
import { Brand } from "@/components/marketing/Brand";
import { cn } from "@/lib/utils";
import { useWorkspaceNavigation } from "@/providers/workspace-navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HeaderProps {
  onOpenSearch?: () => void;
  preloadedCurrentUser: Preloaded<typeof api.auth.getCurrentUser>;
}

export function Header({ onOpenSearch, preloadedCurrentUser }: HeaderProps) {
  const currentUser = usePreloadedAuthQuery(preloadedCurrentUser);
  const router = useRouter();
  const pathname = usePathname();
  const { openSearch } = useWorkspaceNavigation();
  const search = onOpenSearch ?? openSearch;
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { error: showError } = useToast();
  const navigating = useRef(false);
  const [signingOut, setSigningOut] = useState(false);
  const { isInstallable, install } = usePWAInstall();

  useEffect(() => {
    if (navigating.current || isLoading || signingOut) return;
    if (!isAuthenticated || currentUser === null || currentUser?.banned) {
      navigating.current = true;
      const returnTo =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      const href = getAuthHref(
        "login",
        returnTo,
        currentUser?.banned ? "banned" : "expired",
      );
      // Clear a suspended account's cookie before showing the sign-in form.
      if (currentUser?.banned) {
        void signOut()
          .catch(() => {})
          .finally(() => replaceAuthLocation(href));
      } else {
        replaceAuthLocation(href);
      }
    }
  }, [currentUser, isLoading, isAuthenticated, signingOut]);

  const handleSignOut = async () => {
    if (navigating.current) return;
    navigating.current = true;
    setSigningOut(true);
    try {
      const result = await signOut();
      if (result.error)
        throw new Error(result.error.message || "Please try again.");
      // Discard private route caches and keep expiry from racing manual sign-out.
      replaceAuthLocation("/");
    } catch (error) {
      console.error("Could not sign out", error);
      navigating.current = false;
      setSigningOut(false);
      showError(
        "Could not sign out",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const userEmail = currentUser?.email || "";
  const userName = currentUser?.name || "";
  const userInitial = (userName || userEmail).charAt(0).toUpperCase() || "U";

  return (
    <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-4">
        <Link
          href="/notes"
          aria-label="Noteworthy, back to notes"
          className="shrink-0 [&>span>span]:hidden sm:[&>span>span]:inline"
        >
          <Brand />
        </Link>
        <nav
          aria-label="Workspace"
          className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 text-xs sm:text-sm"
        >
          {[
            { href: "/notes", label: "Notes" },
            { href: "/canvas", label: "Canvas" },
            { href: "/kanban", label: "Boards" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1.5 transition-colors sm:px-4",
                pathname.startsWith(item.href)
                  ? "bg-background text-primary shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {currentUser && (
          <div className="flex items-center gap-2">
            {/* Quick search button */}
            {search && (
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center gap-2 text-muted-foreground"
                onClick={search}
                aria-label="Search notes"
              >
                <Command className="h-3 w-3" />
                <span>K</span>
              </Button>
            )}

            {/* Keyboard shortcuts */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hidden sm:flex"
                  aria-label="Keyboard shortcuts"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <ShortcutHints />
              </PopoverContent>
            </Popover>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm max-w-[150px] truncate">
                    {userName || userEmail}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{userName || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userEmail}
                  </p>
                </div>
                <DropdownMenuSeparator />
                {currentUser?.role === "admin" && (
                  <>
                    <DropdownMenuItem onClick={() => router.push("/admin")}>
                      <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                      Admin Panel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {isInstallable && (
                  <>
                    <DropdownMenuItem onClick={install}>
                      <Download className="mr-2 h-4 w-4" />
                      Install App
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/trash">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Recently deleted
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {signingOut ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}

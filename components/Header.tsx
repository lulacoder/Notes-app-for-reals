"use client";

import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { signOut } from "@/lib/auth-client";
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
import {
  LogOut,
  StickyNote,
  Keyboard,
  Download,
  Command,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HeaderProps {
  onOpenSearch?: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const router = useRouter();
  const { isInstallable, install } = usePWAInstall();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const userEmail = currentUser?.email || "";
  const userName = currentUser?.name || "";
  const userInitial = (userName || userEmail).charAt(0).toUpperCase() || "U";

  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <StickyNote className="h-6 w-6 text-blue-500" />
          <span className="font-semibold text-lg">Notes</span>
        </div>

        {isAuthenticated && currentUser && (
          <div className="flex items-center gap-2">
            {/* Quick search button */}
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex items-center gap-2 text-muted-foreground"
              onClick={onOpenSearch}
            >
              <Command className="h-3 w-3" />
              <span>K</span>
            </Button>

            {/* Keyboard shortcuts */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hidden sm:flex">
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
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs dark:bg-blue-900 dark:text-blue-300">
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
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
                <DropdownMenuSeparator />
                {isInstallable && (
                  <>
                    <DropdownMenuItem onClick={install}>
                      <Download className="mr-2 h-4 w-4" />
                      Install App
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}

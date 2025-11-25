"use client";

import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";

export function Header() {
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const userEmail = currentUser?.user?.email || "";
  const userInitial = userEmail.charAt(0).toUpperCase() || "U";

  return (
    <header className="border-b bg-white">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <StickyNote className="h-6 w-6 text-blue-600" />
          <span className="font-semibold text-lg">Notes</span>
        </div>

        {isAuthenticated && currentUser && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600 hidden sm:inline">
                {userEmail}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

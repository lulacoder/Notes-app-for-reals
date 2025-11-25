"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StickyNote, Loader2 } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/notes");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4">
      <div className="text-center max-w-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-100 rounded-2xl">
            <StickyNote className="h-16 w-16 text-blue-600" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4">
          Your thoughts, organized
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          A simple, beautiful note-taking app with real-time sync and Markdown support.
          Start capturing your ideas today.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link href="/register">Get Started Free</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-white rounded-xl shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">📝 Markdown Support</h3>
            <p className="text-sm text-gray-600">
              Write with headings, bold, italic, code blocks, and more. Live preview as you type.
            </p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">⚡ Real-time Sync</h3>
            <p className="text-sm text-gray-600">
              Your notes are automatically saved and synced across all your devices instantly.
            </p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">🔍 Full-text Search</h3>
            <p className="text-sm text-gray-600">
              Find any note instantly by searching through titles and content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Sparkles, 
  Zap, 
  Search, 
  Shield, 
  ArrowRight,
  CheckCircle2,
  StickyNote
} from "lucide-react";
import Image from "next/image";

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Noteworthy"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="font-bold text-xl tracking-tight">Noteworthy</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Sign In
            </Link>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-50" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] opacity-30" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">New: Canvas Mode Available</span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Capture thoughts, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              unleash creativity.
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            A beautiful, powerful workspace for your notes, docs, and projects. 
            Experience real-time collaboration with a touch of elegance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Button asChild size="lg" className="h-12 px-8 text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:scale-105">
              <Link href="/register">
                Start Writing Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-lg border-border hover:bg-secondary/80 backdrop-blur-sm">
              <Link href="/login">Live Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-secondary/30 border-y border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to stay organized</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features wrapped in a stunning interface designed for focus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: "AI-Enhanced",
                desc: "Smart suggestions and auto-formatting to keep your notes clean and organized."
              },
              {
                icon: Zap,
                title: "Real-time Sync",
                desc: "Instantly available on all your devices. Never lose a thought again."
              },
              {
                icon: Search,
                title: "Instant Search",
                desc: "Find anything in milliseconds with our powerful fuzzy search engine."
              },
              {
                icon: Shield,
                title: "Secure & Private",
                desc: "Your data is encrypted and safe. You own your notes, always."
              },
              {
                icon: CheckCircle2,
                title: "Task Management",
                desc: "Turn notes into actionable tasks with checkboxes and progress tracking."
              },
              {
                icon: StickyNote,
                title: "Rich Text Editor",
                desc: "Markdown support, code blocks, and beautiful typography out of the box."
              }
            ].map((feature, i) => (
              <div 
                key={i}
                className="group p-6 rounded-2xl bg-background border border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Noteworthy"
              width={28}
              height={28}
              className="rounded-lg"
            />
            <span className="font-semibold text-lg">Noteworthy</span>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Twitter</a>
            <a href="#" className="hover:text-primary transition-colors">GitHub</a>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Noteworthy App. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

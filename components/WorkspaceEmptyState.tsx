import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WorkspaceEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  headingAs?: "h1" | "h2";
  className?: string;
  children?: ReactNode;
}

export function WorkspaceEmptyState({ icon, title, description, headingAs: Heading = "h2", className, children }: WorkspaceEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-5 px-6 py-12 text-center", className)}>
      <div className="rounded-2xl bg-primary/10 p-5 text-primary">{icon}</div>
      <div>
        <Heading className="text-2xl font-semibold">{title}</Heading>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

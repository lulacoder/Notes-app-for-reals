"use client";

import { FileText, Layers, LayoutDashboard, Loader2, Shield, Sparkles, Tag, UserCheck, Users, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminUser, DeploymentStats } from "@/lib/admin";
import { cn } from "@/lib/utils";

export function AdminAccountStats({ users }: { users: AdminUser[] | undefined }) {
  const metrics = [
    { label: "Total accounts", value: users?.length, icon: Users },
    { label: "Active users", value: users?.filter((user) => !user.banned).length, icon: UserCheck },
    { label: "Administrators", value: users?.filter((user) => user.role === "admin").length, icon: Shield },
    { label: "Suspended", value: users?.filter((user) => user.banned).length, icon: UserX },
  ];

  return (
    <dl aria-label="Account overview" className="grid grid-cols-2 gap-y-5 rounded-xl border bg-card py-5 sm:grid-cols-4">
      {metrics.map(({ label, value, icon: Icon }, index) => (
        <div key={label} className={cn("flex items-center gap-3 px-4 sm:px-5", index % 2 === 1 && "border-l", index === 2 && "sm:border-l")}>
          <Icon className="hidden size-5 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
          <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value === undefined ? "—" : value.toLocaleString("en-US")}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

interface AdminDeploymentSummaryProps {
  stats: DeploymentStats | undefined;
  isSeeding: boolean;
  onSeed: () => void;
}

export function AdminDeploymentSummary({ stats, isSeeding, onSeed }: AdminDeploymentSummaryProps) {
  const metrics = [
    { label: "Notes", value: stats?.notesCount, icon: FileText },
    { label: "Canvases", value: stats?.canvasesCount, icon: Layers },
    { label: "Boards", value: stats?.boardsCount, icon: LayoutDashboard },
    { label: "Tags", value: stats?.tagsCount, icon: Tag },
  ];

  return (
    <section id="admin-deployment" aria-labelledby="admin-deployment-title" className="flex scroll-mt-6 flex-wrap items-center gap-5 rounded-xl border bg-card p-5">
      <h2 id="admin-deployment-title" className="text-sm font-semibold">Deployment</h2>
      <dl className="grid min-w-0 flex-1 basis-full grid-cols-2 gap-5 sm:basis-auto sm:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 sm:border-l sm:pl-5">
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{value === undefined ? "—" : value.toLocaleString("en-US")}</dd>
            </div>
          </div>
        ))}
      </dl>
      <Button variant="outline" size="sm" onClick={onSeed} disabled={isSeeding}>
        {isSeeding ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {isSeeding ? "Seeding..." : "Seed demo data"}
      </Button>
    </section>
  );
}

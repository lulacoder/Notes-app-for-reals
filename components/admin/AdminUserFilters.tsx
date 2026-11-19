"use client";

import { ArrowDownWideNarrow, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminRoleFilter, AdminUserSort } from "@/lib/admin";
import { cn } from "@/lib/utils";

interface AdminUserFiltersProps {
  search: string;
  role: AdminRoleFilter;
  sort: AdminUserSort;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: AdminRoleFilter) => void;
  onSortChange: (value: AdminUserSort) => void;
}

const FILTERS: { value: AdminRoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admins" },
  { value: "active", label: "Active" },
  { value: "banned", label: "Suspended" },
];

export function AdminUserFilters({ search, role, sort, onSearchChange, onRoleChange, onSortChange }: AdminUserFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b p-4">
      <div className="relative min-w-40 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          aria-label="Search users by name or email"
          placeholder="Search users..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="bg-background pl-9 pr-9 shadow-none"
        />
        {search && (
          <Button variant="ghost" size="icon-sm" className="absolute right-0.5 top-0.5" aria-label="Clear search" onClick={() => onSearchChange("")}>
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="relative">
        <ArrowDownWideNarrow className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <select
          aria-label="Sort users"
          value={sort}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "newest" || value === "oldest" || value === "name" || value === "email") onSortChange(value);
          }}
          className="h-9 rounded-md border bg-background pl-8 pr-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name (A–Z)</option>
          <option value="email">Email (A–Z)</option>
        </select>
      </div>
      <div className="flex w-full gap-1" role="group" aria-label="Filter users">
        {FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant="ghost"
            size="sm"
            aria-pressed={role === filter.value}
            onClick={() => onRoleChange(filter.value)}
            className={cn("flex-1 text-xs sm:flex-none sm:px-4", role === filter.value ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : "text-muted-foreground")}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

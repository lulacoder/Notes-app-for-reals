"use client";

import { useState, type ReactNode } from "react";
import { Search, Trash2 } from "lucide-react";
import { KanbanDropdown } from "@/components/kanban/KanbanDropdown";

interface TrashItem {
  _id: string;
  title?: string;
  deletedAt?: number;
}

interface TrashGroupsProps<T extends TrashItem> {
  items: T[];
  kind: string;
  renderItem: (item: T) => ReactNode;
}

export function TrashGroups<T extends TrashItem>({ items, kind, renderItem }: TrashGroupsProps<T>) {
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("newest");
  const [now] = useState(() => Date.now());
  const filtered = items
    .filter((item) => (item.title || "Untitled").toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => order === "newest" ? (b.deletedAt || 0) - (a.deletedAt || 0) : (a.deletedAt || 0) - (b.deletedAt || 0));
  const cutoff = now - 7 * 24 * 60 * 60 * 1000;
  const groups = [
    { label: "Last 7 days", items: filtered.filter((item) => (item.deletedAt || 0) >= cutoff) },
    { label: "Earlier", items: filtered.filter((item) => (item.deletedAt || 0) < cutoff) },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Deleted {kind} <span className="text-sm font-normal text-muted-foreground">({items.length})</span></h2>
          <p className="mt-1 text-sm text-muted-foreground">Find and restore items from your workspace.</p>
        </div>
        {items.length > 0 && <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input aria-label={`Search deleted ${kind}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${kind}...`} className="h-9 w-48 rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <KanbanDropdown
            label="Sort by deletion date"
            value={order}
            onChange={setOrder}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
            ]}
          />
        </div>}
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-16 text-center">
          <Trash2 className="mx-auto mb-4 size-10 text-muted-foreground/50" />
          <p className="font-medium">No deleted {kind}.</p>
          <p className="mt-1 text-sm text-muted-foreground">Deleted {kind} will appear here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No deleted {kind} match your search.</p>
      ) : groups.filter((group) => group.items.length > 0).sort((a, b) => order === "oldest" ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label)).map((group) => (
        <section key={group.label} className="rounded-xl border bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-semibold">{group.label} <span className="ml-1 text-muted-foreground">{group.items.length}</span></h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.items.map(renderItem)}</ul>
        </section>
      ))}
    </div>
  );
}

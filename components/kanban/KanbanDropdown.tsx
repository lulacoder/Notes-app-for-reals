"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import styles from "./Kanban.module.css";

interface KanbanDropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: "filter" | "field";
}

export function KanbanDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Unavailable filter",
  variant = "filter",
}: KanbanDropdownProps) {
  const selected = options.find((option) => option.value === value);
  const selectedLabel = selected?.label ?? placeholder;
  const isField = variant === "field";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={options.length === 0}>
        <Button
          type="button"
          variant="outline"
          size={isField ? "lg" : "sm"}
          aria-label={`${label}: ${selectedLabel}`}
          className={cn(
            "border-border/70 bg-background shadow-none hover:bg-muted/50",
            isField
              ? "h-12 w-full min-w-0 justify-between gap-3 rounded-lg px-4"
              : "h-9 max-w-[160px] gap-2 px-3 text-xs",
            styles.filterTrigger,
          )}
        >
          <span className={cn("truncate", isField && !selected && "text-muted-foreground")}>
            {selectedLabel}
          </span>
          <ChevronDown aria-hidden="true" className={cn("text-muted-foreground", isField ? "size-4" : "size-3.5")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={isField ? 8 : 6}
        className={cn(
          "rounded-xl border-border/60 p-1.5 shadow-md",
          isField
            ? "w-(--radix-dropdown-menu-trigger-width) min-w-0 max-w-(--radix-dropdown-menu-content-available-width)"
            : "min-w-44",
          styles.menu,
        )}
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="my-0.5 rounded-lg py-2.5 text-sm">
              <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

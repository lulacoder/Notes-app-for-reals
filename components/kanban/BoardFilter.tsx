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

interface BoardFilterProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function BoardFilter({ label, value, options, onChange }: BoardFilterProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? "Unavailable filter";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`${label}: ${selectedLabel}`}
          className={cn("h-9 max-w-[160px] gap-2 border-border/70 bg-background px-3 text-xs shadow-none hover:bg-muted/50", styles.filterTrigger)}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className={cn("min-w-44 rounded-xl border-border/60 p-1.5 shadow-md", styles.menu)}>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="my-0.5 rounded-lg py-2.5 text-sm">
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

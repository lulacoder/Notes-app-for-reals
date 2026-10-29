"use client";

import type { Tool } from "@/lib/canvas/model";
import type { SaveState } from "@/lib/use-autosave";
import { Button } from "@/components/ui/button";
import { SaveStatus } from "@/components/SaveStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Circle,
  Download,
  Eraser,
  FileText,
  GitBranch,
  Hand,
  List,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";

interface Props {
  tool: Tool;
  onTool: (tool: Tool) => void;
  onNotes: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  onClear: () => void;
  onObjects: () => void;
  status: SaveState;
  retry: () => void;
}

export function CanvasToolbar(props: Props) {
  return (
    <div
      role="toolbar"
      aria-label="Canvas tools"
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-background px-2 py-2"
    >
      {[
        { id: "select", label: "Select objects", Icon: MousePointer2 },
        { id: "pan", label: "Pan canvas", Icon: Hand },
        { id: "sticky", label: "Add sticky note", Icon: StickyNote },
        { id: "text", label: "Add text", Icon: Type },
      ].map(({ id, label, Icon }) => (
        <Button
          key={id}
          variant={props.tool === id ? "secondary" : "ghost"}
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label={label}
          aria-pressed={props.tool === id}
          title={label}
          onClick={() => {
            if (
              id === "select" ||
              id === "pan" ||
              id === "sticky" ||
              id === "text"
            )
              props.onTool(id);
          }}
        >
          <Icon size={17} />
        </Button>
      ))}
      <span className="mx-1 h-5 shrink-0 border-l" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Shapes and drawing tools"
            title="Shapes and drawing tools"
          >
            <Square size={17} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {[
            { id: "rectangle", label: "Rectangle", Icon: Square },
            { id: "circle", label: "Circle", Icon: Circle },
            { id: "line", label: "Line", Icon: Minus },
            { id: "pen", label: "Freehand pen", Icon: Pencil },
            { id: "mindmap", label: "Mind map", Icon: GitBranch },
            { id: "eraser", label: "Eraser", Icon: Eraser },
          ].map(({ id, label, Icon }) => (
            <DropdownMenuItem
              key={id}
              onClick={() => {
                if (
                  id === "rectangle" ||
                  id === "circle" ||
                  id === "line" ||
                  id === "pen" ||
                  id === "mindmap" ||
                  id === "eraser"
                )
                  props.onTool(id);
              }}
            >
              <Icon size={15} />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        aria-label="Embed a note"
        title="Embed a note"
        onClick={props.onNotes}
      >
        <FileText size={17} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden h-9 w-9 shrink-0 sm:inline-flex"
        aria-label="Undo canvas change"
        title="Undo"
        disabled={!props.canUndo}
        onClick={props.undo}
      >
        <Undo2 size={17} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden h-9 w-9 shrink-0 sm:inline-flex"
        aria-label="Redo canvas change"
        title="Redo"
        disabled={!props.canRedo}
        onClick={props.redo}
      >
        <Redo2 size={17} />
      </Button>
      <div className="ml-auto hidden px-2 md:block">
        <SaveStatus status={props.status} retry={props.retry} />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Canvas actions"
          >
            <MoreHorizontal size={17} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={props.onObjects}>
            <List size={15} />
            Select an object
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!props.canUndo} onClick={props.undo}>
            <Undo2 size={15} />
            Undo
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!props.canRedo} onClick={props.redo}>
            <Redo2 size={15} />
            Redo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={props.onExport}>
            <Download size={15} />
            Export entire canvas
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={props.onClear}
          >
            <Trash2 size={15} />
            Clear canvas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

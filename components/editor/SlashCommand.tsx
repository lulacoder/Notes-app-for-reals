"use client";

import type { Editor } from "@tiptap/react";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Image as ImageIcon,
  Table,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlashCommandMenuProps {
  editor: Editor;
  onImageUpload?: (file: File) => Promise<string>;
}

interface CommandDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

// Static command definitions (no refs or dynamic content)
const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    id: "heading1",
    title: "Heading 1",
    description: "Large section heading",
    icon: <Heading1 className="h-5 w-5" />,
  },
  {
    id: "heading2",
    title: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2 className="h-5 w-5" />,
  },
  {
    id: "heading3",
    title: "Heading 3",
    description: "Small section heading",
    icon: <Heading3 className="h-5 w-5" />,
  },
  {
    id: "bulletList",
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: <List className="h-5 w-5" />,
  },
  {
    id: "numberedList",
    title: "Numbered List",
    description: "Create a numbered list",
    icon: <ListOrdered className="h-5 w-5" />,
  },
  {
    id: "quote",
    title: "Quote",
    description: "Capture a quote",
    icon: <Quote className="h-5 w-5" />,
  },
  {
    id: "codeBlock",
    title: "Code Block",
    description: "Add a code snippet",
    icon: <Code className="h-5 w-5" />,
  },
  {
    id: "divider",
    title: "Divider",
    description: "Horizontal line separator",
    icon: <Minus className="h-5 w-5" />,
  },
  {
    id: "image",
    title: "Image",
    description: "Upload an image",
    icon: <ImageIcon className="h-5 w-5" />,
  },
  {
    id: "table",
    title: "Table",
    description: "Insert a table",
    icon: <Table className="h-5 w-5" />,
  },
];

export function SlashCommandMenu({ editor, onImageUpload }: SlashCommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter commands based on query
  const filteredCommands = COMMAND_DEFINITIONS.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  // Execute command by ID
  const executeCommand = useCallback((commandId: string) => {
    switch (commandId) {
      case "heading1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "heading2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "heading3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "numberedList":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "quote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "codeBlock":
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case "divider":
        editor.chain().focus().setHorizontalRule().run();
        break;
      case "image":
        fileInputRef.current?.click();
        break;
      case "table":
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
    }
  }, [editor]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsOpen(false);
  };

  const selectCommand = useCallback(
    (index: number) => {
      const command = filteredCommands[index];
      if (command) {
        // Delete the slash command text
        const { from } = editor.state.selection;
        const slashPos = from - query.length - 1;
        editor.chain().focus().deleteRange({ from: slashPos, to: from }).run();
        executeCommand(command.id);
        setIsOpen(false);
        setQuery("");
      }
    },
    [editor, filteredCommands, query, executeCommand]
  );

  // Listen for slash command trigger
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        selectCommand(selectedIndex);
      } else if (event.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands.length, selectCommand]);

  // Watch for "/" character typed
  useEffect(() => {
    const handleUpdate = () => {
      const { state } = editor;
      const { from } = state.selection;
      const text = state.doc.textBetween(Math.max(0, from - 50), from, "\n");
      
      // Find the last "/" and get the query after it
      const slashIndex = text.lastIndexOf("/");
      
      if (slashIndex !== -1) {
        const queryText = text.slice(slashIndex + 1);
        
        // Check if we're at the start of a line or after a space
        const beforeSlash = slashIndex > 0 ? text[slashIndex - 1] : "\n";
        if (beforeSlash === "\n" || beforeSlash === " " || slashIndex === 0) {
          setQuery(queryText);
          setIsOpen(true);
          setSelectedIndex(0);

          // Get cursor position for menu placement
          const coords = editor.view.coordsAtPos(from);
          setPosition({
            top: coords.bottom + 8,
            left: coords.left,
          });
          return;
        }
      }
      
      if (isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);
    
    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor, isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!isOpen || filteredCommands.length === 0) return null;

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-50 w-72 max-h-80 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg p-1"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 inline mr-1" />
          Slash Commands
        </div>
        {filteredCommands.map((command, index) => (
          <button
            key={command.id}
            onClick={() => selectCommand(index)}
            className={cn(
              "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
              {command.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{command.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {command.description}
              </div>
            </div>
          </button>
        ))}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />
    </>
  );
}

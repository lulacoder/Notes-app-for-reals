"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Typography from "@tiptap/extension-typography";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useEffect, forwardRef, useImperativeHandle, useState } from "react";
import { EditorToolbar } from "./EditorToolbar";
import { SlashCommandMenu } from "./SlashCommand";
import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

export interface RichTextEditorRef {
  getHTML: () => string;
  getJSON: () => object;
  getText: () => string;
  focus: () => void;
  clear: () => void;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  function RichTextEditor(
    {
      content,
      onChange,
      onImageUpload,
      placeholder = "Start writing... Use '/' for commands",
      editable = true,
      className,
    },
    ref
  ) {
    const [isMounted, setIsMounted] = useState(false);

    // Ensure we only render on client
    useEffect(() => {
      setIsMounted(true);
    }, []);

    const editor = useEditor({
      immediatelyRender: false, // Disable SSR rendering to prevent hydration errors
      extensions: [
        StarterKit.configure({
          codeBlock: false, // We use CodeBlockLowlight instead
          heading: {
            levels: [1, 2, 3],
          },
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
        }),
        Image.configure({
          allowBase64: true,
          HTMLAttributes: {
            class: "rounded-lg max-w-full h-auto mx-auto my-4",
          },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline underline-offset-2 cursor-pointer",
          },
        }),
        Underline,
        Typography,
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: "border-collapse border border-border my-4",
          },
        }),
        TableRow,
        TableHeader.configure({
          HTMLAttributes: {
            class: "border border-border bg-muted px-3 py-2 text-left font-semibold",
          },
        }),
        TableCell.configure({
          HTMLAttributes: {
            class: "border border-border px-3 py-2",
          },
        }),
        CodeBlockLowlight.configure({
          lowlight,
          HTMLAttributes: {
            class: "bg-zinc-900 text-zinc-100 rounded-lg p-4 my-4 overflow-x-auto text-sm font-mono",
          },
        }),
      ],
      content: content || "",
      editable,
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-6 py-4",
            "prose-headings:font-semibold prose-headings:tracking-tight",
            "prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4",
            "prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3",
            "prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2",
            "prose-p:leading-relaxed prose-p:mb-4",
            "prose-ul:my-4 prose-ol:my-4",
            "prose-li:my-1",
            "prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground",
            "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
            "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
            "prose-hr:border-border prose-hr:my-8",
            "prose-img:rounded-lg prose-img:shadow-md",
            className
          ),
        },
        handleDrop: (view, event, _slice, moved) => {
          if (!moved && event.dataTransfer?.files?.length && onImageUpload) {
            const file = event.dataTransfer.files[0];
            if (file.type.startsWith("image/")) {
              event.preventDefault();
              onImageUpload(file).then((url) => {
                const { tr } = view.state;
                const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (pos) {
                  const node = view.state.schema.nodes.image.create({ src: url });
                  view.dispatch(tr.insert(pos.pos, node));
                }
              });
              return true;
            }
          }
          return false;
        },
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items;
          if (items && onImageUpload) {
            for (const item of items) {
              if (item.type.startsWith("image/")) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                  onImageUpload(file).then((url) => {
                    const { tr, selection } = view.state;
                    const node = view.state.schema.nodes.image.create({ src: url });
                    view.dispatch(tr.insert(selection.from, node));
                  });
                }
                return true;
              }
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
    });

    // Update content when prop changes (e.g., switching notes)
    useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        editor.commands.setContent(content || "");
      }
    }, [content, editor]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || "",
      getJSON: () => editor?.getJSON() || {},
      getText: () => editor?.getText() || "",
      focus: () => editor?.commands.focus(),
      clear: () => editor?.commands.clearContent(),
    }));

    if (!isMounted || !editor) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Loading editor...
        </div>
      );
    }

    return (
      <div className="relative flex flex-col h-full">
        {/* Fixed Toolbar */}
        <EditorToolbar editor={editor} onImageUpload={onImageUpload} />

        {/* Slash Command Menu */}
        <SlashCommandMenu editor={editor} onImageUpload={onImageUpload} />

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    );
  }
);

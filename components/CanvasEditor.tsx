"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useAutosave } from "@/lib/use-autosave";
import { useCanvasHistory } from "@/lib/use-canvas-history";
import {
  STICKY_COLORS,
  generateId,
  readShapes,
  serializeShapes,
  type Point,
  type Shape,
  type Tool,
} from "@/lib/canvas/model";
import {
  deleteShape,
  fitScene,
  hitTest,
  reconnect,
  resizeShape,
  sceneBounds,
  shapeBounds,
  toWorld,
  translateShape,
  type Viewport,
} from "@/lib/canvas/geometry";
import { renderScene } from "@/lib/canvas/render";
import { stripHtmlToText } from "@/lib/html-utils";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { SaveStatus } from "@/components/SaveStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast-notification";
import {
  Copy,
  ExternalLink,
  FileText,
  GitBranch,
  Maximize,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type Interaction =
  | { kind: "move" | "resize"; id: string; start: Point; base: Shape[] }
  | { kind: "draw"; shape: Shape; start: Point; base: Shape[] }
  | { kind: "pan"; start: Point; view: Viewport }
  | { kind: "pinch"; distance: number; center: Point; view: Viewport };
type TextEditor =
  | { kind: "create"; type: "text" | "sticky" | "mindmap"; point: Point }
  | { kind: "edit"; id: string }
  | { kind: "child"; parent: string };

export function CanvasEditor({
  canvasId,
  initialCanvas,
}: {
  canvasId: Id<"canvases">;
  initialCanvas: Doc<"canvases">;
}) {
  const storageKey = `noteworthy:canvas-draft:${canvasId}`;
  const [initial] = useState(() => {
    const saved = readShapes(initialCanvas.content),
      baseline = serializeShapes(saved);
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const cached: unknown = JSON.parse(raw);
        if (
          cached &&
          typeof cached === "object" &&
          "content" in cached &&
          typeof cached.content === "string" &&
          "base" in cached &&
          typeof cached.base === "string"
        )
          return {
            shapes: readShapes(cached.content),
            baseline,
            recovered: cached.content !== baseline,
            conflict:
              cached.content !== baseline && cached.base !== baseline
                ? saved
                : null,
          };
      }
    } catch {}
    return { shapes: saved, baseline, recovered: false, conflict: null };
  });
  const history = useCanvasHistory(initial.shapes);
  const { shapes, current, commit, reset, undo, redo } = history;
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const viewRef = useRef(view);
  const container = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [draft, setDraft] = useState<Shape[] | null>(null);
  const preview = useRef<Shape[] | null>(null);
  const frame = useRef<number | null>(null);
  const interaction = useRef<Interaction | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const spacePressed = useRef(false);
  const [textEditor, setTextEditor] = useState<TextEditor | null>(null);
  const [text, setText] = useState("");
  const [notesOpen, setNotesOpen] = useState(false),
    [objectsOpen, setObjectsOpen] = useState(false),
    [clearing, setClearing] = useState(false);
  const [noteSearch, setNoteSearch] = useState("");
  const [loadingNote, setLoadingNote] = useState(false);
  const [stickyColor, setStickyColor] = useState(0);
  const [remote, setRemote] = useState<Shape[] | null>(initial.conflict);
  const [recovered, setRecovered] = useState(initial.recovered);
  const lastSaved = useRef(initial.baseline),
    lastSubmitted = useRef(initial.baseline);
  const remoteRef = useRef<Shape[] | null>(initial.conflict);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const { isAuthenticated } = useConvexAuth();
  const convex = useConvex();
  const update = useMutation(api.canvases.updateCanvas);
  const notes = useQuery(
    api.notes.listNoteSummaries,
    isAuthenticated && notesOpen ? {} : "skip",
  );
  const router = useRouter();
  const { error: showError } = useToast();

  const save = useCallback(
    async (value: Shape[]) => {
      const content = serializeShapes(reconnect(value));
      if (content === lastSaved.current) return;
      if (remoteRef.current)
        throw new Error(
          "This canvas changed in another tab. Choose which version to keep.",
        );
      lastSubmitted.current = content;
      await update({ id: canvasId, content });
      lastSaved.current = content;
      try {
        const raw = sessionStorage.getItem(
          `noteworthy:canvas-draft:${canvasId}`,
        );
        if (raw) {
          const cached: unknown = JSON.parse(raw);
          if (
            cached &&
            typeof cached === "object" &&
            "content" in cached &&
            cached.content === content
          )
            sessionStorage.removeItem(`noteworthy:canvas-draft:${canvasId}`);
        }
      } catch {}
    },
    [canvasId, update],
  );
  const autosave = useAutosave(
    shapes,
    save,
    isAuthenticated && remote === null,
  );

  useEffect(() => {
    const content = serializeShapes(reconnect(shapes));
    try {
      if (content !== lastSaved.current)
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ base: lastSaved.current, content }),
        );
      else sessionStorage.removeItem(storageKey);
    } catch {}
  }, [shapes, storageKey]);

  useEffect(() => {
    const incoming = readShapes(initialCanvas.content),
      content = serializeShapes(incoming);
    if (content === lastSaved.current || content === lastSubmitted.current)
      return;
    if (serializeShapes(current.current) === lastSaved.current) {
      lastSaved.current = content;
      lastSubmitted.current = content;
      queueMicrotask(() => reset(incoming));
    } else {
      remoteRef.current = incoming;
      queueMicrotask(() => setRemote(incoming));
    }
  }, [initialCanvas.content, current, reset]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (serializeShapes(reconnect(current.current)) !== lastSaved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [current]);

  function schedule() {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setDraft(preview.current);
      setView({ ...viewRef.current });
    });
  }
  function viewport(next: Viewport) {
    viewRef.current = next;
    schedule();
  }
  function previewShapes(next: Shape[] | null) {
    preview.current = next;
    schedule();
  }
  function finishPreview() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    preview.current = null;
    setDraft(null);
  }
  function change(next: Shape[]) {
    commit(reconnect(next));
    setRecovered(false);
  }

  useEffect(() => {
    const releaseSpace = () => {
      spacePressed.current = false;
    };
    const keyup = (event: globalThis.KeyboardEvent) => {
      if (event.code === "Space") releaseSpace();
    };
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", releaseSpace);
    return () => {
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", releaseSpace);
    };
  }, []);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    const observer = new ResizeObserver(() =>
      setSize({ width: host.clientWidth, height: host.clientHeight }),
    );
    observer.observe(host);
    return () => {
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(size.width * dpr)),
      height = Math.max(1, Math.round(size.height * dpr));
    if (element.width !== width) element.width = width;
    if (element.height !== height) element.height = height;
    const ctx = element.getContext("2d");
    if (ctx)
      renderScene(ctx, draft ?? shapes, {
        ...size,
        dpr,
        dark,
        view,
        selected: selectedId,
      });
  }, [shapes, draft, size, view, dark, selectedId]);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const old = viewRef.current;
      if (event.ctrlKey || event.metaKey) {
        const rect = host.getBoundingClientRect(),
          point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const zoom = Math.min(
          5,
          Math.max(0.1, old.zoom * Math.exp(-event.deltaY * 0.005)),
        );
        const world = toWorld(point, old);
        viewRef.current = {
          zoom,
          x: point.x - world.x * zoom,
          y: point.y - world.y * zoom,
        };
      } else
        viewRef.current = {
          ...old,
          x: old.x - event.deltaX,
          y: old.y - event.deltaY,
        };
      if (frame.current === null)
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          setView({ ...viewRef.current });
          setDraft(preview.current);
        });
    };
    host.addEventListener("wheel", wheel, { passive: false });
    return () => host.removeEventListener("wheel", wheel);
  }, []);

  function screen(event: { clientX: number; clientY: number }): Point {
    const rect = container.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  }
  function openText(editor: TextEditor, value = "") {
    setText(value);
    setTextEditor(editor);
  }
  function edit(shape: Shape) {
    if (
      shape.type === "sticky" ||
      shape.type === "text" ||
      shape.type === "mindmapNode"
    )
      openText({ kind: "edit", id: shape.id }, shape.text);
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      event.target instanceof Element &&
      event.target.closest("button") &&
      !event.target.closest("[data-resize]")
    )
      return;
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    canvas.current?.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = screen(event);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      interaction.current = {
        kind: "pinch",
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        view: { ...viewRef.current },
      };
      previewShapes(null);
      return;
    }
    if (tool === "pan" || spacePressed.current || event.button === 1) {
      interaction.current = {
        kind: "pan",
        start: point,
        view: { ...viewRef.current },
      };
      return;
    }
    const world = toWorld(point, viewRef.current),
      base = current.current;
    if (
      event.target instanceof Element &&
      event.target.closest("[data-resize]") &&
      selectedId
    ) {
      interaction.current = {
        kind: "resize",
        id: selectedId,
        start: world,
        base,
      };
      return;
    }
    if (tool === "select") {
      const shape = hitTest(base, world, viewRef.current.zoom);
      setSelected(shape?.id ?? null);
      if (shape)
        interaction.current = {
          kind: "move",
          id: shape.id,
          start: world,
          base,
        };
      return;
    }
    if (tool === "eraser") {
      const shape = hitTest(base, world, viewRef.current.zoom);
      if (shape) change(deleteShape(base, shape.id));
      return;
    }
    if (tool === "text" || tool === "sticky" || tool === "mindmap") {
      openText({ kind: "create", type: tool, point: world });
      return;
    }
    if (tool === "noteEmbed") {
      setNotesOpen(true);
      return;
    }
    const common = {
      id: generateId(),
      x: world.x,
      y: world.y,
      stroke: dark ? "#ffffff" : "#000000",
      strokeWidth: 2,
    };
    let shape: Shape;
    if (tool === "rectangle")
      shape = {
        ...common,
        type: "rectangle",
        width: 0,
        height: 0,
        fill: "transparent",
      };
    else if (tool === "circle")
      shape = { ...common, type: "circle", radius: 0, fill: "transparent" };
    else if (tool === "line")
      shape = {
        ...common,
        type: "line",
        x: 0,
        y: 0,
        points: [world.x, world.y, world.x, world.y],
      };
    else
      shape = {
        ...common,
        type: "freehand",
        x: 0,
        y: 0,
        points: [world.x, world.y],
      };
    interaction.current = { kind: "draw", shape, start: world, base };
  }

  function moved(
    active: Extract<Interaction, { kind: "move" | "resize" }>,
    point: Point,
  ) {
    return reconnect(
      active.base.map((shape) =>
        shape.id === active.id
          ? active.kind === "resize"
            ? resizeShape(shape, point)
            : translateShape(
                shape,
                point.x - active.start.x,
                point.y - active.start.y,
              )
          : shape,
      ),
    );
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = screen(event);
    pointers.current.set(event.pointerId, point);
    const active = interaction.current;
    if (!active) return;
    if (active.kind === "pinch") {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        distance = Math.hypot(a.x - b.x, a.y - b.y);
      const zoom = Math.min(
          5,
          Math.max(0.1, (active.view.zoom * distance) / active.distance),
        ),
        world = toWorld(active.center, active.view);
      viewport({
        zoom,
        x: center.x - world.x * zoom,
        y: center.y - world.y * zoom,
      });
      return;
    }
    if (active.kind === "pan") {
      viewport({
        ...active.view,
        x: active.view.x + point.x - active.start.x,
        y: active.view.y + point.y - active.start.y,
      });
      return;
    }
    const world = toWorld(point, viewRef.current);
    if (active.kind === "move" || active.kind === "resize") {
      previewShapes(moved(active, world));
      return;
    }
    if (active.kind !== "draw") return;
    const shape = active.shape;
    if (shape.type === "freehand") shape.points.push(world.x, world.y);
    else if (shape.type === "line")
      shape.points = [active.start.x, active.start.y, world.x, world.y];
    else if (shape.type === "rectangle") {
      shape.width = world.x - active.start.x;
      shape.height = world.y - active.start.y;
    } else if (shape.type === "circle")
      shape.radius = Math.hypot(
        world.x - active.start.x,
        world.y - active.start.y,
      );
    previewShapes([...active.base, { ...shape }]);
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const active = interaction.current;
    pointers.current.delete(event.pointerId);
    interaction.current = null;
    finishPreview();
    if (active?.kind === "move" || active?.kind === "resize")
      change(moved(active, toWorld(screen(event), viewRef.current)));
    else if (active?.kind === "draw") {
      const b = shapeBounds(active.shape);
      if (b.width > 2 || b.height > 2) {
        change([...active.base, active.shape]);
        setSelected(active.shape.id);
      }
    }
  }
  function cancelPointer() {
    pointers.current.clear();
    interaction.current = null;
    finishPreview();
  }

  function saveText() {
    if (!textEditor || !text.trim()) return;
    const base = current.current;
    const common = {
      id: generateId(),
      stroke: dark ? "#ffffff" : "#000000",
      strokeWidth: 1,
    };
    let next: Shape[];
    if (textEditor.kind === "edit")
      next = base.map((shape) =>
        shape.id === textEditor.id && "text" in shape
          ? { ...shape, text: text.trim() }
          : shape,
      );
    else if (textEditor.kind === "child") {
      const parent = base.find((shape) => shape.id === textEditor.parent);
      if (!parent) return;
      const b = shapeBounds(parent),
        siblings = base.filter(
          (shape) =>
            shape.type === "mindmapNode" && shape.parentId === parent.id,
        ).length;
      const node: Shape = {
        ...common,
        type: "mindmapNode",
        x: b.x + b.width + 90,
        y: b.y + siblings * 90,
        width: 180,
        height: 70,
        text: text.trim(),
        parentId: parent.id,
        isRoot: false,
        collapsed: false,
      };
      next = [
        ...base,
        node,
        {
          id: generateId(),
          type: "connector",
          x: 0,
          y: 0,
          stroke: "#e85b7b",
          strokeWidth: 1.5,
          fromId: parent.id,
          toId: node.id,
          points: [],
        },
      ];
      setSelected(node.id);
    } else {
      const { point, type } = textEditor;
      const shape: Shape =
        type === "sticky"
          ? {
              ...common,
              ...point,
              type: "sticky",
              width: 210,
              height: 170,
              text: text.trim(),
              colorIndex: stickyColor,
            }
          : type === "mindmap"
            ? {
                ...common,
                ...point,
                type: "mindmapNode",
                width: 190,
                height: 75,
                text: text.trim(),
                parentId: null,
                isRoot: true,
                collapsed: false,
              }
            : {
                ...common,
                ...point,
                type: "text",
                text: text.trim(),
                fontSize: 22,
              };
      next = [...base, shape];
      setSelected(shape.id);
    }
    change(next);
    setTextEditor(null);
    setTool("select");
  }

  async function embedNote(id: Id<"notes">) {
    setLoadingNote(true);
    try {
      const note = await convex.query(api.notes.getNote, { id });
      if (!note) throw new Error("This note is no longer available.");
      const point = toWorld(
          { x: size.width / 2, y: size.height / 2 },
          viewRef.current,
        ),
        shape: Shape = {
          id: generateId(),
          type: "noteEmbed",
          x: point.x - 130,
          y: point.y - 90,
          width: 260,
          height: 180,
          stroke: "#d5dde2",
          strokeWidth: 1,
          noteId: note._id,
          noteTitle: note.title,
          notePreview: stripHtmlToText(note.content).slice(0, 300),
        };
      change([...current.current, shape]);
      setSelected(shape.id);
      setNotesOpen(false);
      setTool("select");
    } catch (cause) {
      showError(
        "Could not embed note",
        cause instanceof Error ? cause.message : "Try again.",
      );
    } finally {
      setLoadingNote(false);
    }
  }
  function exportCanvas() {
    const bounds = sceneBounds(current.current);
    if (!bounds) {
      showError("Nothing to export", "Add an idea to the canvas first.");
      return;
    }
    const zoom = Math.min(
        2,
        4096 / (Math.max(bounds.width, bounds.height) + 48),
      ),
      width = Math.ceil((bounds.width + 48) * zoom),
      height = Math.ceil((bounds.height + 48) * zoom);
    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const ctx = output.getContext("2d");
    if (!ctx) return;
    renderScene(ctx, current.current, {
      width,
      height,
      dark,
      grid: false,
      view: { zoom, x: (24 - bounds.x) * zoom, y: (24 - bounds.y) * zoom },
    });
    const link = document.createElement("a");
    link.download = `${initialCanvas.title.replace(/[^a-z0-9_-]/gi, "-") || "canvas"}.png`;
    link.href = output.toDataURL("image/png");
    link.click();
  }
  function zoomBy(factor: number) {
    const old = viewRef.current,
      point = { x: size.width / 2, y: size.height / 2 },
      world = toWorld(point, old),
      zoom = Math.min(5, Math.max(0.1, old.zoom * factor));
    viewport({
      zoom,
      x: point.x - world.x * zoom,
      y: point.y - world.y * zoom,
    });
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('input,textarea,[contenteditable="true"]')
    )
      return;
    const key = event.key.toLowerCase();
    if (event.code === "Space") {
      event.preventDefault();
      spacePressed.current = true;
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "z") {
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (key === "escape") {
      setSelected(null);
      setTool("select");
      return;
    }
    const selected = current.current.find((shape) => shape.id === selectedId);
    if (selected && (key === "delete" || key === "backspace")) {
      event.preventDefault();
      event.stopPropagation();
      change(deleteShape(current.current, selected.id));
      setSelected(null);
    }
    if (selected && key === "enter") edit(selected);
    if (
      selected &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 10 : 1;
      change(
        current.current.map((shape) =>
          shape.id === selected.id
            ? translateShape(
                shape,
                event.key === "ArrowLeft"
                  ? -step
                  : event.key === "ArrowRight"
                    ? step
                    : 0,
                event.key === "ArrowUp"
                  ? -step
                  : event.key === "ArrowDown"
                    ? step
                    : 0,
              )
            : shape,
        ),
      );
    }
    if (!event.ctrlKey && !event.metaKey) {
      const shortcuts: Record<string, Tool> = {
        v: "select",
        h: "pan",
        p: "pen",
        r: "rectangle",
        c: "circle",
        l: "line",
        t: "text",
        e: "eraser",
        s: "sticky",
        m: "mindmap",
      };
      if (shortcuts[key]) setTool(shortcuts[key]);
    }
  }
  const selected = shapes.find((shape) => shape.id === selectedId);
  const selectedBounds = selected ? shapeBounds(selected) : null;
  const canResize =
    selected && ("width" in selected || selected.type === "circle");
  return (
    <div className="absolute inset-0 flex min-h-0 min-w-0 flex-col bg-background">
      <CanvasToolbar
        tool={tool}
        onTool={setTool}
        onNotes={() => setNotesOpen(true)}
        undo={undo}
        redo={redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onExport={exportCanvas}
        onClear={() => setClearing(true)}
        onObjects={() => setObjectsOpen(true)}
        status={autosave.status}
        retry={autosave.retry}
      />
      <div className="flex min-h-8 shrink-0 items-center justify-between gap-2 border-b px-3 py-1 text-[10px] text-muted-foreground">
        <span>
          {selected
            ? `${selected.type === "noteEmbed" ? "Embedded note" : selected.type === "mindmapNode" ? "Mind map node" : selected.type} selected`
            : `${shapes.filter((shape) => shape.type !== "connector").length} objects · Select, drag, or add an idea`}
        </span>
        <span className="md:hidden">
          <SaveStatus status={autosave.status} retry={autosave.retry} />
        </span>
        <span className="hidden md:inline">
          V select · H pan · Enter edit · Arrow keys move
        </span>
      </div>
      {remote && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 border-b bg-amber-500/10 p-3 text-xs"
        >
          <span>This canvas changed in another tab. Your draft is kept.</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              lastSaved.current = serializeShapes(remote);
              remoteRef.current = null;
              setRemote(null);
            }}
          >
            Keep my edits
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const content = serializeShapes(remote);
              lastSaved.current = content;
              lastSubmitted.current = content;
              remoteRef.current = null;
              reset(remote);
              setRemote(null);
              sessionStorage.removeItem(storageKey);
            }}
          >
            Load saved version
          </Button>
        </div>
      )}
      {recovered && !remote && (
        <p
          role="status"
          className="border-b bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
        >
          Recovered edits from this tab. They will be saved automatically.
        </p>
      )}
      {selected && (
        <div
          role="toolbar"
          aria-label="Selected object actions"
          className="flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-muted/20 px-2 py-1"
        >
          {"text" in selected && (
            <Button variant="ghost" size="sm" onClick={() => edit(selected)}>
              <Pencil size={13} />
              Edit
            </Button>
          )}
          {selected.type === "mindmapNode" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openText({ kind: "child", parent: selected.id })}
            >
              <GitBranch size={13} />
              Add connected idea
            </Button>
          )}
          {selected.type === "noteEmbed" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/notes/${selected.noteId}`)}
            >
              <ExternalLink size={13} />
              Open original note
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label="Duplicate selected object"
            onClick={() => {
              const copy = {
                ...translateShape(selected, 28, 28),
                id: generateId(),
              };
              change([...shapes, copy]);
              setSelected(copy.id);
            }}
          >
            <Copy size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Delete selected object"
            onClick={() => {
              change(deleteShape(shapes, selected.id));
              setSelected(null);
            }}
          >
            <Trash2 size={13} />
          </Button>
          {selected.type === "sticky" && (
            <div
              className="ml-2 flex gap-1"
              role="group"
              aria-label="Sticky note color"
            >
              {STICKY_COLORS.map((color, index) => (
                <button
                  key={color.bg}
                  aria-label={`Sticky color ${index + 1}`}
                  aria-pressed={selected.colorIndex === index}
                  className={`h-6 w-6 shrink-0 rounded-full border-2 ${selected.colorIndex === index ? "border-primary" : "border-transparent"}`}
                  style={{ background: color.bg }}
                  onClick={() => {
                    setStickyColor(index);
                    change(
                      shapes.map((shape) =>
                        shape.id === selected.id && shape.type === "sticky"
                          ? { ...shape, colorIndex: index }
                          : shape,
                      ),
                    );
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <div
        ref={container}
        className="relative min-h-0 flex-1 touch-none overflow-hidden"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={cancelPointer}
        onKeyDown={keyboard}
      >
        <canvas
          ref={canvas}
          tabIndex={0}
          role="application"
          aria-label="Canvas editor. Use the toolbar to add objects. Select an object to move or edit it."
          className="block h-full w-full touch-none outline-none"
          style={{
            cursor:
              tool === "pan"
                ? "grab"
                : tool === "select"
                  ? "default"
                  : tool === "text"
                    ? "text"
                    : "crosshair",
          }}
          onDoubleClick={(event) => {
            const shape = hitTest(
              current.current,
              toWorld(screen(event), viewRef.current),
              viewRef.current.zoom,
            );
            if (shape) edit(shape);
          }}
        />
        {selectedBounds && canResize && (
          <button
            data-resize
            aria-label="Resize selected object"
            className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize rounded-sm border-2 border-background bg-primary shadow-sm"
            style={{
              left:
                (selectedBounds.x + selectedBounds.width) * view.zoom + view.x,
              top:
                (selectedBounds.y + selectedBounds.height) * view.zoom + view.y,
            }}
          />
        )}
        {shapes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <StickyNote size={32} className="mb-4 text-primary/60" />
            <h2 className="text-xl font-semibold tracking-tight">
              Give an idea some room.
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Add a sticky note, bring in a note, or sketch a connection. This
              space is yours.
            </p>
            <div className="pointer-events-auto mt-5 flex flex-wrap justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  openText({
                    kind: "create",
                    type: "sticky",
                    point: toWorld(
                      { x: size.width / 2 - 100, y: size.height / 2 - 70 },
                      viewRef.current,
                    ),
                  })
                }
              >
                <Plus size={14} />
                First sticky note
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setNotesOpen(true)}
              >
                <FileText size={14} />
                Embed a note
              </Button>
            </div>
          </div>
        )}
        <div
          className="absolute bottom-4 right-3 flex items-center gap-0.5 rounded-lg border bg-background/95 p-1 shadow-sm"
          role="toolbar"
          aria-label="Canvas view"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Zoom out"
            onClick={() => zoomBy(1 / 1.2)}
          >
            <ZoomOut size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 min-w-[50px] px-1 text-xs"
            aria-label="Reset canvas zoom"
            onClick={() => viewport({ x: 0, y: 0, zoom: 1 })}
          >
            {Math.round(view.zoom * 100)}%
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Zoom in"
            onClick={() => zoomBy(1.2)}
          >
            <ZoomIn size={15} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Fit all content to screen"
            onClick={() => viewport(fitScene(shapes, size.width, size.height))}
          >
            <Maximize size={15} />
          </Button>
        </div>
      </div>
      <Dialog
        open={textEditor !== null}
        onOpenChange={(open) => {
          if (!open) setTextEditor(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>
            {textEditor?.kind === "edit"
              ? "Edit your idea"
              : textEditor?.kind === "child"
                ? "Add a connected idea"
                : "Put the thought down"}
          </DialogTitle>
          <DialogDescription>
            Your text stays on the canvas. You can edit it again anytime.
          </DialogDescription>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveText();
            }}
            className="space-y-4"
          >
            <label
              className="block text-sm font-medium"
              htmlFor="canvas-idea-text"
            >
              Text
              <textarea
                id="canvas-idea-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                autoFocus
                maxLength={5000}
                className="mt-2 min-h-[140px] w-full rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTextEditor(null)}
              >
                Cancel
              </Button>
              <Button disabled={!text.trim()}>Save idea</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Bring a note onto the canvas</DialogTitle>
          <DialogDescription>
            Add a preview here. The original note stays in your notes workspace.
          </DialogDescription>
          <Input
            aria-label="Find a note to embed"
            placeholder="Find a note..."
            value={noteSearch}
            onChange={(event) => setNoteSearch(event.target.value)}
          />
          <div className="max-h-[50dvh] space-y-1 overflow-y-auto">
            {notes === undefined ? (
              <p role="status" className="p-4 text-sm text-muted-foreground">
                Loading notes...
              </p>
            ) : (
              notes
                .filter((note) =>
                  note.title.toLowerCase().includes(noteSearch.toLowerCase()),
                )
                .map((note) => (
                  <Button
                    variant="ghost"
                    className="w-full justify-start truncate"
                    key={note._id}
                    disabled={loadingNote}
                    onClick={() => void embedNote(note._id)}
                  >
                    <FileText size={14} />
                    {note.title || "Untitled"}
                  </Button>
                ))
            )}
            {notes?.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                Write your first note, then bring it here.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={objectsOpen} onOpenChange={setObjectsOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Objects on this canvas</DialogTitle>
          <DialogDescription>
            Select an object to edit, move, resize, or delete it.
          </DialogDescription>
          <div className="max-h-[55dvh] space-y-1 overflow-y-auto">
            {shapes
              .filter((shape) => shape.type !== "connector")
              .map((shape, index) => (
                <Button
                  key={shape.id}
                  variant={shape.id === selectedId ? "secondary" : "ghost"}
                  className="w-full justify-start truncate"
                  onClick={() => {
                    setSelected(shape.id);
                    setObjectsOpen(false);
                    viewport(fitScene([shape], size.width, size.height, 100));
                  }}
                >
                  {index + 1}.{" "}
                  {"text" in shape
                    ? shape.text
                    : shape.type === "noteEmbed"
                      ? shape.noteTitle
                      : shape.type}
                </Button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={clearing} onOpenChange={setClearing}>
        <AlertDialogContent>
          <AlertDialogTitle>Clear this canvas?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the objects from this canvas. Undo can bring them back
            while this canvas stays open.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                change([]);
                setSelected(null);
              }}
            >
              Clear canvas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

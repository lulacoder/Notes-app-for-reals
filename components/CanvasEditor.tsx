"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Layers,
  MousePointer2,
  Pencil,
  Square,
  Circle,
  Minus,
  Type,
  Eraser,
  Trash2,
  Download,
  Undo2,
  Redo2,
  StickyNote,
  FileText,
  GitBranch,
  Plus,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

// Sticky note color options
const STICKY_COLORS = [
  { bg: "#fef3c7", border: "#f59e0b", text: "#78350f" }, // Yellow
  { bg: "#fce7f3", border: "#ec4899", text: "#831843" }, // Pink
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a8a" }, // Blue
  { bg: "#dcfce7", border: "#22c55e", text: "#14532d" }, // Green
  { bg: "#f3e8ff", border: "#a855f7", text: "#581c87" }, // Purple
  { bg: "#ffedd5", border: "#f97316", text: "#7c2d12" }, // Orange
];

// Types for canvas shapes
type Tool = "select" | "pen" | "rectangle" | "circle" | "line" | "text" | "eraser" | "sticky" | "noteEmbed" | "mindmap";

interface Point {
  x: number;
  y: number;
}

interface BaseShape {
  id: string;
  type: string;
  x: number;
  y: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
}

interface RectangleShape extends BaseShape {
  type: "rectangle";
  width: number;
  height: number;
}

interface CircleShape extends BaseShape {
  type: "circle";
  radius: number;
}

interface LineShape extends BaseShape {
  type: "line";
  points: number[];
}

interface FreehandShape extends BaseShape {
  type: "freehand";
  points: number[];
}

interface TextShape extends BaseShape {
  type: "text";
  text: string;
  fontSize: number;
}

interface StickyNoteShape extends BaseShape {
  type: "sticky";
  width: number;
  height: number;
  text: string;
  colorIndex: number;
}

interface NoteEmbedShape extends BaseShape {
  type: "noteEmbed";
  width: number;
  height: number;
  noteId: string;
  noteTitle: string;
  notePreview: string;
}

interface MindMapNodeShape extends BaseShape {
  type: "mindmapNode";
  width: number;
  height: number;
  text: string;
  parentId: string | null;
  isRoot: boolean;
  collapsed: boolean;
}

interface ConnectorShape extends BaseShape {
  type: "connector";
  fromId: string;
  toId: string;
  points: number[];
}

type Shape = RectangleShape | CircleShape | LineShape | FreehandShape | TextShape | StickyNoteShape | NoteEmbedShape | MindMapNodeShape | ConnectorShape;

interface CanvasEditorProps {
  canvasId: Id<"canvases">;
}

// Canvas Preview component for thumbnails
export function CanvasPreview({ 
  content, 
  className = "" 
}: { 
  content: string; 
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isDark = resolvedTheme === "dark";
    const bgColor = isDark ? "#1a1a1a" : "#ffffff";

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    try {
      const parsed = JSON.parse(content || '{"shapes":[]}');
      const shapes: Shape[] = parsed.shapes || [];

      if (shapes.length === 0) {
        ctx.fillStyle = isDark ? "#444" : "#ccc";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Empty canvas", canvas.width / 2, canvas.height / 2);
        return;
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      shapes.forEach((shape) => {
        switch (shape.type) {
          case "rectangle":
          case "sticky":
          case "noteEmbed":
          case "mindmapNode":
            minX = Math.min(minX, shape.x);
            minY = Math.min(minY, shape.y);
            maxX = Math.max(maxX, shape.x + shape.width);
            maxY = Math.max(maxY, shape.y + shape.height);
            break;
          case "circle":
            minX = Math.min(minX, shape.x - shape.radius);
            minY = Math.min(minY, shape.y - shape.radius);
            maxX = Math.max(maxX, shape.x + shape.radius);
            maxY = Math.max(maxY, shape.y + shape.radius);
            break;
          case "line":
          case "freehand":
          case "connector":
            for (let i = 0; i < shape.points.length; i += 2) {
              minX = Math.min(minX, shape.points[i]);
              maxX = Math.max(maxX, shape.points[i]);
              minY = Math.min(minY, shape.points[i + 1]);
              maxY = Math.max(maxY, shape.points[i + 1]);
            }
            break;
          case "text":
            minX = Math.min(minX, shape.x);
            minY = Math.min(minY, shape.y - shape.fontSize);
            maxX = Math.max(maxX, shape.x + shape.text.length * shape.fontSize * 0.6);
            maxY = Math.max(maxY, shape.y);
            break;
        }
      });

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const padding = 20;
      const scaleX = (canvas.width - padding * 2) / contentWidth;
      const scaleY = (canvas.height - padding * 2) / contentHeight;
      const scale = Math.min(scaleX, scaleY, 1);

      const offsetX = padding + (canvas.width - padding * 2 - contentWidth * scale) / 2 - minX * scale;
      const offsetY = padding + (canvas.height - padding * 2 - contentHeight * scale) / 2 - minY * scale;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      shapes.forEach((shape) => {
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = shape.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        switch (shape.type) {
          case "rectangle":
            ctx.beginPath();
            ctx.rect(shape.x, shape.y, shape.width, shape.height);
            if (shape.fill && shape.fill !== "transparent") {
              ctx.fillStyle = shape.fill;
              ctx.fill();
            }
            ctx.stroke();
            break;
          case "circle":
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
            if (shape.fill && shape.fill !== "transparent") {
              ctx.fillStyle = shape.fill;
              ctx.fill();
            }
            ctx.stroke();
            break;
          case "line":
          case "connector":
            ctx.beginPath();
            ctx.moveTo(shape.points[0], shape.points[1]);
            for (let i = 2; i < shape.points.length; i += 2) {
              ctx.lineTo(shape.points[i], shape.points[i + 1]);
            }
            ctx.stroke();
            break;
          case "freehand":
            if (shape.points.length >= 4) {
              ctx.beginPath();
              ctx.moveTo(shape.points[0], shape.points[1]);
              for (let i = 2; i < shape.points.length; i += 2) {
                ctx.lineTo(shape.points[i], shape.points[i + 1]);
              }
              ctx.stroke();
            }
            break;
          case "text":
            ctx.font = `${shape.fontSize}px sans-serif`;
            ctx.fillStyle = shape.stroke;
            ctx.fillText(shape.text, shape.x, shape.y);
            break;
          case "sticky":
            const stickyColor = STICKY_COLORS[shape.colorIndex % STICKY_COLORS.length];
            ctx.fillStyle = stickyColor.bg;
            ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
            ctx.strokeStyle = stickyColor.border;
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            break;
          case "noteEmbed":
            ctx.fillStyle = isDark ? "#2a2a2a" : "#f8f8f8";
            ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
            ctx.strokeStyle = isDark ? "#444" : "#ddd";
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            break;
          case "mindmapNode":
            ctx.fillStyle = shape.isRoot ? "#3b82f6" : (isDark ? "#2a2a2a" : "#f8f8f8");
            const radius = 8;
            ctx.beginPath();
            ctx.roundRect(shape.x, shape.y, shape.width, shape.height, radius);
            ctx.fill();
            ctx.strokeStyle = shape.isRoot ? "#2563eb" : (isDark ? "#444" : "#ddd");
            ctx.stroke();
            break;
        }
      });

      ctx.restore();
    } catch {
      ctx.fillStyle = isDark ? "#444" : "#ccc";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Preview unavailable", canvas.width / 2, canvas.height / 2);
    }
  }, [content, resolvedTheme]);

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

// Generate unique ID
function generateId(): string {
  return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function CanvasEditor({ canvasId }: CanvasEditorProps) {
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");
  const isLoadingRef = useRef(true);

  const [tool, setTool] = useState<Tool>("select");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [editingSticky, setEditingSticky] = useState<string | null>(null);
  const [stickyText, setStickyText] = useState("");
  const [showMindMapPanel, setShowMindMapPanel] = useState(false);
  const [mindMapRootId, setMindMapRootId] = useState<string | null>(null);

  // Pan and zoom state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastPanPoint = useRef<Point | null>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<Point | null>(null);

  // Query user's notes for embedding
  const notes = useQuery(api.notes.listNotes);
  
  const canvas = useQuery(api.canvases.getCanvas, { id: canvasId });
  const updateCanvas = useMutation(api.canvases.updateCanvas);

  const isDark = resolvedTheme === "dark";
  const strokeColor = isDark ? "#ffffff" : "#000000";
  const bgColor = isDark ? "#1a1a1a" : "#ffffff";

  // Update stage size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Load canvas content from Convex
  useEffect(() => {
    if (canvas === undefined || canvas === null) return;
    if (!isLoadingRef.current) return;

    try {
      const content = canvas.content || '{"shapes":[]}';
      const parsed = JSON.parse(content);
      if (parsed.shapes && Array.isArray(parsed.shapes)) {
        setShapes(parsed.shapes);
        setHistory([parsed.shapes]);
        setHistoryIndex(0);
      }
      lastSavedRef.current = content;
    } catch (error) {
      console.error("Failed to parse canvas content:", error);
      setShapes([]);
    } finally {
      isLoadingRef.current = false;
    }
  }, [canvas]);

  // Debounced save function
  const saveContent = useCallback(
    (shapesToSave: Shape[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const content = JSON.stringify({ shapes: shapesToSave });
        if (content !== lastSavedRef.current && !isLoadingRef.current) {
          try {
            await updateCanvas({ id: canvasId, content });
            lastSavedRef.current = content;
          } catch (error) {
            console.error("Failed to save canvas:", error);
          }
        }
      }, 1000);
    },
    [canvasId, updateCanvas]
  );

  // Save when shapes change
  useEffect(() => {
    if (!isLoadingRef.current) {
      saveContent(shapes);
    }
  }, [shapes, saveContent]);

  // Add to history
  const addToHistory = useCallback((newShapes: Shape[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newShapes);
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setShapes(history[newIndex]);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setShapes(history[newIndex]);
    }
  }, [history, historyIndex]);

  // Clear all shapes
  const clearCanvas = useCallback(() => {
    const newShapes: Shape[] = [];
    setShapes(newShapes);
    addToHistory(newShapes);
    setSelectedId(null);
    setMindMapRootId(null);
  }, [addToHistory]);

  // Zoom controls
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.1;

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Zoom at a specific point (for mouse wheel zoom)
  const zoomAtPoint = useCallback((delta: number, centerX: number, centerY: number) => {
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    
    // Adjust pan offset to zoom towards the cursor position
    const zoomFactor = newZoom / zoom;
    const newPanX = centerX - (centerX - panOffset.x) * zoomFactor;
    const newPanY = centerY - (centerY - panOffset.y) * zoomFactor;
    
    setZoom(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  }, [zoom, panOffset]);

  // Export canvas as PNG
  const exportCanvas = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const link = document.createElement("a");
    link.download = "canvas.png";
    link.href = canvasEl.toDataURL("image/png");
    link.click();
  }, []);

  // Get mouse position relative to canvas (accounting for pan/zoom)
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return { x: 0, y: 0 };
    
    const rect = canvasEl.getBoundingClientRect();
    // Convert screen coordinates to canvas coordinates (accounting for pan and zoom)
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoom,
      y: (e.clientY - rect.top - panOffset.y) / zoom,
    };
  }, [panOffset, zoom]);

  // Find shape at position
  const findShapeAtPosition = useCallback((pos: Point): Shape | null => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      
      switch (shape.type) {
        case "rectangle":
        case "sticky":
        case "noteEmbed":
        case "mindmapNode":
          if (
            pos.x >= shape.x &&
            pos.x <= shape.x + shape.width &&
            pos.y >= shape.y &&
            pos.y <= shape.y + shape.height
          ) {
            return shape;
          }
          break;
        case "circle":
          const dx = pos.x - shape.x;
          const dy = pos.y - shape.y;
          if (Math.sqrt(dx * dx + dy * dy) <= shape.radius) {
            return shape;
          }
          break;
        case "freehand":
        case "line":
        case "connector":
          const points = shape.points;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let j = 0; j < points.length; j += 2) {
            minX = Math.min(minX, points[j]);
            maxX = Math.max(maxX, points[j]);
            minY = Math.min(minY, points[j + 1]);
            maxY = Math.max(maxY, points[j + 1]);
          }
          if (
            pos.x >= minX - 10 &&
            pos.x <= maxX + 10 &&
            pos.y >= minY - 10 &&
            pos.y <= maxY + 10
          ) {
            return shape;
          }
          break;
        case "text":
          const textWidth = shape.text.length * shape.fontSize * 0.6;
          const textHeight = shape.fontSize;
          if (
            pos.x >= shape.x &&
            pos.x <= shape.x + textWidth &&
            pos.y >= shape.y - textHeight &&
            pos.y <= shape.y
          ) {
            return shape;
          }
          break;
      }
    }
    return null;
  }, [shapes]);

  const getStickyDimensions = useCallback(() => {
    // Better responsive sizing based on screen breakpoints
    const screenWidth = stageSize.width;
    let width: number;
    let height: number;
    
    if (screenWidth < 400) {
      // Small mobile: compact sticky notes
      width = Math.max(120, Math.floor(screenWidth * 0.35));
      height = Math.max(100, Math.floor(width * 0.8));
    } else if (screenWidth < 768) {
      // Mobile/tablet: medium sticky notes
      width = Math.max(150, Math.min(200, Math.floor(screenWidth * 0.3)));
      height = Math.max(120, Math.floor(width * 0.75));
    } else {
      // Desktop: larger sticky notes with more text space
      width = Math.max(180, Math.min(280, Math.floor(screenWidth * 0.2)));
      height = Math.max(140, Math.min(220, Math.floor(width * 0.7)));
    }
    
    return { width, height };
  }, [stageSize]);

  const getEmbedDimensions = useCallback(() => {
    const width = Math.max(200, Math.min(320, Math.floor(stageSize.width * 0.6)));
    const height = Math.max(110, Math.min(180, Math.floor(stageSize.height * 0.3)));
    return { width, height };
  }, [stageSize]);

  // Create sticky note
  const createStickyNote = useCallback((pos: Point, colorIndex: number = 0) => {
    const { width, height } = getStickyDimensions();
    const newShape: StickyNoteShape = {
      id: generateId(),
      type: "sticky",
      x: pos.x,
      y: pos.y,
      width,
      height,
      text: "",
      colorIndex,
      stroke: STICKY_COLORS[colorIndex].border,
      strokeWidth: 2,
      fill: STICKY_COLORS[colorIndex].bg,
    };
    const newShapes = [...shapes, newShape];
    setShapes(newShapes);
    addToHistory(newShapes);
    setEditingSticky(newShape.id);
    setStickyText("");
  }, [shapes, addToHistory, getStickyDimensions]);

  // Create note embed
  const createNoteEmbed = useCallback((pos: Point, note: { _id: string; title: string; content: string }) => {
    // Extract preview text
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = note.content;
    const preview = (tempDiv.textContent || "").substring(0, 100);

    const { width, height } = getEmbedDimensions();

    const newShape: NoteEmbedShape = {
      id: generateId(),
      type: "noteEmbed",
      x: pos.x,
      y: pos.y,
      width,
      height,
      noteId: note._id,
      noteTitle: note.title,
      notePreview: preview,
      stroke: isDark ? "#444" : "#ddd",
      strokeWidth: 1,
    };
    const newShapes = [...shapes, newShape];
    setShapes(newShapes);
    addToHistory(newShapes);
  }, [shapes, addToHistory, isDark, getEmbedDimensions]);

  // Helper to measure text width and calculate node dimensions for mind map
  const getMindMapNodeDimensions = useCallback((text: string, isRoot: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      // Fallback dimensions
      return { width: isRoot ? 150 : 120, height: isRoot ? 50 : 40 };
    }
    
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { width: isRoot ? 150 : 120, height: isRoot ? 50 : 40 };
    }
    
    // Set font to match rendering font
    ctx.font = isRoot ? "bold 14px sans-serif" : "13px sans-serif";
    const textWidth = ctx.measureText(text).width;
    
    // Add padding (16px on each side) and constrain to min/max
    const minWidth = isRoot ? 100 : 80;
    const maxWidth = 300;
    const padding = 32; // 16px on each side
    
    const calculatedWidth = textWidth + padding;
    const width = Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
    
    // Height is fixed based on root/child
    const height = isRoot ? 50 : 40;
    
    return { width, height };
  }, []);

  // Create mind map root node
  const createMindMapRoot = useCallback((pos: Point) => {
    const text = prompt("Enter root topic:");
    if (!text) return;

    // Calculate node dimensions based on text
    const { width, height } = getMindMapNodeDimensions(text, true);

    const newShape: MindMapNodeShape = {
      id: generateId(),
      type: "mindmapNode",
      x: pos.x - width / 2,
      y: pos.y - height / 2,
      width,
      height,
      text,
      parentId: null,
      isRoot: true,
      collapsed: false,
      stroke: "#2563eb",
      strokeWidth: 2,
      fill: "#3b82f6",
    };
    const newShapes = [...shapes, newShape];
    setShapes(newShapes);
    addToHistory(newShapes);
    setMindMapRootId(newShape.id);
    setShowMindMapPanel(true);
  }, [shapes, addToHistory, getMindMapNodeDimensions]);

  // Add child to mind map node
  const addMindMapChild = useCallback((parentId: string) => {
    const parent = shapes.find(s => s.id === parentId) as MindMapNodeShape | undefined;
    if (!parent || parent.type !== "mindmapNode") return;

    const text = prompt("Enter node text:");
    if (!text) return;

    // Calculate node dimensions based on text
    const { width, height } = getMindMapNodeDimensions(text, false);

    // Find siblings
    const siblings = shapes.filter(s => s.type === "mindmapNode" && (s as MindMapNodeShape).parentId === parentId);
    const offsetY = siblings.length * 70;

    const newNode: MindMapNodeShape = {
      id: generateId(),
      type: "mindmapNode",
      x: parent.x + parent.width + 100,
      y: parent.y + offsetY,
      width,
      height,
      text,
      parentId,
      isRoot: false,
      collapsed: false,
      stroke: isDark ? "#444" : "#ddd",
      strokeWidth: 1,
      fill: isDark ? "#2a2a2a" : "#f8f8f8",
    };

    // Create connector
    const connector: ConnectorShape = {
      id: generateId(),
      type: "connector",
      x: 0,
      y: 0,
      fromId: parentId,
      toId: newNode.id,
      points: [
        parent.x + parent.width,
        parent.y + parent.height / 2,
        newNode.x,
        newNode.y + newNode.height / 2,
      ],
      stroke: isDark ? "#666" : "#999",
      strokeWidth: 2,
    };

    const newShapes = [...shapes, newNode, connector];
    setShapes(newShapes);
    addToHistory(newShapes);
  }, [shapes, addToHistory, isDark, getMindMapNodeDimensions]);

  // Update sticky text
  const updateStickyText = useCallback(() => {
    if (!editingSticky) return;
    
    const newShapes = shapes.map(s => {
      if (s.id === editingSticky && s.type === "sticky") {
        return { ...s, text: stickyText };
      }
      return s;
    });
    setShapes(newShapes);
    addToHistory(newShapes);
    setEditingSticky(null);
    setStickyText("");
  }, [editingSticky, stickyText, shapes, addToHistory]);

  // Mouse down handler
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle mouse button or space+click starts panning
    if (e.button === 1 || isSpacePressed) {
      e.preventDefault();
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const pos = getMousePos(e);
    setStartPoint(pos);
    setIsDrawing(true);

    if (tool === "select") {
      const shape = findShapeAtPosition(pos);
      setSelectedId(shape?.id || null);
      
      // Double-click to edit sticky
      if (shape?.type === "sticky") {
        if (e.detail === 2) {
          setEditingSticky(shape.id);
          setStickyText((shape as StickyNoteShape).text);
        }
      }
      return;
    }

    if (tool === "eraser") {
      const shape = findShapeAtPosition(pos);
      if (shape) {
        // Also remove connectors attached to this shape
        const newShapes = shapes.filter((s) => {
          if (s.id === shape.id) return false;
          if (s.type === "connector") {
            const conn = s as ConnectorShape;
            if (conn.fromId === shape.id || conn.toId === shape.id) return false;
          }
          return true;
        });
        setShapes(newShapes);
        addToHistory(newShapes);
      }
      return;
    }

    if (tool === "sticky") {
      createStickyNote(pos, Math.floor(Math.random() * STICKY_COLORS.length));
      setIsDrawing(false);
      setTool("select");
      return;
    }

    if (tool === "mindmap") {
      if (!mindMapRootId) {
        createMindMapRoot(pos);
      } else {
        // Find if clicking on a node
        const shape = findShapeAtPosition(pos);
        if (shape?.type === "mindmapNode") {
          addMindMapChild(shape.id);
        }
      }
      setIsDrawing(false);
      return;
    }

    if (tool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        const newShape: TextShape = {
          id: generateId(),
          type: "text",
          x: pos.x,
          y: pos.y,
          text,
          fontSize: 20,
          stroke: strokeColor,
          strokeWidth: 1,
        };
        const newShapes = [...shapes, newShape];
        setShapes(newShapes);
        addToHistory(newShapes);
      }
      setIsDrawing(false);
      return;
    }

    // Create initial shape for other tools
    let newShape: Shape | null = null;

    switch (tool) {
      case "pen":
        newShape = {
          id: generateId(),
          type: "freehand",
          x: 0,
          y: 0,
          points: [pos.x, pos.y],
          stroke: strokeColor,
          strokeWidth: 2,
        };
        break;
      case "rectangle":
        newShape = {
          id: generateId(),
          type: "rectangle",
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          stroke: strokeColor,
          strokeWidth: 2,
          fill: "transparent",
        };
        break;
      case "circle":
        newShape = {
          id: generateId(),
          type: "circle",
          x: pos.x,
          y: pos.y,
          radius: 0,
          stroke: strokeColor,
          strokeWidth: 2,
          fill: "transparent",
        };
        break;
      case "line":
        newShape = {
          id: generateId(),
          type: "line",
          x: 0,
          y: 0,
          points: [pos.x, pos.y, pos.x, pos.y],
          stroke: strokeColor,
          strokeWidth: 2,
        };
        break;
    }

    setCurrentShape(newShape);
  }, [tool, getMousePos, findShapeAtPosition, shapes, strokeColor, addToHistory, createStickyNote, createMindMapRoot, mindMapRootId, addMindMapChild, isSpacePressed]);

  // Mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle panning
    if (isPanning && lastPanPoint.current) {
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!isDrawing || !startPoint || !currentShape) return;

    const pos = getMousePos(e);

    let updatedShape: Shape | null = null;

    switch (currentShape.type) {
      case "freehand":
        updatedShape = {
          ...currentShape,
          points: [...currentShape.points, pos.x, pos.y],
        };
        break;
      case "rectangle":
        updatedShape = {
          ...currentShape,
          width: pos.x - startPoint.x,
          height: pos.y - startPoint.y,
        };
        break;
      case "circle":
        const dx = pos.x - startPoint.x;
        const dy = pos.y - startPoint.y;
        updatedShape = {
          ...currentShape,
          radius: Math.sqrt(dx * dx + dy * dy),
        };
        break;
      case "line":
        updatedShape = {
          ...currentShape,
          points: [startPoint.x, startPoint.y, pos.x, pos.y],
        };
        break;
    }

    if (updatedShape) {
      setCurrentShape(updatedShape);
    }
  }, [isDrawing, startPoint, currentShape, getMousePos, isPanning]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    // End panning
    if (isPanning) {
      setIsPanning(false);
      lastPanPoint.current = null;
      return;
    }

    if (currentShape && isDrawing) {
      const newShapes = [...shapes, currentShape];
      setShapes(newShapes);
      addToHistory(newShapes);
    }
    setIsDrawing(false);
    setCurrentShape(null);
    setStartPoint(null);
  }, [currentShape, isDrawing, shapes, addToHistory, isPanning]);

  // Wheel handler for zooming
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    
    const rect = canvasEl.getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;
    
    // Zoom in/out based on wheel direction
    const delta = -e.deltaY * 0.001;
    zoomAtPoint(delta, centerX, centerY);
  }, [zoomAtPoint]);

  // Helper to get touch distance and center for pinch-to-zoom
  const getTouchInfo = useCallback((touches: React.TouchList) => {
    if (touches.length < 2) return null;
    
    const touch1 = touches[0];
    const touch2 = touches[1];
    
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const centerX = (touch1.clientX + touch2.clientX) / 2;
    const centerY = (touch1.clientY + touch2.clientY) / 2;
    
    return { distance, center: { x: centerX, y: centerY } };
  }, []);

  // Touch start handler
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touches = e.touches;
    
    // Two-finger touch: start pan/zoom gesture
    if (touches.length === 2) {
      e.preventDefault();
      const touchInfo = getTouchInfo(touches);
      if (touchInfo) {
        lastTouchDistance.current = touchInfo.distance;
        lastTouchCenter.current = touchInfo.center;
      }
      setIsPanning(true);
      return;
    }
    
    // Single touch: simulate mouse down
    if (touches.length === 1) {
      const touch = touches[0];
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      
      const rect = canvasEl.getBoundingClientRect();
      const pos = {
        x: (touch.clientX - rect.left - panOffset.x) / zoom,
        y: (touch.clientY - rect.top - panOffset.y) / zoom,
      };
      
      setStartPoint(pos);
      setIsDrawing(true);
      
      if (tool === "select") {
        const shape = findShapeAtPosition(pos);
        setSelectedId(shape?.id || null);
        return;
      }
      
      if (tool === "eraser") {
        const shape = findShapeAtPosition(pos);
        if (shape) {
          const newShapes = shapes.filter((s) => {
            if (s.id === shape.id) return false;
            if (s.type === "connector") {
              const conn = s as ConnectorShape;
              if (conn.fromId === shape.id || conn.toId === shape.id) return false;
            }
            return true;
          });
          setShapes(newShapes);
          addToHistory(newShapes);
        }
        return;
      }
      
      if (tool === "sticky") {
        createStickyNote(pos, Math.floor(Math.random() * STICKY_COLORS.length));
        setIsDrawing(false);
        setTool("select");
        return;
      }
      
      // Create initial shape for drawing tools
      let newShape: Shape | null = null;
      
      switch (tool) {
        case "pen":
          newShape = {
            id: generateId(),
            type: "freehand",
            x: 0,
            y: 0,
            points: [pos.x, pos.y],
            stroke: strokeColor,
            strokeWidth: 2,
          };
          break;
        case "rectangle":
          newShape = {
            id: generateId(),
            type: "rectangle",
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            stroke: strokeColor,
            strokeWidth: 2,
            fill: "transparent",
          };
          break;
        case "circle":
          newShape = {
            id: generateId(),
            type: "circle",
            x: pos.x,
            y: pos.y,
            radius: 0,
            stroke: strokeColor,
            strokeWidth: 2,
            fill: "transparent",
          };
          break;
        case "line":
          newShape = {
            id: generateId(),
            type: "line",
            x: 0,
            y: 0,
            points: [pos.x, pos.y, pos.x, pos.y],
            stroke: strokeColor,
            strokeWidth: 2,
          };
          break;
      }
      
      setCurrentShape(newShape);
    }
  }, [getTouchInfo, tool, findShapeAtPosition, shapes, addToHistory, createStickyNote, strokeColor, panOffset, zoom]);

  // Touch move handler
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touches = e.touches;
    
    // Two-finger gesture: pan and zoom
    if (touches.length === 2 && isPanning) {
      e.preventDefault();
      const touchInfo = getTouchInfo(touches);
      if (!touchInfo || !lastTouchDistance.current || !lastTouchCenter.current) return;
      
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      
      const rect = canvasEl.getBoundingClientRect();
      
      // Calculate pan delta
      const panDx = touchInfo.center.x - lastTouchCenter.current.x;
      const panDy = touchInfo.center.y - lastTouchCenter.current.y;
      
      // Calculate zoom delta
      const scaleFactor = touchInfo.distance / lastTouchDistance.current;
      const newZoom = Math.max(0.1, Math.min(5, zoom * scaleFactor));
      
      // Zoom towards center of pinch
      const centerX = touchInfo.center.x - rect.left;
      const centerY = touchInfo.center.y - rect.top;
      const zoomFactor = newZoom / zoom;
      
      const newPanX = centerX - (centerX - panOffset.x) * zoomFactor + panDx;
      const newPanY = centerY - (centerY - panOffset.y) * zoomFactor + panDy;
      
      setZoom(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
      
      lastTouchDistance.current = touchInfo.distance;
      lastTouchCenter.current = touchInfo.center;
      return;
    }
    
    // Single touch: drawing
    if (touches.length === 1 && isDrawing && startPoint && currentShape) {
      const touch = touches[0];
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      
      const rect = canvasEl.getBoundingClientRect();
      const pos = {
        x: (touch.clientX - rect.left - panOffset.x) / zoom,
        y: (touch.clientY - rect.top - panOffset.y) / zoom,
      };
      
      let updatedShape: Shape | null = null;
      
      switch (currentShape.type) {
        case "freehand":
          updatedShape = {
            ...currentShape,
            points: [...currentShape.points, pos.x, pos.y],
          };
          break;
        case "rectangle":
          updatedShape = {
            ...currentShape,
            width: pos.x - startPoint.x,
            height: pos.y - startPoint.y,
          };
          break;
        case "circle":
          const dx = pos.x - startPoint.x;
          const dy = pos.y - startPoint.y;
          updatedShape = {
            ...currentShape,
            radius: Math.sqrt(dx * dx + dy * dy),
          };
          break;
        case "line":
          updatedShape = {
            ...currentShape,
            points: [startPoint.x, startPoint.y, pos.x, pos.y],
          };
          break;
      }
      
      if (updatedShape) {
        setCurrentShape(updatedShape);
      }
    }
  }, [getTouchInfo, isPanning, isDrawing, startPoint, currentShape, zoom, panOffset]);

  // Touch end handler
  const handleTouchEnd = useCallback(() => {
    // End two-finger gesture
    if (isPanning) {
      setIsPanning(false);
      lastTouchDistance.current = null;
      lastTouchCenter.current = null;
    }
    
    // End drawing
    if (currentShape && isDrawing) {
      const newShapes = [...shapes, currentShape];
      setShapes(newShapes);
      addToHistory(newShapes);
    }
    
    setIsDrawing(false);
    setCurrentShape(null);
    setStartPoint(null);
  }, [isPanning, currentShape, isDrawing, shapes, addToHistory]);

  // Draw shapes on canvas
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    // HiDPI support for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = stageSize.width;
    const displayHeight = stageSize.height;
    
    // Set actual canvas size in memory (scaled for HiDPI)
    canvasEl.width = displayWidth * dpr;
    canvasEl.height = displayHeight * dpr;
    
    // Set display size via CSS
    canvasEl.style.width = `${displayWidth}px`;
    canvasEl.style.height = `${displayHeight}px`;
    
    // Scale context to account for HiDPI
    ctx.scale(dpr, dpr);

    // Clear and fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Apply pan and zoom transforms
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    const allShapes = currentShape ? [...shapes, currentShape] : shapes;

    allShapes.forEach((shape) => {
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = shape.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      switch (shape.type) {
        case "rectangle":
          ctx.beginPath();
          ctx.rect(shape.x, shape.y, shape.width, shape.height);
          if (shape.fill && shape.fill !== "transparent") {
            ctx.fillStyle = shape.fill;
            ctx.fill();
          }
          ctx.stroke();
          break;

        case "circle":
          ctx.beginPath();
          ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
          if (shape.fill && shape.fill !== "transparent") {
            ctx.fillStyle = shape.fill;
            ctx.fill();
          }
          ctx.stroke();
          break;

        case "line":
          ctx.beginPath();
          ctx.moveTo(shape.points[0], shape.points[1]);
          ctx.lineTo(shape.points[2], shape.points[3]);
          ctx.stroke();
          break;

        case "freehand":
          if (shape.points.length < 4) return;
          ctx.beginPath();
          ctx.moveTo(shape.points[0], shape.points[1]);
          for (let i = 2; i < shape.points.length; i += 2) {
            ctx.lineTo(shape.points[i], shape.points[i + 1]);
          }
          ctx.stroke();
          break;

        case "text":
          ctx.font = `${shape.fontSize}px sans-serif`;
          ctx.fillStyle = shape.stroke;
          ctx.fillText(shape.text, shape.x, shape.y);
          break;

        case "sticky": {
          const stickyColor = STICKY_COLORS[shape.colorIndex % STICKY_COLORS.length];
          // Shadow
          ctx.shadowColor = "rgba(0,0,0,0.15)";
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 4;
          // Background with rounded corners
          ctx.fillStyle = stickyColor.bg;
          ctx.beginPath();
          ctx.roundRect(shape.x, shape.y, shape.width, shape.height, 6);
          ctx.fill();
          ctx.shadowColor = "transparent";
          // Border
          ctx.strokeStyle = stickyColor.border;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(shape.x, shape.y, shape.width, shape.height, 6);
          ctx.stroke();
          ctx.lineWidth = shape.strokeWidth;
          
          // Text with word wrapping
          ctx.fillStyle = stickyColor.text;
          const fontSize = Math.max(12, Math.min(14, shape.width / 12));
          ctx.font = `${fontSize}px sans-serif`;
          
          const padding = 12;
          const lineHeight = fontSize + 6;
          const maxWidth = shape.width - padding * 2;
          const maxLines = Math.floor((shape.height - padding * 2 - 8) / lineHeight);
          
          // Split by newlines first, then wrap each line
          const paragraphs = shape.text.split("\n");
          const wrappedLines: string[] = [];
          
          for (const paragraph of paragraphs) {
            if (wrappedLines.length >= maxLines) break;
            
            const words = paragraph.split(" ");
            let currentLine = "";
            
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const metrics = ctx.measureText(testLine);
              
              if (metrics.width > maxWidth && currentLine) {
                wrappedLines.push(currentLine);
                currentLine = word;
                if (wrappedLines.length >= maxLines) break;
              } else {
                currentLine = testLine;
              }
            }
            
            if (currentLine && wrappedLines.length < maxLines) {
              wrappedLines.push(currentLine);
            }
          }
          
          // Add ellipsis if text was truncated
          if (wrappedLines.length === maxLines && 
              (paragraphs.length > 1 || shape.text.length > wrappedLines.join(" ").length + 10)) {
            const lastLine = wrappedLines[maxLines - 1];
            if (lastLine) {
              const truncated = lastLine.slice(0, -3) + "...";
              wrappedLines[maxLines - 1] = truncated;
            }
          }
          
          // Render wrapped lines
          wrappedLines.forEach((line, i) => {
            ctx.fillText(line, shape.x + padding, shape.y + padding + 12 + i * lineHeight);
          });
          break;
        }

        case "noteEmbed": {
          // Background
          ctx.fillStyle = isDark ? "#2a2a2a" : "#ffffff";
          ctx.shadowColor = "rgba(0,0,0,0.1)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 4;
          ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
          ctx.shadowColor = "transparent";
          // Border
          ctx.strokeStyle = isDark ? "#444" : "#e5e5e5";
          ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
          // Icon
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(shape.x, shape.y, 4, shape.height);
          // Title
          ctx.fillStyle = isDark ? "#fff" : "#000";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText(shape.noteTitle || "Untitled", shape.x + 16, shape.y + 24);
          // Preview
          ctx.fillStyle = isDark ? "#888" : "#666";
          ctx.font = "12px sans-serif";
          ctx.fillText(shape.notePreview.substring(0, 35) + "...", shape.x + 16, shape.y + 48);
          break;
        }

        case "mindmapNode": {
          const radius = 8;
          ctx.beginPath();
          ctx.roundRect(shape.x, shape.y, shape.width, shape.height, radius);
          ctx.fillStyle = shape.isRoot ? "#3b82f6" : (isDark ? "#2a2a2a" : "#ffffff");
          ctx.fill();
          ctx.strokeStyle = shape.isRoot ? "#2563eb" : (isDark ? "#555" : "#ddd");
          ctx.stroke();
          
          // Text with ellipsis if needed
          ctx.fillStyle = shape.isRoot ? "#fff" : (isDark ? "#fff" : "#000");
          ctx.font = shape.isRoot ? "bold 14px sans-serif" : "13px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          
          const maxTextWidth = shape.width - 16; // 8px padding on each side
          let displayText = shape.text;
          
          // Truncate with ellipsis if text is too wide
          if (ctx.measureText(displayText).width > maxTextWidth) {
            while (displayText.length > 0 && ctx.measureText(displayText + "...").width > maxTextWidth) {
              displayText = displayText.slice(0, -1);
            }
            displayText += "...";
          }
          
          ctx.fillText(displayText, shape.x + shape.width / 2, shape.y + shape.height / 2);
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          break;
        }

        case "connector": {
          ctx.beginPath();
          ctx.moveTo(shape.points[0], shape.points[1]);
          // Curved line
          const midX = (shape.points[0] + shape.points[2]) / 2;
          ctx.bezierCurveTo(
            midX, shape.points[1],
            midX, shape.points[3],
            shape.points[2], shape.points[3]
          );
          ctx.stroke();
          break;
        }
      }

      // Draw selection indicator
      if (shape.id === selectedId) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        switch (shape.type) {
          case "rectangle":
          case "sticky":
          case "noteEmbed":
          case "mindmapNode":
            ctx.strokeRect(shape.x - 5, shape.y - 5, shape.width + 10, shape.height + 10);
            break;
          case "circle":
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, shape.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }

        ctx.setLineDash([]);
      }
    });

    // Restore context (undo pan/zoom transforms)
    ctx.restore();
  }, [shapes, currentShape, selectedId, stageSize, bgColor, isDark, zoom, panOffset]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when editing sticky
      if (editingSticky) return;

      // Space key for panning
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          const newShapes = shapes.filter((s) => {
            if (s.id === selectedId) return false;
            if (s.type === "connector") {
              const conn = s as ConnectorShape;
              if (conn.fromId === selectedId || conn.toId === selectedId) return false;
            }
            return true;
          });
          setShapes(newShapes);
          addToHistory(newShapes);
          setSelectedId(null);
        }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
        // Zoom keyboard shortcuts
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          zoomIn();
        }
        if (e.key === "-") {
          e.preventDefault();
          zoomOut();
        }
        if (e.key === "0") {
          e.preventDefault();
          resetView();
        }
      }
      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case "v": setTool("select"); break;
        case "p": setTool("pen"); break;
        case "r": setTool("rectangle"); break;
        case "c": setTool("circle"); break;
        case "l": setTool("line"); break;
        case "t": setTool("text"); break;
        case "e": setTool("eraser"); break;
        case "s": if (!e.ctrlKey && !e.metaKey) setTool("sticky"); break;
        case "m": setTool("mindmap"); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
        lastPanPoint.current = null;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedId, shapes, addToHistory, undo, redo, editingSticky, zoomIn, zoomOut, resetView]);

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Loading state
  if (canvas === undefined) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Not found state
  if (canvas === null) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Layers className="h-12 w-12" />
          <span>Canvas not found</span>
        </div>
      </div>
    );
  }

  const tools: { id: Tool; icon: typeof MousePointer2; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Select (V)" },
    { id: "pen", icon: Pencil, label: "Pen (P)" },
    { id: "rectangle", icon: Square, label: "Rectangle (R)" },
    { id: "circle", icon: Circle, label: "Circle (C)" },
    { id: "line", icon: Minus, label: "Line (L)" },
    { id: "text", icon: Type, label: "Text (T)" },
    { id: "eraser", icon: Eraser, label: "Eraser (E)" },
    { id: "sticky", icon: StickyNote, label: "Sticky Note (S)" },
    { id: "mindmap", icon: GitBranch, label: "Mind Map (M)" },
  ];

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Toolbar */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-1 p-2 border-b bg-background/80 backdrop-blur-sm overflow-x-auto flex-nowrap"
      >
        <TooltipProvider delayDuration={0}>
          {tools.map(({ id, icon: Icon, label }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === id ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTool(id)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label}</TooltipContent>
            </Tooltip>
          ))}

          <div className="w-px h-6 bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={undo}
                disabled={historyIndex <= 0}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Redo (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearCanvas}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Clear Canvas</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={exportCanvas}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Export as PNG</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Zoom Controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={zoomOut}
                disabled={zoom <= 0.1}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zoom Out (Ctrl+-)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 min-w-[50px] text-xs font-medium"
                onClick={resetView}
              >
                {Math.round(zoom * 100)}%
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Reset View (Ctrl+0)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={zoomIn}
                disabled={zoom >= 5}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zoom In (Ctrl++)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={resetView}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Fit to Screen</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative touch-none">
        <canvas
          ref={canvasRef}
          width={stageSize.width}
          height={stageSize.height}
          className="touch-none"
          style={{
            cursor: isPanning || isSpacePressed ? "grab" : tool === "select" ? "default" : tool === "text" ? "text" : "crosshair",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Sticky note editor overlay */}
        <AnimatePresence>
          {editingSticky && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 z-10"
              onClick={(e) => {
                if (e.target === e.currentTarget) updateStickyText();
              }}
            >
              <div className="bg-card rounded-xl shadow-xl p-4 w-[90vw] max-w-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Edit Sticky Note</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingSticky(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <textarea
                  value={stickyText}
                  onChange={(e) => setStickyText(e.target.value)}
                  placeholder="Enter your note..."
                  className="w-full h-32 p-3 rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-3">
                  <Button variant="outline" onClick={() => setEditingSticky(null)}>Cancel</Button>
                  <Button onClick={updateStickyText}>Save</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Note embed selector panel */}
        <AnimatePresence>
          {tool === "noteEmbed" && notes && notes.length > 0 && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-card border-l shadow-xl z-10 overflow-y-auto"
            >
              <div className="p-4 border-b sticky top-0 bg-card">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Embed Note</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTool("select")}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Click a note to add to canvas</p>
              </div>
              <div className="p-2 space-y-1">
                {notes.map((note) => (
                  <button
                    key={note._id}
                    onClick={() => {
                      const { width, height } = getEmbedDimensions();
                      createNoteEmbed(
                        { x: stageSize.width / 2 - width / 2, y: stageSize.height / 2 - height / 2 },
                        { _id: note._id, title: note.title, content: note.content }
                      );
                      setTool("select");
                    }}
                    className="w-full p-3 rounded-lg text-left hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate">{note.title || "Untitled"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mind map helper panel */}
        <AnimatePresence>
          {showMindMapPanel && mindMapRootId && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-xl p-4 z-10"
            >
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Mind Map Mode</span>
                <Button
                  size="sm"
                  onClick={() => {
                    const selected = shapes.find(s => s.id === selectedId);
                    if (selected?.type === "mindmapNode") {
                      addMindMapChild(selected.id);
                    } else {
                      addMindMapChild(mindMapRootId);
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Node
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMindMapPanel(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Select a node and click &quot;Add Node&quot; to create a child
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

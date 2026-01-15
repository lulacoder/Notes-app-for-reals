"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Types for canvas shapes
type Tool = "select" | "pen" | "rectangle" | "circle" | "line" | "text" | "eraser";

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

type Shape = RectangleShape | CircleShape | LineShape | FreehandShape | TextShape;

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

    // Set canvas size
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    try {
      const parsed = JSON.parse(content || '{"shapes":[]}');
      const shapes: Shape[] = parsed.shapes || [];

      if (shapes.length === 0) {
        // Draw empty state
        ctx.fillStyle = isDark ? "#444" : "#ccc";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Empty canvas", canvas.width / 2, canvas.height / 2);
        return;
      }

      // Calculate scale to fit all shapes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      shapes.forEach((shape) => {
        switch (shape.type) {
          case "rectangle":
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

      // Draw shapes
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
            ctx.beginPath();
            ctx.moveTo(shape.points[0], shape.points[1]);
            ctx.lineTo(shape.points[2], shape.points[3]);
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
        }
      });

      ctx.restore();
    } catch (error) {
      // Draw error state
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

  // Convex queries and mutations
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
  }, [addToHistory]);

  // Export canvas as PNG
  const exportCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "canvas.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Find shape at position
  const findShapeAtPosition = useCallback((pos: Point): Shape | null => {
    // Iterate in reverse to get top-most shape first
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      
      switch (shape.type) {
        case "rectangle":
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
          // Simple bounding box check for lines
          const points = shape.points;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let j = 0; j < points.length; j += 2) {
            minX = Math.min(minX, points[j]);
            maxX = Math.max(maxX, points[j]);
            minY = Math.min(minY, points[j + 1]);
            maxY = Math.max(maxY, points[j + 1]);
          }
          if (
            pos.x >= shape.x + minX - 10 &&
            pos.x <= shape.x + maxX + 10 &&
            pos.y >= shape.y + minY - 10 &&
            pos.y <= shape.y + maxY + 10
          ) {
            return shape;
          }
          break;
        case "text":
          // Approximate text bounds
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

  // Mouse down handler
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
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
        const newShapes = shapes.filter((s) => s.id !== shape.id);
        setShapes(newShapes);
        addToHistory(newShapes);
      }
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
  }, [tool, getMousePos, findShapeAtPosition, shapes, strokeColor, addToHistory]);

  // Mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
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
  }, [isDrawing, startPoint, currentShape, getMousePos]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    if (currentShape && isDrawing) {
      const newShapes = [...shapes, currentShape];
      setShapes(newShapes);
      addToHistory(newShapes);
    }
    setIsDrawing(false);
    setCurrentShape(null);
    setStartPoint(null);
  }, [currentShape, isDrawing, shapes, addToHistory]);

  // Draw shapes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, stageSize.width, stageSize.height);

    // Draw all shapes
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
      }

      // Draw selection indicator
      if (shape.id === selectedId) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        switch (shape.type) {
          case "rectangle":
            ctx.strokeRect(shape.x - 5, shape.y - 5, shape.width + 10, shape.height + 10);
            break;
          case "circle":
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, shape.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            break;
          default:
            // For other shapes, draw a simple indicator
            break;
        }

        ctx.setLineDash([]);
      }
    });
  }, [shapes, currentShape, selectedId, stageSize, bgColor]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          const newShapes = shapes.filter((s) => s.id !== selectedId);
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, shapes, addToHistory, undo, redo]);

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
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span>Loading canvas...</span>
        </div>
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
  ];

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-background/80 backdrop-blur-sm">
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
        </TooltipProvider>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={stageSize.width}
          height={stageSize.height}
          className="cursor-crosshair"
          style={{
            cursor: tool === "select" ? "default" : tool === "text" ? "text" : "crosshair",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}

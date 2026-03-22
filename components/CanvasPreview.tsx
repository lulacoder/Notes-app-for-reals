"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface PreviewShape {
  type: string;
  x: number;
  y: number;
  stroke: string;
  strokeWidth: number;
  width?: number;
  height?: number;
  fill?: string;
  radius?: number;
  points?: number[];
  text?: string;
  fontSize?: number;
  colorIndex?: number;
  isRoot?: boolean;
}

const STICKY_COLORS = [
  { bg: "#fef3c7", border: "#f59e0b" },
  { bg: "#fce7f3", border: "#ec4899" },
  { bg: "#dbeafe", border: "#3b82f6" },
  { bg: "#dcfce7", border: "#22c55e" },
  { bg: "#f3e8ff", border: "#a855f7" },
  { bg: "#ffedd5", border: "#f97316" },
];

interface CanvasPreviewProps {
  content: string;
  className?: string;
}

export function CanvasPreview({ content, className = "" }: CanvasPreviewProps) {
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
      const shapes = (parsed.shapes || []) as PreviewShape[];

      if (shapes.length === 0) {
        ctx.fillStyle = isDark ? "#444" : "#ccc";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Empty canvas", canvas.width / 2, canvas.height / 2);
        return;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      shapes.forEach((shape) => {
        switch (shape.type) {
          case "rectangle":
          case "sticky":
          case "noteEmbed":
          case "mindmapNode":
            minX = Math.min(minX, shape.x);
            minY = Math.min(minY, shape.y);
            maxX = Math.max(maxX, shape.x + (shape.width ?? 0));
            maxY = Math.max(maxY, shape.y + (shape.height ?? 0));
            break;
          case "circle":
            minX = Math.min(minX, shape.x - (shape.radius ?? 0));
            minY = Math.min(minY, shape.y - (shape.radius ?? 0));
            maxX = Math.max(maxX, shape.x + (shape.radius ?? 0));
            maxY = Math.max(maxY, shape.y + (shape.radius ?? 0));
            break;
          case "line":
          case "freehand":
          case "connector":
            for (let i = 0; i < (shape.points?.length ?? 0); i += 2) {
              const px = shape.points![i];
              const py = shape.points![i + 1];
              minX = Math.min(minX, px);
              maxX = Math.max(maxX, px);
              minY = Math.min(minY, py);
              maxY = Math.max(maxY, py);
            }
            break;
          case "text":
            minX = Math.min(minX, shape.x);
            minY = Math.min(minY, shape.y - (shape.fontSize ?? 0));
            maxX = Math.max(maxX, shape.x + (shape.text?.length ?? 0) * (shape.fontSize ?? 0) * 0.6);
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
            ctx.rect(shape.x, shape.y, shape.width ?? 0, shape.height ?? 0);
            if (shape.fill && shape.fill !== "transparent") {
              ctx.fillStyle = shape.fill;
              ctx.fill();
            }
            ctx.stroke();
            break;
          case "circle":
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, shape.radius ?? 0, 0, Math.PI * 2);
            if (shape.fill && shape.fill !== "transparent") {
              ctx.fillStyle = shape.fill;
              ctx.fill();
            }
            ctx.stroke();
            break;
          case "line":
          case "connector":
            if (!shape.points || shape.points.length < 2) break;
            ctx.beginPath();
            ctx.moveTo(shape.points[0], shape.points[1]);
            for (let i = 2; i < shape.points.length; i += 2) {
              ctx.lineTo(shape.points[i], shape.points[i + 1]);
            }
            ctx.stroke();
            break;
          case "freehand":
            if (!shape.points || shape.points.length < 4) break;
            ctx.beginPath();
            ctx.moveTo(shape.points[0], shape.points[1]);
            for (let i = 2; i < shape.points.length; i += 2) {
              ctx.lineTo(shape.points[i], shape.points[i + 1]);
            }
            ctx.stroke();
            break;
          case "text":
            ctx.font = `${shape.fontSize ?? 12}px sans-serif`;
            ctx.fillStyle = shape.stroke;
            ctx.fillText(shape.text ?? "", shape.x, shape.y);
            break;
          case "sticky": {
            const stickyColor = STICKY_COLORS[(shape.colorIndex ?? 0) % STICKY_COLORS.length];
            ctx.fillStyle = stickyColor.bg;
            ctx.fillRect(shape.x, shape.y, shape.width ?? 0, shape.height ?? 0);
            ctx.strokeStyle = stickyColor.border;
            ctx.strokeRect(shape.x, shape.y, shape.width ?? 0, shape.height ?? 0);
            break;
          }
          case "noteEmbed":
            ctx.fillStyle = isDark ? "#2a2a2a" : "#f8f8f8";
            ctx.fillRect(shape.x, shape.y, shape.width ?? 0, shape.height ?? 0);
            ctx.strokeStyle = isDark ? "#444" : "#ddd";
            ctx.strokeRect(shape.x, shape.y, shape.width ?? 0, shape.height ?? 0);
            break;
          case "mindmapNode": {
            ctx.fillStyle = shape.isRoot ? "#3b82f6" : isDark ? "#2a2a2a" : "#f8f8f8";
            const radius = 8;
            ctx.beginPath();
            ctx.roundRect(shape.x, shape.y, shape.width ?? 0, shape.height ?? 0, radius);
            ctx.fill();
            ctx.strokeStyle = shape.isRoot ? "#2563eb" : isDark ? "#444" : "#ddd";
            ctx.stroke();
            break;
          }
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

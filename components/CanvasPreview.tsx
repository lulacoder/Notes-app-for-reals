"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { readShapes } from "@/lib/canvas/model";
import { fitScene } from "@/lib/canvas/geometry";
import { renderScene } from "@/lib/canvas/render";

export function CanvasPreview({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const host = container.current,
      element = canvas.current;
    if (!host || !element) return;
    const shapes = readShapes(content);
    let frame = 0;
    const paint = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = host.clientWidth,
          height = host.clientHeight;
        if (!width || !height) return;
        const dpr = window.devicePixelRatio || 1;
        element.width = Math.round(width * dpr);
        element.height = Math.round(height * dpr);
        const ctx = element.getContext("2d");
        if (ctx)
          renderScene(ctx, shapes, {
            width,
            height,
            dpr,
            dark: resolvedTheme === "dark",
            view: fitScene(shapes, width, height, 16),
            grid: false,
          });
      });
    };
    const observer = new ResizeObserver(paint);
    observer.observe(host);
    paint();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [content, resolvedTheme]);
  return (
    <div ref={container} className={className}>
      <canvas
        ref={canvas}
        className="h-full w-full"
        aria-label="Canvas preview"
        role="img"
      />
    </div>
  );
}

import { STICKY_COLORS, type Shape } from "./model";
import { reconnect, shapeBounds, type Viewport } from "./geometry";

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  width: number,
  lineHeight: number,
  maxLines: number,
) {
  let row = 0;
  for (const paragraph of value.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) {
        if (row >= maxLines) return;
        ctx.fillText(line, x, y + row++ * lineHeight);
        line = word;
      } else line = next;
    }
    if (row >= maxLines) return;
    ctx.fillText(line, x, y + row++ * lineHeight);
  }
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  options: {
    width: number;
    height: number;
    view: Viewport;
    dark: boolean;
    dpr?: number;
    selected?: string | null;
    grid?: boolean;
  },
) {
  const { width, height, view, dark, selected, grid = true, dpr = 1 } = options;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = dark ? "#191c1d" : "#fafbfc";
  ctx.fillRect(0, 0, width, height);
  if (grid) {
    const step = Math.max(12, 24 * view.zoom);
    ctx.fillStyle = dark ? "#343b3e" : "#dce1e5";
    for (let x = ((view.x % step) + step) % step; x < width; x += step)
      for (let y = ((view.y % step) + step) % step; y < height; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(view.zoom, view.zoom);
  const scene = reconnect(shapes);
  const ordered = [
    ...scene.filter((shape) => shape.type === "connector"),
    ...scene.filter((shape) => shape.type !== "connector"),
  ];
  for (const shape of ordered) {
    const b = shapeBounds(shape);
    if (
      (b.x + b.width) * view.zoom + view.x < 0 ||
      b.x * view.zoom + view.x > width ||
      (b.y + b.height) * view.zoom + view.y < 0 ||
      b.y * view.zoom + view.y > height
    )
      continue;
    ctx.save();
    ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle =
      dark && ["#000000", "#000"].includes(shape.stroke)
        ? "#e7ecef"
        : !dark && ["#ffffff", "#fff"].includes(shape.stroke)
          ? "#252b30"
          : shape.stroke;
    ctx.fillStyle = shape.fill ?? "transparent";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    switch (shape.type) {
      case "rectangle":
        ctx.beginPath();
        ctx.rect(b.x, b.y, b.width, b.height);
        if (shape.fill && shape.fill !== "transparent") ctx.fill();
        ctx.stroke();
        break;
      case "circle":
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, Math.abs(shape.radius), 0, Math.PI * 2);
        if (shape.fill && shape.fill !== "transparent") ctx.fill();
        ctx.stroke();
        break;
      case "line":
      case "freehand":
      case "connector": {
        if (shape.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(shape.points[0], shape.points[1]);
        for (let i = 2; i < shape.points.length; i += 2)
          ctx.lineTo(shape.points[i], shape.points[i + 1]);
        if (shape.type === "connector") {
          ctx.strokeStyle = "#e85b7b";
          ctx.lineWidth = 1.5;
        }
        ctx.stroke();
        break;
      }
      case "text":
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = `${shape.fontSize}px sans-serif`;
        text(
          ctx,
          shape.text,
          shape.x,
          shape.y,
          Math.max(50, b.width),
          shape.fontSize * 1.4,
          100,
        );
        break;
      case "sticky": {
        const color =
          STICKY_COLORS[
            ((shape.colorIndex % STICKY_COLORS.length) + STICKY_COLORS.length) %
              STICKY_COLORS.length
          ];
        ctx.fillStyle = color.bg;
        ctx.shadowColor = "#00000012";
        ctx.shadowBlur = 9;
        ctx.shadowOffsetY = 3;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.shadowColor = "transparent";
        ctx.fillStyle = color.text;
        ctx.font = "15px sans-serif";
        text(
          ctx,
          shape.text,
          b.x + 15,
          b.y + 15,
          Math.max(20, b.width - 30),
          21,
          Math.max(1, Math.floor((b.height - 28) / 21)),
        );
        break;
      }
      case "noteEmbed":
        ctx.fillStyle = dark ? "#242b2e" : "#ffffff";
        ctx.strokeStyle = dark ? "#485259" : "#d9e0e5";
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.width, b.height, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#e85b7b";
        ctx.font = "10px sans-serif";
        ctx.fillText("NOTE", b.x + 15, b.y + 14);
        ctx.fillStyle = dark ? "#f2f5f7" : "#252b30";
        ctx.font = "600 15px sans-serif";
        text(
          ctx,
          shape.noteTitle || "Untitled",
          b.x + 15,
          b.y + 35,
          b.width - 30,
          20,
          2,
        );
        ctx.fillStyle = dark ? "#a8b2b9" : "#6b7680";
        ctx.font = "12px sans-serif";
        text(
          ctx,
          shape.notePreview,
          b.x + 15,
          b.y + 83,
          b.width - 30,
          18,
          Math.max(0, Math.floor((b.height - 98) / 18)),
        );
        break;
      case "mindmapNode":
        ctx.fillStyle = shape.isRoot ? "#e11d48" : dark ? "#293135" : "#ffffff";
        ctx.strokeStyle = shape.isRoot
          ? "#e11d48"
          : dark
            ? "#4a565e"
            : "#d5dde2";
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.width, b.height, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = shape.isRoot || dark ? "#ffffff" : "#252b30";
        ctx.font = `${shape.isRoot ? "600 " : ""}14px sans-serif`;
        text(
          ctx,
          shape.text,
          b.x + 14,
          b.y + 14,
          b.width - 28,
          20,
          Math.max(1, Math.floor((b.height - 20) / 20)),
        );
        break;
    }
    ctx.restore();
    if (shape.id === selected) {
      ctx.save();
      ctx.strokeStyle = "#e11d48";
      ctx.lineWidth = 1.5 / view.zoom;
      ctx.setLineDash([4 / view.zoom, 3 / view.zoom]);
      ctx.strokeRect(
        b.x - 4 / view.zoom,
        b.y - 4 / view.zoom,
        b.width + 8 / view.zoom,
        b.height + 8 / view.zoom,
      );
      ctx.restore();
    }
  }
  ctx.restore();
}

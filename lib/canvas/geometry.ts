import type { Point, Shape } from "./model";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export function shapeBounds(shape: Shape): Bounds {
  if ("points" in shape) {
    if (shape.points.length < 2)
      return { x: shape.x, y: shape.y, width: 0, height: 0 };
    let x = Infinity,
      y = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    for (let i = 0; i + 1 < shape.points.length; i += 2) {
      x = Math.min(x, shape.points[i]);
      y = Math.min(y, shape.points[i + 1]);
      right = Math.max(right, shape.points[i]);
      bottom = Math.max(bottom, shape.points[i + 1]);
    }
    return { x, y, width: right - x, height: bottom - y };
  }
  if (shape.type === "circle")
    return {
      x: shape.x - Math.abs(shape.radius),
      y: shape.y - Math.abs(shape.radius),
      width: Math.abs(shape.radius) * 2,
      height: Math.abs(shape.radius) * 2,
    };
  if (shape.type === "text") {
    const lines = shape.text.split("\n");
    return {
      x: shape.x,
      y: shape.y,
      width:
        Math.max(1, ...lines.map((line) => line.length)) *
        shape.fontSize *
        0.62,
      height: lines.length * shape.fontSize * 1.4,
    };
  }
  return {
    x: Math.min(shape.x, shape.x + shape.width),
    y: Math.min(shape.y, shape.y + shape.height),
    width: Math.abs(shape.width),
    height: Math.abs(shape.height),
  };
}

export function sceneBounds(shapes: Shape[]): Bounds | null {
  const bounds = shapes
    .filter((shape) => shape.type !== "connector")
    .map(shapeBounds);
  if (!bounds.length) return null;
  const x = Math.min(...bounds.map((b) => b.x)),
    y = Math.min(...bounds.map((b) => b.y));
  return {
    x,
    y,
    width: Math.max(...bounds.map((b) => b.x + b.width)) - x,
    height: Math.max(...bounds.map((b) => b.y + b.height)) - y,
  };
}

export function fitScene(
  shapes: Shape[],
  width: number,
  height: number,
  padding = 48,
): Viewport {
  const b = sceneBounds(shapes);
  if (!b) return { x: 0, y: 0, zoom: 1 };
  const zoom = Math.min(
    2,
    Math.max(
      0.1,
      Math.min(
        Math.max(1, width - padding * 2) / Math.max(1, b.width),
        Math.max(1, height - padding * 2) / Math.max(1, b.height),
      ),
    ),
  );
  return {
    zoom,
    x: (width - b.width * zoom) / 2 - b.x * zoom,
    y: (height - b.height * zoom) / 2 - b.y * zoom,
  };
}

export function toWorld(point: Point, view: Viewport): Point {
  return {
    x: (point.x - view.x) / view.zoom,
    y: (point.y - view.y) / view.zoom,
  };
}

export function translateShape(shape: Shape, dx: number, dy: number): Shape {
  if ("points" in shape)
    return {
      ...shape,
      points: shape.points.map(
        (value, index) => value + (index % 2 === 0 ? dx : dy),
      ),
    };
  return { ...shape, x: shape.x + dx, y: shape.y + dy };
}

export function resizeShape(shape: Shape, point: Point): Shape {
  if (shape.type === "circle")
    return {
      ...shape,
      radius: Math.max(8, Math.hypot(point.x - shape.x, point.y - shape.y)),
    };
  if ("width" in shape) {
    const b = shapeBounds(shape);
    return {
      ...shape,
      x: b.x,
      y: b.y,
      width: Math.max(35, point.x - b.x),
      height: Math.max(30, point.y - b.y),
    };
  }
  return shape;
}

export function reconnect(shapes: Shape[]): Shape[] {
  const byId = new Map(shapes.map((shape) => [shape.id, shape]));
  return shapes.map((shape) => {
    if (shape.type !== "connector") return shape;
    const from = byId.get(shape.fromId),
      to = byId.get(shape.toId);
    if (!from || !to) return shape;
    const a = shapeBounds(from),
      b = shapeBounds(to);
    return {
      ...shape,
      points: [
        a.x + a.width / 2,
        a.y + a.height / 2,
        b.x + b.width / 2,
        b.y + b.height / 2,
      ],
    };
  });
}

export function hitTest(shapes: Shape[], point: Point, zoom = 1): Shape | null {
  const tolerance = 6 / zoom;
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    if (shape.type === "connector") continue;
    const b = shapeBounds(shape);
    if (
      point.x >= b.x - tolerance &&
      point.x <= b.x + b.width + tolerance &&
      point.y >= b.y - tolerance &&
      point.y <= b.y + b.height + tolerance
    )
      return shape;
  }
  return null;
}

export function deleteShape(shapes: Shape[], id: string) {
  return shapes.filter(
    (shape) =>
      shape.id !== id &&
      (shape.type !== "connector" ||
        (shape.fromId !== id && shape.toId !== id)),
  );
}

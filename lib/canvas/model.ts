import { z } from "zod";

// Sticky note color options
export const STICKY_COLORS = [
  { bg: "#fef3c7", border: "#f59e0b", text: "#78350f" }, // Yellow
  { bg: "#fce7f3", border: "#ec4899", text: "#831843" }, // Pink
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a8a" }, // Blue
  { bg: "#dcfce7", border: "#22c55e", text: "#14532d" }, // Green
  { bg: "#f3e8ff", border: "#a855f7", text: "#581c87" }, // Purple
  { bg: "#ffedd5", border: "#f97316", text: "#7c2d12" }, // Orange
];

// Types for canvas shapes
export type Tool =
  | "select"
  | "pan"
  | "pen"
  | "rectangle"
  | "circle"
  | "line"
  | "text"
  | "eraser"
  | "sticky"
  | "noteEmbed"
  | "mindmap";

export interface Point {
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

export type Shape =
  | RectangleShape
  | CircleShape
  | LineShape
  | FreehandShape
  | TextShape
  | StickyNoteShape
  | NoteEmbedShape
  | MindMapNodeShape
  | ConnectorShape;

const baseShape = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  stroke: z.string(),
  strokeWidth: z.number(),
  fill: z.string().optional(),
});
const dimensions = { width: z.number(), height: z.number() };
const shapeSchema = z.discriminatedUnion("type", [
  baseShape.extend({ type: z.literal("rectangle"), ...dimensions }),
  baseShape.extend({ type: z.literal("circle"), radius: z.number() }),
  baseShape.extend({ type: z.literal("line"), points: z.array(z.number()) }),
  baseShape.extend({
    type: z.literal("freehand"),
    points: z.array(z.number()),
  }),
  baseShape.extend({
    type: z.literal("text"),
    text: z.string(),
    fontSize: z.number(),
  }),
  baseShape.extend({
    type: z.literal("sticky"),
    ...dimensions,
    text: z.string(),
    colorIndex: z.number(),
  }),
  baseShape.extend({
    type: z.literal("noteEmbed"),
    ...dimensions,
    noteId: z.string(),
    noteTitle: z.string(),
    notePreview: z.string(),
  }),
  baseShape.extend({
    type: z.literal("mindmapNode"),
    ...dimensions,
    text: z.string(),
    parentId: z.string().nullable(),
    isRoot: z.boolean(),
    collapsed: z.boolean(),
  }),
  baseShape.extend({
    type: z.literal("connector"),
    fromId: z.string(),
    toId: z.string(),
    points: z.array(z.number()),
  }),
]);

export function readShapes(content: string): Shape[] {
  try {
    return z
      .object({ shapes: z.array(shapeSchema) })
      .parse(JSON.parse(content || '{"shapes":[]}')).shapes;
  } catch (error) {
    console.error("Failed to parse canvas content:", error);
    return [];
  }
}

// Use the persisted field order for comparisons, regardless of creation order.
export function serializeShapes(shapes: Shape[]): string {
  return JSON.stringify({
    shapes: shapes.map((shape) => shapeSchema.parse(shape)),
  });
}

// Generate unique ID
export function generateId(): string {
  return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

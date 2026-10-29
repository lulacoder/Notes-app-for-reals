import { describe, expect, it } from "vitest";
import { readShapes, serializeShapes, type Shape } from "../lib/canvas/model";
import {
  deleteShape,
  fitScene,
  reconnect,
  shapeBounds,
  translateShape,
} from "../lib/canvas/geometry";

const first: Shape = {
  id: "first",
  type: "rectangle",
  x: -500,
  y: -200,
  width: 200,
  height: 100,
  fill: "transparent",
  stroke: "#000",
  strokeWidth: 2,
};
const second: Shape = { ...first, id: "second", x: 1000, y: 500 };
const connector: Shape = {
  id: "edge",
  type: "connector",
  x: 0,
  y: 0,
  points: [0, 0, 0, 0],
  fromId: "first",
  toId: "second",
  stroke: "#000",
  strokeWidth: 2,
};

describe("canvas geometry", () => {
  it("compares a newly created scene and its saved response without losing history", () => {
    const created: Shape = {
      id: "idea",
      stroke: "#000",
      strokeWidth: 1,
      x: 20,
      y: 40,
      type: "sticky",
      width: 210,
      height: 170,
      text: "Keep this",
      colorIndex: 0,
    };
    const persisted = serializeShapes([created]);
    expect(serializeShapes(readShapes(persisted))).toBe(persisted);
  });
  it("fits off-screen content inside the viewport", () => {
    const view = fitScene([first, second, connector], 1000, 700);
    for (const shape of [first, second]) {
      const b = shapeBounds(shape);
      expect(b.x * view.zoom + view.x).toBeGreaterThanOrEqual(47);
      expect((b.x + b.width) * view.zoom + view.x).toBeLessThanOrEqual(953);
      expect(b.y * view.zoom + view.y).toBeGreaterThanOrEqual(47);
      expect((b.y + b.height) * view.zoom + view.y).toBeLessThanOrEqual(653);
    }
  });
  it("keeps connectors attached when a node moves and removes attached edges with a node", () => {
    const result = reconnect([
      translateShape(first, 30, 40),
      second,
      connector,
    ]);
    expect(result[2]).toMatchObject({ points: [-370, -110, 1100, 550] });
    expect(deleteShape(result, "first").map((shape) => shape.id)).toEqual([
      "second",
    ]);
    expect(first.x).toBe(-500);
  });
  it("handles long freehand paths without spreading points into function arguments", () => {
    const points = Array.from({ length: 200000 }, (_, index) => index);
    expect(
      shapeBounds({ ...connector, type: "freehand", points }),
    ).toMatchObject({ x: 0, y: 1, width: 199998, height: 199998 });
  });
});

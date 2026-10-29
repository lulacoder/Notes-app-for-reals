import { describe, expect, it } from "vitest";

import { readShapes, serializeShapes, type Shape } from "../lib/canvas/model";
import {
  deleteShape,
  fitScene,
  reconnect,
  resizeShape,
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
  it("keeps circles unchanged on handle clicks and resizes relative to the grab point", () => {
    const circle: Shape = {
      id: "circle",
      type: "circle",
      x: 80,
      y: 60,
      radius: 100,
      stroke: "#000",
      strokeWidth: 2,
    };
    expect(resizeShape(circle, { x: 180, y: 160 })).toBe(circle);
    const start = { x: 176, y: 157 };
    expect(resizeShape(circle, start, start)).toBe(circle);
    expect(resizeShape(circle, { x: 196, y: 177 }, start)).toMatchObject({
      x: 80,
      y: 60,
      radius: 120,
    });
    expect(
      resizeShape(first, { x: -290, y: -80 }, { x: -300, y: -100 }),
    ).toMatchObject({ width: 210, height: 120 });
  });

  it.each([
    [800, 600, 48],
    [240, 140, 16],
  ])(
    "fits large scenes into a %ipx viewport and previews",
    (width, height, padding) => {
      const large: Shape = {
        ...first,
        x: -5000,
        y: -2000,
        width: 10000,
        height: 4000,
      };
      const view = fitScene([large], width, height, padding);
      const b = shapeBounds(large);
      expect(view.zoom).toBeGreaterThan(0);
      expect(view.zoom).toBeLessThan(0.1);
      expect(b.x * view.zoom + view.x).toBeCloseTo(padding);
      expect((b.x + b.width) * view.zoom + view.x).toBeCloseTo(width - padding);
      expect(b.y * view.zoom + view.y).toBeGreaterThanOrEqual(padding);
      expect((b.y + b.height) * view.zoom + view.y).toBeLessThanOrEqual(
        height - padding,
      );
    },
  );

  it("preserves saved text baseline coordinates and includes its height above the anchor", () => {
    const [label] = readShapes(
      '{"shapes":[{"id":"label","type":"text","x":100,"y":200,"text":"Existing label","fontSize":20,"stroke":"#000","strokeWidth":1}]}',
    );
    expect(label).toMatchObject({ x: 100, y: 200 });
    expect(shapeBounds(label)).toMatchObject({ x: 100, y: 180, height: 28 });
    expect(readShapes(serializeShapes([label]))[0]).toMatchObject({ y: 200 });
  });
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

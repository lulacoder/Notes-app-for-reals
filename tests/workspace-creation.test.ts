import { describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import { account, setup } from "./convex";

describe("workspace creation titles", () => {
  it.each([
    { title: undefined, expected: "Untitled Canvas" },
    { title: "", expected: "Untitled Canvas" },
    { title: " \n\t ", expected: "Untitled Canvas" },
    { title: "  Research map  ", expected: "Research map" },
  ])("creates a canvas titled $expected from '$title'", async ({ title, expected }) => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const id = await owner.mutation(api.canvases.createCanvas, { title });

    expect(await owner.query(api.canvases.getCanvas, { id })).toMatchObject({
      title: expected,
      content: '{"shapes":[]}',
      isPinned: false,
      isDeleted: false,
      tagIds: [],
    });
  });

  it.each([
    { title: undefined, expected: "Untitled Board" },
    { title: "", expected: "Untitled Board" },
    { title: " \n\t ", expected: "Untitled Board" },
    { title: "  Release plan  ", expected: "Release plan" },
  ])("creates a board titled $expected from '$title'", async ({ title, expected }) => {
    const t = setup();
    const owner = (await account(t, "user")).client;
    const id = await owner.mutation(api.kanban.createBoard, { title });

    expect(await owner.query(api.kanban.getBoard, { id })).toMatchObject({
      title: expected,
      isPinned: false,
      isDeleted: false,
    });
    expect((await owner.query(api.kanban.listColumns, { boardId: id })).map((column) => column.title))
      .toEqual(["To Do", "In Progress", "Done"]);
  });
});

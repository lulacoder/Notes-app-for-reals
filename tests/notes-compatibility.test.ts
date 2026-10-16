import { ConvexHttpClient } from "convex/browser";
import { preloadedQueryResult } from "convex/nextjs";
import { getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { getNoteSummaries } from "../lib/notes-data";
import { getNotesData } from "../lib/notes-server";
import { account, setup } from "./convex";

// Next's cookie-backed auth helper requires a request. Keep real Convex preload
// serialization and replace only its network transport with the in-memory backend.
vi.mock("../lib/auth-server", async () => {
  const { preloadQuery } = await import("convex/nextjs");
  return { preloadAuthQuery: preloadQuery };
});

afterEach(async () => {
  // Promise.all rejects before its sibling queries finish. Let those database
  // transactions close before the next test creates a Convex backend.
  const query = ConvexHttpClient.prototype.query;
  if (vi.isMockFunction(query)) {
    await Promise.allSettled(query.mock.results.map((result) => result.value));
  }
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function backend(missing: string[] = []) {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://compatibility-test.convex.cloud");
  const t = setup();
  const owner = (await account(t, "user")).client;
  const other = (await account(t, "user")).client;
  await owner.mutation(api.canvases.createCanvas, { title: "Owner canvas" });
  await other.mutation(api.canvases.createCanvas, { title: "Other owner canvas" });
  const id = await owner.mutation(api.notes.createNote, { title: "Keep my note" });
  await owner.mutation(api.notes.updateNote, {
    id, content: `<p>${"Searchable ".repeat(30)}needle-at-the-end</p><img src="https://example.com/note.png">`,
  });
  const trashId = await owner.mutation(api.notes.createNote, { title: "My trash" });
  await owner.mutation(api.notes.softDeleteNote, { id: trashId });
  const otherId = await other.mutation(api.notes.createNote, { title: "Other user's trash" });
  await other.mutation(api.notes.softDeleteNote, { id: otherId });
  const transport = vi.spyOn(ConvexHttpClient.prototype, "query").mockImplementation(async (...[query, args]: Parameters<ConvexHttpClient["query"]>) => {
    const name = getFunctionName(query);
    if (missing.includes(name)) {
      throw new Error(`[Request ID: rollout-test] Server Error\nCould not find public function for '${name}'.\n`);
    }
    return owner.query(query, args ?? {});
  });
  return { owner, id, trashId, transport };
}

describe("frontend compatibility during a Convex rollout", () => {
  it("keeps the summary and count queries when the new backend is deployed", async () => {
    const { transport } = await backend();
    const data = await getNotesData();
    expect(data.preloadedNotes._name).toBe(getFunctionName(api.notes.listNoteSummaries));
    expect(data.preloadedTrashCount._name).toBe(getFunctionName(api.notes.countTrash));
    expect(preloadedQueryResult(data.preloadedNotes)[0]).not.toHaveProperty("content");
    expect(preloadedQueryResult(data.preloadedTrashCount)).toBe(1);
    expect(data.preloadedCanvases._name).toBe("canvases:listCanvasSummaries");
    expect(transport.mock.calls.map(([query]) => getFunctionName(query))).not.toContain("notes:listNotes");
    expect(transport.mock.calls.map(([query]) => getFunctionName(query))).not.toContain("notes:listTrash");
  });

  it("loads owner data and retains legacy subscription names when new functions are missing", async () => {
    const { owner, id, trashId } = await backend(["notes:listNoteSummaries", "notes:countTrash"]);
    const data = await getNotesData();
    expect(data.preloadedNotes._name).toBe(getFunctionName(api.notes.listNotes));
    expect(data.preloadedTrashCount._name).toBe(getFunctionName(api.notes.listTrash));
    const summaries = getNoteSummaries(preloadedQueryResult(data.preloadedNotes));
    expect(summaries).toEqual(await owner.query(api.notes.listNoteSummaries));
    expect(summaries).toHaveLength(1);
    expect(summaries[0]._id).toBe(id);
    expect(summaries[0].searchText).toContain("needle-at-the-end");
    expect(summaries[0].thumbnail).toBe("https://example.com/note.png");
    const trash = preloadedQueryResult(data.preloadedTrashCount);
    expect(trash).toEqual(await owner.query(api.notes.listTrash));
    await owner.mutation(api.notes.restoreNote, { id: trashId });
    expect(await owner.query(api.notes.listTrash)).toEqual([]);
  });

  it("falls back for trash independently of note summaries", async () => {
    await backend(["notes:countTrash"]);
    const data = await getNotesData();
    expect(data.preloadedNotes._name).toBe("notes:listNoteSummaries");
    expect(data.preloadedTrashCount._name).toBe("notes:listTrash");
  });

  it.each([false, true])("keeps the workspace available when canvas summaries are missing, opaque error: %s", async (opaque) => {
    const { owner } = await backend(["canvases:listCanvasSummaries"]);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    if (opaque) {
      vi.mocked(ConvexHttpClient.prototype.query).mockImplementation(async (...[query, args]: Parameters<ConvexHttpClient["query"]>) => {
        if (getFunctionName(query) === "canvases:listCanvasSummaries") throw new Error("[Request ID: rollout-test] Server Error\n");
        return owner.query(query, args ?? {});
      });
    }
    const data = await getNotesData();
    expect(data.preloadedCanvases._name).toBe("canvases:listCanvases");
    const canvases = preloadedQueryResult(data.preloadedCanvases);
    expect(canvases).toEqual(await owner.query(api.canvases.listCanvases));
    expect(canvases).toHaveLength(1);
    expect(canvases[0].title).toBe("Owner canvas");
    expect(data.preloadedNotes._name).toBe("notes:listNoteSummaries");
    expect(warning).toHaveBeenCalledOnce();
  });

  it("does not conceal a canvas query failure unrelated to a missing function", async () => {
    const { owner, transport } = await backend();
    transport.mockImplementation(async (...[query, args]: Parameters<ConvexHttpClient["query"]>) => {
      if (getFunctionName(query) === "canvases:listCanvasSummaries") throw new Error("Network request failed");
      return owner.query(query, args ?? {});
    });
    await expect(getNotesData()).rejects.toThrow("Network request failed");
    expect(transport.mock.calls.map(([query]) => getFunctionName(query))).not.toContain("canvases:listCanvases");
  });

  it("preserves the original production error when the fallback also fails", async () => {
    const { owner, transport } = await backend();
    const failure = new Error("[Request ID: rollout-test] Server Error\n");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    transport.mockImplementation(async (...[query, args]: Parameters<ConvexHttpClient["query"]>) => {
      if (getFunctionName(query) === "canvases:listCanvasSummaries") throw failure;
      if (getFunctionName(query) === "canvases:listCanvases") throw new Error("Fallback also failed");
      return owner.query(query, args ?? {});
    });
    await expect(getNotesData()).rejects.toBe(failure);
  });

  it.each(["Not authenticated", "Network request failed", "Could not find public function for 'notes:getNote'."])(
    "does not conceal another backend failure: %s", async (message) => {
      const { owner, transport } = await backend();
      transport.mockImplementation(async (...[query, args]: Parameters<ConvexHttpClient["query"]>) => {
        if (getFunctionName(query) === "notes:listNoteSummaries") throw new Error(message);
        return owner.query(query, args ?? {});
      });
      await expect(getNotesData()).rejects.toThrow(message);
      expect(transport.mock.calls.map(([query]) => getFunctionName(query))).not.toContain("notes:listNotes");
    },
  );
});

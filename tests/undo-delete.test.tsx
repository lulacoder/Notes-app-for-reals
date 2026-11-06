// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { getFunctionName } from "convex/server";
import { afterEach, expect, it, vi } from "vitest";
import { ToastProvider } from "../components/ui/toast-notification";
import { useUndoDelete } from "../lib/use-undo-delete";
import type { Id } from "../convex/_generated/dataModel";

const mutations = vi.hoisted(() => ({ note: vi.fn(), canvas: vi.fn() }));
vi.mock("convex/react", () => ({
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(reference) === "notes:restoreNote" ? mutations.note : mutations.canvas,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function DeleteButtons() {
  const notify = useUndoDelete();
  return <>
    <button onClick={() => notify("note", "note-id" as Id<"notes">)}>Delete note</button>
    <button onClick={() => notify("canvas", "canvas-id" as Id<"canvases">)}>Delete canvas</button>
  </>;
}

afterEach(() => { vi.clearAllMocks(); document.body.innerHTML = ""; });

it.each([
  ["note", "note-id"],
  ["canvas", "canvas-id"],
] as const)("restores the deleted %s when Undo is clicked", async (kind, id) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<ToastProvider><DeleteButtons /></ToastProvider>));
  await act(async () => {
    [...container.querySelectorAll("button")].find((button) => button.textContent === `Delete ${kind}`)?.click();
  });
  expect(container.textContent).toContain(`${kind === "note" ? "Note" : "Canvas"} moved to recently deleted`);
  await act(async () => {
    [...container.querySelectorAll("button")].find((button) => button.textContent === "Undo")?.click();
  });
  expect(mutations[kind]).toHaveBeenCalledWith({ id });
  expect(container.textContent).toContain(`${kind === "note" ? "Note" : "Canvas"} restored`);
  await act(async () => root.unmount());
});

it("explains where to retry when a restore fails", async () => {
  mutations.note.mockRejectedValueOnce(new Error("offline"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<ToastProvider><DeleteButtons /></ToastProvider>));
  await act(async () => { [...container.querySelectorAll("button")].find((b) => b.textContent === "Delete note")?.click(); });
  await act(async () => { [...container.querySelectorAll("button")].find((b) => b.textContent === "Undo")?.click(); });
  expect(container.textContent).toContain("Could not restore note");
  expect(container.textContent).toContain("Try restoring it from Recently deleted.");
  await act(async () => root.unmount());
  log.mockRestore();
});

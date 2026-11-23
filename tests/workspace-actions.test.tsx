// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TagAssigner } from "@/components/TagManager";
import { WorkspaceTrash } from "@/components/WorkspaceTrash";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(), error: vi.fn(), success: vi.fn(),
  queries: {} as Record<string, unknown[]>,
}));

vi.mock("convex/react", () => ({
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
    (args: unknown) => mocks.mutate(getFunctionName(reference), args),
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) => mocks.queries[getFunctionName(reference)] ?? [],
  useConvexAuth: () => ({ isAuthenticated: true }),
}));
vi.mock("@/components/ui/toast-notification", () => ({
  useToast: () => ({ error: mocks.error, success: mocks.success }),
}));
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => children,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queries = {};
  mocks.mutate.mockReset().mockResolvedValue(undefined);
  container = document.body.appendChild(document.createElement("div"));
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function button(label: string) {
  const scope = document.querySelector('[role="alertdialog"]') ?? document.body;
  const result = [...scope.querySelectorAll("button")].find((item) =>
    item.getAttribute("aria-label") === label || item.textContent?.trim() === label,
  );
  if (!result) throw new Error(`Missing button: ${label}`);
  return result;
}

async function setName(value: string) {
  const input = document.querySelector<HTMLInputElement>("#edit-tag-name");
  if (!input) throw new Error("Missing tag name input");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return input;
}

it.each([
  ["Canvases", "canvases:listTrash", "canvases:deleteCanvas", { content: "" }],
  ["Boards", "kanban:listBoardTrash", "kanban:permanentDeleteBoard", {}],
])("confirms permanent deletion of %s and disables actions while it runs", async (category, query, mutation, fields) => {
  mocks.queries[query] = [{ _id: "item-1", title: "Ideas", deletedAt: Date.now(), ...fields }];
  await act(async () => root.render(<WorkspaceTrash />));
  await act(async () => button(category).click());
  await act(async () => button("Delete Ideas permanently").click());
  expect(mocks.mutate).not.toHaveBeenCalled();
  await act(async () => button("Cancel").click());
  expect(mocks.mutate).not.toHaveBeenCalled();

  let finish = () => {};
  mocks.mutate.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
  await act(async () => button("Delete Ideas permanently").click());
  await act(async () => button("Delete permanently").click());
  expect(mocks.mutate).toHaveBeenCalledExactlyOnceWith(mutation, { id: "item-1" });
  expect(button("Restore Ideas").disabled).toBe(true);
  await act(async () => finish());
  expect(mocks.success).toHaveBeenCalledWith("Permanently deleted");
});

it("reports a failed permanent deletion and lets the user retry", async () => {
  mocks.queries["canvases:listTrash"] = [{ _id: "item-1", title: "Ideas", content: "" }];
  mocks.mutate.mockRejectedValueOnce(new Error("offline"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => root.render(<WorkspaceTrash />));
  await act(async () => button("Canvases").click());
  await act(async () => button("Delete Ideas permanently").click());
  await act(async () => button("Delete permanently").click());
  expect(mocks.error).toHaveBeenCalledWith("Could not delete", "offline");
  expect(button("Delete Ideas permanently").disabled).toBe(false);
});

it("edits a tag name and color from the shared note/canvas tag picker", async () => {
  mocks.queries["tags:listTags"] = [{ _id: "tag-1", name: "Ideas", color: "bg-blue-500" }];
  await act(async () => root.render(<TagAssigner selectedTagIds={[]} onUpdateTags={async () => {}} />));
  await act(async () => button("Edit Ideas").click());
  await setName(" Projects ");
  await act(async () => button("Green").click());
  await act(async () => document.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(mocks.mutate).toHaveBeenCalledExactlyOnceWith("tags:updateTag", { id: "tag-1", name: "Projects", color: "bg-green-500" });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("keeps the tag form open and preserves input when saving fails", async () => {
  mocks.queries["tags:listTags"] = [{ _id: "tag-1", name: "Ideas", color: "bg-blue-500" }];
  mocks.mutate.mockRejectedValueOnce(new Error("Tag with this name already exists"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => root.render(<TagAssigner selectedTagIds={[]} onUpdateTags={async () => {}} />));
  await act(async () => button("Edit Ideas").click());
  const input = await setName("Work");
  await act(async () => document.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(mocks.error).toHaveBeenCalledWith("Could not update tag", "Tag with this name already exists");
  expect(input.value).toBe("Work");
  expect(button("Save changes").disabled).toBe(false);
});

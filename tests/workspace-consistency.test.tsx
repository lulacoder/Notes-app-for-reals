// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import { CanvasCard } from "@/components/CanvasCard";
import { NotesEmptyState } from "@/components/NotesEmptyState";
import { TagAssigner } from "@/components/TagManager";
import { WorkspaceTrash } from "@/components/WorkspaceTrash";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  error: vi.fn(),
  notifyDeleted: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
    (args: unknown) => mocks.mutate(getFunctionName(reference), args),
  useQuery: () => [],
  useConvexAuth: () => ({ isAuthenticated: true }),
}));
vi.mock("@/components/ui/toast-notification", () => ({
  useToast: () => ({ error: mocks.error }),
}));
vi.mock("@/lib/use-undo-delete", () => ({
  useUndoDelete: () => mocks.notifyDeleted,
}));
vi.mock("@/components/CanvasPreview", () => ({ CanvasPreview: () => null }));
vi.mock("@/components/DocumentLink", () => ({
  DocumentLink: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick: React.MouseEventHandler<HTMLButtonElement> }) => <button onClick={onClick}>{children}</button>,
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
  mocks.mutate.mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

function button(text: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find((item) => item.textContent?.includes(text));
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
}

describe("workspace consistency", () => {
  it("shows notes and other deleted item categories in one place", async () => {
    await act(async () => root.render(<WorkspaceTrash />));
    expect(container.textContent).toContain("No deleted notes");
    for (const category of ["Canvases", "Boards", "Cards"]) {
      await act(async () => button(category).click());
      expect(container.textContent).toContain(`No deleted ${category.toLowerCase()}.`);
    }
    await act(async () => button("Notes").click());
    expect(container.textContent).toContain("No deleted notes");
  });

  it("uses canvas actions with undo and reports failed pinning", async () => {
    const id = "canvas-1" as Id<"canvases">;
    await act(async () => root.render(<CanvasCard canvas={{ _id: id, title: "Ideas", content: "", updatedAt: 0 }} />));
    await act(async () => button("Delete").click());
    expect(mocks.mutate).toHaveBeenCalledWith("canvases:softDeleteCanvas", { id });
    expect(mocks.notifyDeleted).toHaveBeenCalledWith("canvas", id);
    mocks.mutate.mockRejectedValueOnce(new Error("offline"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => button("Pin").click());
    expect(mocks.error).toHaveBeenCalledWith("Could not update canvas", "Please try again.");
    consoleError.mockRestore();
  });

  it("lets a new user create their first note", async () => {
    const onCreateNote = vi.fn();
    await act(async () => root.render(<NotesEmptyState onCreateNote={onCreateNote} creating={false} />));
    await act(async () => button("Create your first note").click());
    expect(onCreateNote).toHaveBeenCalledOnce();
  });

  it("reports tag creation failures without discarding the entered name", async () => {
    mocks.mutate.mockRejectedValueOnce(new Error("offline"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => root.render(<TagAssigner selectedTagIds={[]} onUpdateTags={async () => {}} />));
    const input = container.querySelector('input[placeholder="New tag"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("Tag input is missing");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "Ideas");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(mocks.error).toHaveBeenCalledWith("Could not create tag", "Please try again.");
    expect(input.value).toBe("Ideas");
    consoleError.mockRestore();
  });

  it("distinguishes a created tag from a failed assignment", async () => {
    mocks.mutate.mockResolvedValueOnce("tag-1");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => root.render(<TagAssigner selectedTagIds={[]} onUpdateTags={async () => { throw new Error("offline"); }} />));
    const input = container.querySelector('input[placeholder="New tag"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("Tag input is missing");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "Ideas");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(mocks.error).toHaveBeenCalledWith("Tag created, but could not be added", "Try adding it again.");
    expect(input.value).toBe("");
    consoleError.mockRestore();
  });
});

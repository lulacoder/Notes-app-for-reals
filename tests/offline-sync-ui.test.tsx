// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { LocalDraft } from "@/lib/offline-notes";
import type { DraftConflict } from "@/lib/offline-sync";
import { OfflineSync } from "@/components/OfflineSync";

const mocks = vi.hoisted(() => ({
  sync: vi.fn(),
  resolve: vi.fn(),
  connected: true,
  client: {},
}));

vi.mock("convex/react", () => ({
  useConvex: () => mocks.client,
  useConvexAuth: () => ({ isAuthenticated: true }),
  useConvexConnectionState: () => ({ isWebSocketConnected: mocks.connected }),
}));
vi.mock("@/lib/offline-sync", () => ({ syncOfflineNotes: mocks.sync }));
vi.mock("@/lib/offline-notes", () => ({
  offlineOwner: () => "owner",
  setOfflineOwner: () => {},
  resolveRecoveredDraft: mocks.resolve,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
let online = true;

function conflict(title: string): DraftConflict {
  const text = { title, content: `<p>${title} offline</p>` };
  const draft: LocalDraft = {
    key: title,
    owner: "owner",
    id: title as Id<"notes">,
    base: text,
    text,
    updated: 0,
  };
  return { draft, remote: { title, content: `<p>${title} synced</p>` } };
}

async function render() {
  await act(async () => root.render(<OfflineSync owner="owner" />));
}

function button(label: string) {
  const found = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
    ?? [...container.querySelectorAll("button")].find((item) => item.textContent?.trim() === label);
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.connected = true;
  online = true;
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);
  vi.stubGlobal("indexedDB", {});
  mocks.sync.mockResolvedValue({ conflicts: [], failed: false, busy: false });
  mocks.resolve.mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("counts conflicts and lets the user step through them", async () => {
  const conflicts = [conflict("First"), conflict("Second"), conflict("Third")];
  mocks.sync.mockResolvedValueOnce({ conflicts, failed: false, busy: false });
  await render();

  expect(container.textContent).toContain("First");
  expect(container.textContent).toContain("1 of 3");
  expect(button("Previous note to review").disabled).toBe(true);

  await act(async () => button("Next note to review").click());
  expect(container.textContent).toContain("Second");
  expect(container.textContent).toContain("2 of 3");

  mocks.sync.mockReturnValue(new Promise(() => {}));
  await act(async () => button("Use synced version").click());
  expect(mocks.resolve).toHaveBeenCalledWith(conflicts[1].draft, null);
  expect(container.textContent).toContain("Third");
  expect(container.textContent).toContain("2 of 2");
});

it("shows the offline link as soon as the browser goes offline and hides it when back", async () => {
  await render();
  expect(container.textContent).not.toContain("Open offline notes");

  online = false;
  await act(async () => window.dispatchEvent(new Event("offline")));
  expect(container.textContent).toContain("Open offline notes");

  online = true;
  await act(async () => window.dispatchEvent(new Event("online")));
  expect(container.textContent).not.toContain("Open offline notes");
});

it("shows the offline link once the sync connection has stayed down", async () => {
  vi.useFakeTimers();
  try {
    mocks.connected = false;
    await render();
    expect(container.textContent).not.toContain("Open offline notes");
    await act(async () => vi.advanceTimersByTime(5000));
    expect(container.textContent).toContain("Open offline notes");
  } finally {
    vi.useRealTimers();
  }
});

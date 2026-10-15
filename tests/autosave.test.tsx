// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutosave } from "../lib/use-autosave";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;

function Editor({ value, save, enabled = true }: {
  value: string;
  save: (value: string) => Promise<void>;
  enabled?: boolean;
}) {
  useAutosave(value, save, enabled);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  root = createRoot(document.createElement("div"));
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("editor autosave", () => {
  it("combines short pauses and submits only the latest edit after two seconds", async () => {
    const save = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    await act(async () => root.render(<Editor value="first" save={save} />));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    await act(async () => root.render(<Editor value="second" save={save} />));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(save).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(save.mock.calls).toEqual([["second"]]);
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("saves every ten seconds during continuous edits and resets the deadline", async () => {
    const save = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    await act(async () => root.render(<Editor value="0" save={save} />));
    for (let second = 1; second < 20; second++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
      await act(async () => root.render(<Editor value={String(second)} save={save} />));
    }
    expect(save.mock.calls).toEqual([["9"]]);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(save.mock.calls).toEqual([["9"], ["19"]]);
  });

  it("submits pending edits on unmount and cancels the remaining timers", async () => {
    const save = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    await act(async () => root.render(<Editor value="latest" save={save} />));
    await act(async () => root.render(null));
    expect(save.mock.calls).toEqual([["latest"]]);
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flushes a hidden tab once even if pagehide also fires", async () => {
    const save = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    await act(async () => root.render(<Editor value="hidden edit" save={save} />));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pagehide"));
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(save.mock.calls).toEqual([["hidden edit"]]);
  });

  it("keeps pending saves attached to the document being left", async () => {
    const first = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    const second = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    await act(async () => root.render(<Editor key="first" value="first edit" save={first} />));
    await act(async () => root.render(<Editor key="second" value="second edit" save={second} />));
    expect(first.mock.calls).toEqual([["first edit"]]);
    expect(second).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(second.mock.calls).toEqual([["second edit"]]);
  });

  it("does not submit an empty draft while document data is loading", async () => {
    const save = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    await act(async () => root.render(<Editor value="" save={save} enabled={false} />));
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    await act(async () => root.render(null));
    expect(save).not.toHaveBeenCalled();
  });

  it("handles rejected saves without an unhandled promise rejection", async () => {
    const failure = new Error("Not authenticated");
    const save = vi.fn<(value: string) => Promise<void>>().mockRejectedValue(failure);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => root.render(<Editor value="edit" save={save} />));
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(error).toHaveBeenCalledWith("Failed to autosave document:", failure);
  });
});

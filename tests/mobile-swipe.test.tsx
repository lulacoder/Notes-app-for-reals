// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useSwipeGesture } from "../components/MobileNav";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("tracks a swipe, opens from a wider area, and preserves scrolling and editing", async () => {
  const open = vi.fn();
  const close = vi.fn();
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  function Surface({ isOpen }: { isOpen: boolean }) {
    const { containerRef } = useSwipeGesture({ isOpen, onSwipeRight: open, onSwipeLeft: close });
    return <div ref={containerRef}><div data-mobile-sidebar /><textarea /><div contentEditable suppressContentEditableWarning>Note</div></div>;
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<Surface isOpen={false} />));
  const surface = host.firstElementChild as HTMLElement;
  Object.defineProperty(surface.firstElementChild, "offsetWidth", { value: 280 });
  function touch(type: string, x: number, y: number, target: Element = surface) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "touches", { value: type === "touchend" || type === "touchcancel" ? [] : [{ clientX: x, clientY: y }] });
    target.dispatchEvent(event);
    return event;
  }
  function end() { touch("touchend", 0, 0); frames.splice(0).forEach((frame) => frame(0)); }

  touch("touchstart", 100, 20);
  touch("touchmove", 110, 80);
  end();
  touch("touchstart", 100, 20, surface.querySelector("textarea")!);
  touch("touchmove", 180, 20, surface.querySelector("textarea")!);
  end();
  expect(open).not.toHaveBeenCalled();

  touch("touchstart", 100, 20);
  const move = touch("touchmove", 150, 25);
  expect(move.defaultPrevented).toBe(true);
  expect(surface.style.getPropertyValue("--sidebar-drag-x")).toBe("-230px");
  expect(open).not.toHaveBeenCalled();
  end();
  expect(open).toHaveBeenCalledTimes(1);

  const editor = surface.querySelector('[contenteditable]')!;
  touch("touchstart", 80, 20, editor);
  touch("touchmove", 130, 25, editor);
  end();
  expect(open).toHaveBeenCalledTimes(2);

  await act(async () => root.render(<Surface isOpen />));
  touch("touchstart", 200, 20);
  touch("touchmove", 150, 25);
  expect(surface.style.getPropertyValue("--sidebar-drag-x")).toBe("-50px");
  touch("touchcancel", 150, 25);
  frames.splice(0).forEach((frame) => frame(0));
  expect(close).not.toHaveBeenCalled();
  touch("touchstart", 200, 20);
  touch("touchmove", 150, 25);
  end();
  expect(close).toHaveBeenCalledTimes(1);

  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

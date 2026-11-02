// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useSwipeGesture } from "../components/MobileNav";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("opens only on a horizontal edge swipe and closes with a left swipe", async () => {
  const open = vi.fn();
  const close = vi.fn();
  function Surface({ isOpen }: { isOpen: boolean }) {
    const { containerRef } = useSwipeGesture({ isOpen, onSwipeRight: open, onSwipeLeft: close });
    return <div ref={containerRef} />;
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<Surface isOpen={false} />));
  const surface = host.firstElementChild!;
  function swipe(startX: number, startY: number, endX: number, endY: number) {
    for (const [type, x, y] of [["touchstart", startX, startY], ["touchmove", endX, endY]] as const) {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, "targetTouches", { value: [{ clientX: x, clientY: y }] });
      surface.dispatchEvent(event);
    }
    surface.dispatchEvent(new Event("touchend", { bubbles: true }));
  }
  swipe(100, 20, 180, 20);
  swipe(0, 20, 60, 120);
  expect(open).not.toHaveBeenCalled();
  swipe(0, 20, 80, 25);
  expect(open).toHaveBeenCalledTimes(1);
  await act(async () => root.render(<Surface isOpen />));
  swipe(200, 20, 100, 25);
  expect(close).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
  host.remove();
});

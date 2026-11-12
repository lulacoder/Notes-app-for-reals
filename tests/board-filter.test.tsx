// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BoardFilter } from "@/components/kanban/BoardFilter";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;

function FilterExample() {
  const [value, setValue] = useState("all");
  return <BoardFilter label="Filter tasks by due date" value={value} onChange={setValue} options={[
    { value: "all", label: "Any due date" },
    { value: "today", label: "Due today" },
  ]} />;
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("opens and changes the selected filter with the keyboard", async () => {
  await act(async () => root.render(<FilterExample />));
  const trigger = container.querySelector("button");
  if (!trigger) throw new Error("Filter trigger is missing");
  expect(trigger.getAttribute("aria-label")).toBe("Filter tasks by due date: Any due date");
  await act(async () => {
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  const choices = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
  expect(choices.map((choice) => choice.textContent)).toEqual(["Any due date", "Due today"]);
  expect(choices[0].getAttribute("aria-checked")).toBe("true");
  await act(async () => {
    choices[1].focus();
    choices[1].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  expect(trigger.getAttribute("aria-label")).toBe("Filter tasks by due date: Due today");
  expect(document.querySelector('[role="menu"]')).toBeNull();
});

it("can clear the tag filter by choosing All tags", async () => {
  const onChange = vi.fn();
  await act(async () => root.render(<BoardFilter label="Filter tasks by tag" value="tag-1" onChange={onChange} options={[
    { value: "", label: "All tags" },
    { value: "tag-1", label: "Work" },
  ]} />));
  const trigger = container.querySelector("button");
  if (!trigger) throw new Error("Filter trigger is missing");
  await act(async () => trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  const choices = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
  expect(choices[1].getAttribute("aria-checked")).toBe("true");
  await act(async () => choices[0].click());
  expect(onChange).toHaveBeenCalledWith("");
});

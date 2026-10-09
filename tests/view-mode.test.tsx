// @vitest-environment jsdom
import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { useNotesViewMode } from "../lib/use-notes-view-mode";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;

function Preference() {
  const [mode, setMode] = useNotesViewMode();
  return <button onClick={() => setMode(mode === "list" ? "grid" : "list")}>{mode}</button>;
}

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("saved view mode", () => {
  it("hydrates a saved grid preference without a server/client mismatch", async () => {
    localStorage.setItem("notes-view-mode", "grid");
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Preference />);
    expect(container.textContent).toBe("list");
    document.body.append(container);
    const errors: unknown[] = [];
    await act(async () => {
      root = hydrateRoot(container, <Preference />, { onRecoverableError: (error) => errors.push(error) });
    });
    expect(container.textContent).toBe("grid");
    expect(errors).toEqual([]);
    await act(async () => { container.querySelector("button")?.click(); });
    expect(container.textContent).toBe("list");
    expect(localStorage.getItem("notes-view-mode")).toBe("list");
  });
});

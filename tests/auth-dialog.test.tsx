// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthDialog } from "../components/auth/AuthDialog";
import { signIn, signUp } from "../lib/auth-client";
import { replaceAuthLocation } from "../lib/auth-redirects";

const { replaceRoute } = vi.hoisted(() => ({ replaceRoute: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceRoute }) }));
vi.mock("../lib/auth-client", () => ({ signIn: { email: vi.fn() }, signUp: { email: vi.fn() } }));
vi.mock("../lib/auth-redirects", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/auth-redirects")>(),
  replaceAuthLocation: vi.fn(),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

async function render(mode: "login" | "register" = "login", returnTo = "/canvas/saved?zoom=2") {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root?.render(<AuthDialog mode={mode} returnTo={returnTo} />); });
}

function fill(name: string, value: string) {
  const input = document.querySelector(`[name="${name}"]`);
  if (!(input instanceof HTMLInputElement)) throw new Error(`Missing input ${name}`);
  input.value = value;
  return input;
}

function submit() {
  const form = document.querySelector("form");
  if (!form) throw new Error("Missing auth form");
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

describe("auth dialogs", () => {
  it("focuses email, preserves the destination when switching modes, and toggles the password", async () => {
    await render();
    expect(document.activeElement).toBe(document.querySelector('[name="email"]'));
    expect(document.querySelector('a[href^="/register"]')?.getAttribute("href")).toBe("/register?next=%2Fcanvas%2Fsaved%3Fzoom%3D2");
    const password = fill("password", "Keep this value");
    const toggle = document.querySelector('[aria-label="Show password"]');
    if (!(toggle instanceof HTMLButtonElement)) throw new Error("Missing password toggle");
    await act(async () => { toggle.click(); });
    expect(password.type).toBe("text");
    expect(password.value).toBe("Keep this value");
    expect(toggle.getAttribute("aria-label")).toBe("Hide password");
  });

  it("starts a fresh request to the requested canvas after sign-in", async () => {
    vi.mocked(signIn.email).mockResolvedValue({ data: null, error: null });
    await render();
    fill("email", " writer@example.com ");
    fill("password", "Password-123");
    await act(async () => { submit(); });
    expect(signIn.email).toHaveBeenCalledWith({ email: "writer@example.com", password: "Password-123" });
    expect(replaceAuthLocation).toHaveBeenCalledWith("/canvas/saved?zoom=2");
    expect(document.querySelector("fieldset")?.disabled).toBe(true);
  });

  it("does not submit twice or close during an in-flight sign-in", async () => {
    let finish: (() => void) | undefined;
    vi.mocked(signIn.email).mockImplementation(() => new Promise((resolve) => { finish = () => resolve({ data: null, error: null }); }));
    await render();
    fill("email", "writer@example.com");
    fill("password", "Password-123");
    await act(async () => { submit(); submit(); });
    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(signIn.email).toHaveBeenCalledTimes(1);
    expect(replaceRoute).not.toHaveBeenCalled();
    await act(async () => { finish?.(); });
  });

  it("keeps entered values and lets the user retry after a network error", async () => {
    vi.mocked(signIn.email).mockRejectedValueOnce(new Error("Offline"));
    await render();
    const email = fill("email", "writer@example.com");
    fill("password", "Password-123");
    await act(async () => { submit(); });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("Check your connection");
    expect(email.value).toBe("writer@example.com");
    expect(document.querySelector("fieldset")?.disabled).toBe(false);
    expect(replaceAuthLocation).not.toHaveBeenCalled();
    vi.mocked(signIn.email).mockResolvedValue({ data: null, error: null });
    await act(async () => { submit(); });
    expect(replaceAuthLocation).toHaveBeenCalledTimes(1);
  });

  it("uses signup autocomplete and validation, and trims the user's name", async () => {
    vi.mocked(signUp.email).mockResolvedValue({ data: null, error: null });
    await render("register");
    expect(document.activeElement).toBe(document.querySelector('[name="name"]'));
    const password = fill("password", "Password-123");
    expect(password.autocomplete).toBe("new-password");
    expect(password.minLength).toBe(8);
    fill("name", "   ");
    fill("email", "writer@example.com");
    await act(async () => { submit(); });
    expect(signUp.email).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe("Please enter your name.");
    fill("name", "  Writer  ");
    await act(async () => { submit(); });
    expect(signUp.email).toHaveBeenCalledWith({ name: "Writer", email: "writer@example.com", password: "Password-123" });
    expect(replaceAuthLocation).toHaveBeenCalledWith("/canvas/saved?zoom=2");
  });

  it("uses a safe destination even when the form receives an external URL", async () => {
    vi.mocked(signIn.email).mockResolvedValue({ data: null, error: null });
    await render("login", "https://example.com");
    fill("email", "writer@example.com");
    fill("password", "Password-123");
    await act(async () => { submit(); });
    expect(replaceAuthLocation).toHaveBeenCalledWith("/notes");
  });
});

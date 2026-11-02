// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSettings } from "../components/auth/AccountSettings";
import { authClient } from "../lib/auth-client";

const state = vi.hoisted(() => ({
  methods: { email: "writer@example.com", hasGoogle: false, hasPassword: true },
  addPassword: vi.fn(),
}));
vi.mock("convex/react", () => ({ useQuery: () => state.methods, useMutation: () => state.addPassword }));
vi.mock("../lib/auth-client", () => ({ authClient: { linkSocial: vi.fn(), signIn: { social: vi.fn() } } }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;

beforeEach(() => { state.methods = { email: "writer@example.com", hasGoogle: false, hasPassword: true }; });
afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

async function render(oauthError?: string) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root?.render(<AccountSettings returnTo="/canvas/saved?zoom=2" connectGoogle oauthError={oauthError} />); });
}

function button(text: string) {
  const result = Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes(text));
  if (!result) throw new Error(`Missing button ${text}`);
  return result;
}

describe("account sign-in settings", () => {
  it("connects Google to the current session and locks repeated clicks", async () => {
    let finish: (() => void) | undefined;
    vi.mocked(authClient.linkSocial).mockImplementation(() => new Promise((resolve) => { finish = () => resolve({ data: { url: "https://accounts.google.com", redirect: true }, error: null }); }));
    await render();
    await act(async () => { button("Connect Google").click(); button("Connect Google").click(); });
    expect(authClient.linkSocial).toHaveBeenCalledTimes(1);
    expect(authClient.linkSocial).toHaveBeenCalledWith({ provider: "google", callbackURL: "/account?next=%2Fcanvas%2Fsaved%3Fzoom%3D2", errorCallbackURL: "/account?next=%2Fcanvas%2Fsaved%3Fzoom%3D2" });
    expect(document.querySelector('input[name="password"]')).toBeNull();
    await act(async () => { finish?.(); });
  });

  it("shows matching-email guidance on OAuth error and allows retries after a network failure", async () => {
    vi.mocked(authClient.linkSocial).mockRejectedValueOnce(new Error("Offline"));
    await render("email_doesn't_match");
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("same email");
    await act(async () => { button("Connect Google").click(); });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("Check your connection");
    expect(button("Connect Google").disabled).toBe(false);
  });

  it("unlocks account linking after Back restores a cached page", async () => {
    vi.mocked(authClient.linkSocial).mockResolvedValue({ data: { url: "https://accounts.google.com", redirect: true }, error: null });
    await render();
    await act(async () => { button("Connect Google").click(); });
    expect(button("Connect Google").disabled).toBe(true);
    await act(async () => { window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })); });
    expect(button("Connect Google").disabled).toBe(false);
    await act(async () => { button("Connect Google").click(); });
    expect(authClient.linkSocial).toHaveBeenCalledTimes(2);
  });

  it("checks confirmation before adding a password for the same Google user", async () => {
    state.methods = { email: "writer@example.com", hasGoogle: true, hasPassword: false };
    state.addPassword.mockResolvedValue({ status: true });
    await render();
    const password = document.querySelector('[name="password"]');
    const confirmation = document.querySelector('[name="confirmPassword"]');
    const form = document.querySelector("form");
    if (!(password instanceof HTMLInputElement) || !(confirmation instanceof HTMLInputElement) || !form) throw new Error("Missing password form");
    password.value = "Added-password-123";
    confirmation.value = "Different-password-123";
    await act(async () => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(state.addPassword).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe("Passwords do not match.");
    confirmation.value = password.value;
    await act(async () => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(state.addPassword).toHaveBeenCalledWith({ newPassword: "Added-password-123" });
    expect(document.querySelector('[role="status"]')?.textContent).toContain("Password added");
  });

  it("reauthenticates with Google directly instead of opening an already-authenticated login page", async () => {
    state.methods = { email: "writer@example.com", hasGoogle: true, hasPassword: false };
    vi.mocked(authClient.signIn.social).mockResolvedValue({ data: { url: "https://accounts.google.com", redirect: true }, error: null });
    await render();
    await act(async () => { button("Sign in with Google again").click(); });
    expect(authClient.signIn.social).toHaveBeenCalledWith({ provider: "google", callbackURL: "/account?next=%2Fcanvas%2Fsaved%3Fzoom%3D2", errorCallbackURL: "/account?next=%2Fcanvas%2Fsaved%3Fzoom%3D2" });
  });
});

// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "../components/Header";
import { api } from "../convex/_generated/api";
import { signOut } from "../lib/auth-client";
import { replaceAuthLocation } from "../lib/auth-redirects";

const state = vi.hoisted(() => ({
  auth: { isLoading: false, isAuthenticated: true },
  user: { name: "Writer", email: "writer@example.com", banned: false, role: "user" },
  missing: false,
  error: vi.fn(),
}));
vi.mock("@convex-dev/better-auth/nextjs/client", () => ({ usePreloadedAuthQuery: () => state.missing ? undefined : state.user }));
vi.mock("convex/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("convex/react")>(), useConvexAuth: () => state.auth,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../lib/auth-client", () => ({ signOut: vi.fn() }));
vi.mock("../lib/auth-redirects", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/auth-redirects")>(), replaceAuthLocation: vi.fn(),
}));
vi.mock("../components/ui/toast-notification", () => ({ useToast: () => ({ error: state.error }) }));
vi.mock("../components/ThemeToggle", () => ({ ThemeToggle: () => null }));
vi.mock("../components/MobileNav", () => ({ usePWAInstall: () => ({ isInstallable: false, install: vi.fn() }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;

async function render() {
  if (!root) {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  }
  await act(async () => {
    root?.render(<StrictMode><Header preloadedCurrentUser={{ __type: api.auth.getCurrentUser, _name: "auth:getCurrentUser", _argsJSON: "{}", _valueJSON: "null" }} /></StrictMode>);
  });
}

async function clickSignOut() {
  const trigger = Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Writer"));
  if (!trigger) throw new Error("Missing account menu");
  await act(async () => { trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
  const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find((element) => element.textContent?.includes("Sign out"));
  if (!(item instanceof HTMLElement)) throw new Error("Missing sign-out item");
  await act(async () => { item.click(); });
}

beforeEach(() => {
  state.auth = { isLoading: false, isAuthenticated: true };
  state.user.banned = false;
  state.missing = false;
  window.history.replaceState({}, "", "/canvas/saved?zoom=2#idea");
});
afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("dashboard auth navigation", () => {
  it("waits for Convex auth to settle before redirecting", async () => {
    state.auth = { isLoading: true, isAuthenticated: false };
    state.missing = true;
    await render();
    expect(replaceAuthLocation).not.toHaveBeenCalled();
    state.auth.isLoading = false;
    await render();
    expect(replaceAuthLocation).toHaveBeenCalledTimes(1);
    expect(replaceAuthLocation).toHaveBeenCalledWith("/login?next=%2Fcanvas%2Fsaved%3Fzoom%3D2%23idea&reason=expired");
  });

  it("redirects once when the settled query is undefined after expiry", async () => {
    state.auth.isAuthenticated = false;
    state.missing = true;
    await render();
    expect(replaceAuthLocation).toHaveBeenCalledTimes(1);
  });

  it("lets manual sign-out finish at home without an expiry redirect racing it", async () => {
    let finish: (() => void) | undefined;
    vi.mocked(signOut).mockImplementation(() => new Promise((resolve) => { finish = () => resolve({ data: { success: true }, error: null }); }));
    await render();
    await clickSignOut();
    state.auth.isAuthenticated = false;
    state.missing = true;
    await render();
    expect(replaceAuthLocation).not.toHaveBeenCalled();
    await act(async () => { finish?.(); });
    expect(replaceAuthLocation).toHaveBeenCalledExactlyOnceWith("/");
  });

  it("reports sign-out failures and allows a retry", async () => {
    vi.mocked(signOut).mockRejectedValueOnce(new Error("Offline"));
    await render();
    await clickSignOut();
    expect(state.error).toHaveBeenCalledWith("Could not sign out", "Offline");
    expect(replaceAuthLocation).not.toHaveBeenCalled();
    vi.mocked(signOut).mockResolvedValue({ data: { success: true }, error: null });
    await clickSignOut();
    expect(replaceAuthLocation).toHaveBeenCalledExactlyOnceWith("/");
  });
});

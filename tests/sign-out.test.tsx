// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Preloaded } from "convex/react";
import { DashboardShell } from "@/components/DashboardShell";
import { api } from "@/convex/_generated/api";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  replace: vi.fn(),
  error: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/notes/123",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@convex-dev/better-auth/nextjs/client", () => ({
  usePreloadedAuthQuery: () => ({ name: "User", email: "user@example.com" }),
}));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
}));
vi.mock("@/lib/auth-client", () => ({ signOut: mocks.signOut }));
vi.mock("@/lib/auth-redirects", () => ({
  getAuthHref: () => "/login",
  replaceAuthLocation: mocks.replace,
}));
vi.mock("@/components/ui/toast-notification", () => ({ useToast: () => ({ error: mocks.error }) }));
vi.mock("@/providers/workspace-navigation", () => ({ useWorkspaceNavigation: () => ({}) }));
vi.mock("@/lib/use-keyboard-platform", () => ({ useKeyboardPlatform: () => "other", modifierLabel: () => "Ctrl" }));
vi.mock("@/components/MobileNav", () => ({ usePWAInstall: () => ({ isInstallable: false }) }));
vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/components/KeyboardShortcuts", () => ({ ShortcutHints: () => null }));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => null,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => <div onClick={onClick}>{children}</div>,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("sign out", () => {
  it("hides changing workspace content until navigation and keeps it mounted if sign-out fails", async () => {
    let finishSignOut!: (value: { error: { message: string } } | { error: null }) => void;
    mocks.signOut.mockImplementation(() => new Promise((resolve) => { finishSignOut = resolve; }));
    const preloaded = {} as Preloaded<typeof api.auth.getCurrentUser>;

    await act(async () => root.render(<DashboardShell preloadedCurrentUser={preloaded}><input defaultValue="Draft" /></DashboardShell>));
    const input = container.querySelector("input")!;
    const signOut = [...container.querySelectorAll("div")].find((element) => element.textContent === "Sign out")!;
    await act(async () => signOut.click());

    expect(container.querySelector("main")?.style.display).toBe("none");
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Signing out");

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => finishSignOut({ error: { message: "Offline" } }));
    expect(container.querySelector("main")?.style.display).toBe("");
    expect(container.querySelector("input")).toBe(input);
    expect(mocks.error).toHaveBeenCalledWith("Could not sign out", "Offline");
    expect(mocks.replace).not.toHaveBeenCalled();
    consoleError.mockRestore();

    await act(async () => signOut.click());
    await act(async () => finishSignOut({ error: null }));
    expect(container.querySelector("main")?.style.display).toBe("none");
    expect(mocks.replace).toHaveBeenCalledWith("/");
  });
});

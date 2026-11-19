// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminPage from "@/app/(dashboard)/admin/page";
import { ROOT_ADMIN_EMAIL, type AdminUser } from "@/lib/admin";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  mutate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: (reference: Parameters<typeof getFunctionName>[0], args: unknown) =>
    mocks.query(getFunctionName(reference), args),
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
    (args: unknown) => mocks.mutate(getFunctionName(reference), args),
}));
vi.mock("@/components/ui/toast-notification", () => ({
  useToast: () => ({ success: mocks.success, error: mocks.error, info: vi.fn() }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
let users: AdminUser[] | undefined;
let currentUser: { _id: string; role: string; banned: boolean } | null;

function account(id: string, name: string, day: number, fields: Partial<AdminUser> = {}): AdminUser {
  return {
    _id: id, id, name, email: `${id}@example.com`, role: "user", banned: false,
    banReason: null, banExpires: null, image: null,
    createdAt: Date.UTC(2026, 10, day), ...fields,
  };
}

function button(label: string, parent: ParentNode = document) {
  const found = [...parent.querySelectorAll("button")].find((item) => item.textContent?.trim() === label);
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}

function details() {
  const pane = container.querySelector<HTMLElement>('[aria-label="Account details"]');
  if (!pane) throw new Error("Missing account details pane");
  return pane;
}

async function selectAccount(name: string) {
  const trigger = container.querySelector<HTMLButtonElement>(`button[aria-label="View account for ${name}"]`);
  if (!trigger) throw new Error(`Missing account: ${name}`);
  await act(async () => trigger.click());
}

async function fill(selector: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`Missing input: ${selector}`);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function dropdown(label: string) {
  const trigger = document.querySelector<HTMLButtonElement>(`button[aria-label^="${label}: "]`);
  if (!trigger) throw new Error(`Missing dropdown: ${label}`);
  return trigger;
}

async function choose(label: string, optionLabel: string) {
  const trigger = dropdown(label);
  await act(async () => {
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  const choice = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')]
    .find((item) => item.textContent === optionLabel);
  if (!choice) throw new Error(`Missing dropdown option: ${optionLabel}`);
  await act(async () => {
    choice.focus();
    choice.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
}

async function render() {
  await act(async () => root.render(<AdminPage />));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mutate.mockResolvedValue({ success: true });
  currentUser = { _id: "self", role: "admin", banned: false };
  users = [
    account("maya", "Maya Chen", 18),
    account("hana", "Hana Ali", 16, { role: "admin" }),
    account("alex", "Alex Morgan", 14, { banned: true, banReason: "Spam", banExpires: Date.UTC(2026, 11, 1) }),
    account("root", "Primary Admin", 12, { role: "admin", email: ROOT_ADMIN_EMAIL }),
    account("self", "Current Admin", 10, { role: "admin" }),
  ];
  mocks.query.mockImplementation((name: string, args: unknown) => {
    if (args === "skip") return undefined;
    if (name === "auth:getCurrentUser") return currentUser;
    if (name === "admin:listUsers") return users;
    if (name === "admin:getDeploymentStats") return { notesCount: 2840, canvasesCount: 186, boardsCount: 42, tagsCount: 96 };
    throw new Error(`Unexpected query: ${name}`);
  });
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

it("selects accounts and follows live changes and deletions without keeping a stale record", async () => {
  await render();
  expect(details().textContent).toContain("Maya Chen");
  await selectAccount("Hana Ali");
  expect(dropdown("Account role").textContent).toBe("Admin");
  users = users?.map((user) => user.id === "hana" ? { ...user, role: "user", banned: true, banReason: "Review required" } : user);
  await render();
  expect(dropdown("Account role").textContent).toBe("User");
  expect(details().textContent).toContain("Review required");
  users = users?.filter((user) => user.id !== "hana");
  await render();
  expect(details().textContent).toContain("Maya Chen");
  expect(details().textContent).not.toContain("Hana Ali");
});

it("searches, filters active admins consistently, and clears the pane when nothing matches", async () => {
  await render();
  await act(async () => button("Active").click());
  expect(container.querySelectorAll("tbody tr")).toHaveLength(4);
  expect(container.querySelector("tbody")?.textContent).toContain("Hana Ali");
  expect(container.textContent).toContain("Showing 4 of 5 accounts");
  await fill('input[aria-label="Search users by name or email"]', "  HANA@EXAMPLE.COM  ");
  expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(details().textContent).toContain("Hana Ali");
  await fill('input[aria-label="Search users by name or email"]', "nobody");
  expect(container.textContent).toContain("No matching accounts");
  expect(details().querySelector('[aria-label^="Account role:"]')).toBeNull();
  await act(async () => button("Reset filters").click());
  expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
  await act(async () => button("Suspended").click());
  expect(details().textContent).toContain("Alex Morgan");
  expect(details().textContent).toContain("Spam");
  expect(details().textContent).toContain("Dec 1, 2026");
});

it("sorts the list without losing a selected account", async () => {
  await render();
  await selectAccount("Hana Ali");
  await choose("Sort users", "Oldest first");
  expect(container.querySelector("tbody tr")?.textContent).toContain("Current Admin");
  expect(details().textContent).toContain("Hana Ali");
  await choose("Sort users", "Name (A–Z)");
  expect(container.querySelector("tbody tr")?.textContent).toContain("Alex Morgan");
});

it("confirms a role change before sending the mutation and leaves a cancelled role unchanged", async () => {
  await render();
  await choose("Account role", "Admin");
  expect(mocks.mutate).not.toHaveBeenCalled();
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Maya Chen");
  await act(async () => button("Cancel").click());
  expect(dropdown("Account role").textContent).toBe("User");
  await choose("Account role", "Admin");
  await act(async () => button("Confirm Role Change").click());
  expect(mocks.mutate).toHaveBeenCalledWith("admin:setRole", { userId: "maya", role: "admin" });
});

it("keeps self and primary administrator controls protected in the pane and list", async () => {
  await render();
  for (const name of ["Current Admin", "Primary Admin"]) {
    await selectAccount(name);
    expect(dropdown("Account role").disabled).toBe(true);
    await act(async () => dropdown("Account role").click());
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(button("Reset password", details()).disabled).toBe(true);
    expect(details().textContent).not.toContain("Delete account");
    expect(details().textContent).not.toContain("Suspend account");
    expect(container.querySelector(`button[aria-label="Actions for ${name}"]`)).toBeNull();
  }
  expect(mocks.mutate).not.toHaveBeenCalled();
});

it("chooses a new account's role inside the dialog without submitting the form early", async () => {
  await render();
  await act(async () => button("Create user").click());
  await fill("#create-name", "New admin");
  await fill("#create-email", "new@example.com");
  await fill("#create-password", "secure-test-password");
  await choose("New user role", "Admin (Full Management Privileges)");
  expect(mocks.mutate).not.toHaveBeenCalled();
  expect(dropdown("New user role").textContent).toBe("Admin (Full Management Privileges)");
  await act(async () => button("Create account").click());
  expect(mocks.mutate).toHaveBeenCalledWith("admin:createUser", {
    name: "New admin", email: "new@example.com", password: "secure-test-password", role: "admin",
  });
});

it("suspends the selected account with a reason and duration after confirmation", async () => {
  await render();
  await act(async () => button("Suspend account", details()).click());
  expect(mocks.mutate).not.toHaveBeenCalled();
  await fill("#custom-ban-reason", "Spam");
  await choose("Suspension duration", "Temporary — 7 Days");
  const now = Date.UTC(2026, 10, 19);
  vi.spyOn(Date, "now").mockReturnValue(now);
  await act(async () => button("Confirm Suspension").click());
  expect(mocks.mutate).toHaveBeenCalledWith("admin:setBanned", { userId: "maya", banned: true, banReason: "Spam", banExpires: now + 7 * 86400000 });
  await selectAccount("Alex Morgan");
  await act(async () => button("Reactivate account", details()).click());
  expect(mocks.mutate).toHaveBeenCalledWith("admin:setBanned", { userId: "alex", banned: false });
});

it("requires confirmation before deleting the selected account", async () => {
  await render();
  await act(async () => button("Delete account", details()).click());
  expect(mocks.mutate).not.toHaveBeenCalled();
  expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("maya@example.com");
  await act(async () => button("Cancel").click());
  expect(mocks.mutate).not.toHaveBeenCalled();
  await act(async () => button("Delete account", details()).click());
  await act(async () => button("Permanently Delete").click());
  expect(mocks.mutate).toHaveBeenCalledWith("admin:deleteUser", { userId: "maya" });
});

it("opens row actions with the keyboard and resets that account rather than the selected account", async () => {
  await render();
  await selectAccount("Hana Ali");
  const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="Actions for Maya Chen"]');
  if (!trigger) throw new Error("Missing row actions");
  await act(async () => {
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  const reset = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) => item.textContent === "Reset password");
  if (!reset) throw new Error("Missing reset password action");
  await act(async () => reset.click());
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("maya@example.com");
  await fill("#new-pwd-input", "secure-test-password");
  await act(async () => button("Update Password").click());
  expect(mocks.mutate).toHaveBeenCalledWith("admin:resetPassword", { userId: "maya", newPassword: "secure-test-password" });
});

it("distinguishes loading accounts from an empty deployment", async () => {
  users = undefined;
  await render();
  expect(container.querySelector('[role="status"][aria-label="Loading accounts"]')).not.toBeNull();
  expect(container.textContent).not.toContain("No accounts yet");
  users = [];
  await render();
  expect(container.textContent).toContain("No accounts yet");
  expect(details().querySelector('[aria-label^="Account role:"]')).toBeNull();
});

it.each([null, { _id: "self", role: "user", banned: false }, { _id: "self", role: "admin", banned: true }])("blocks access for an unauthorized account: %j", async (identity) => {
  currentUser = identity;
  await render();
  expect(container.textContent).toContain("Access Denied");
  expect(container.querySelector("table")).toBeNull();
  expect(mocks.query).toHaveBeenCalledWith("admin:listUsers", "skip");
  expect(mocks.query).toHaveBeenCalledWith("admin:getDeploymentStats", "skip");
});

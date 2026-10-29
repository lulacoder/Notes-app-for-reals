const APP_PATH = /^\/(notes|canvas|kanban|trash|admin)(\/|$)/;

// Only return to app pages. Never accept an external URL or another auth page.
export function getReturnPath(value: string | string[] | null | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return "/notes";
  }

  const url = new URL(value, "https://noteworthy.invalid");
  if (url.origin !== "https://noteworthy.invalid" || !APP_PATH.test(url.pathname)) {
    return "/notes";
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getAuthHref(
  mode: "login" | "register",
  returnTo?: string | string[] | null,
  reason?: "expired" | "banned",
): string {
  const params = new URLSearchParams({ next: getReturnPath(returnTo) });
  if (reason === "banned") params.set("banned", "true");
  if (reason === "expired") params.set("reason", "expired");
  return `/${mode}?${params}`;
}

// Auth boundaries need a fresh request so private client route caches are dropped.
export function replaceAuthLocation(path: string) {
  window.location.replace(path);
}

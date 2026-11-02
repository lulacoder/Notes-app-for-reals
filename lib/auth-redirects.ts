const APP_PATH = /^\/(notes|canvas|kanban|trash|admin|account)(\/|$)/;

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

export function getGoogleErrorMessage(error: string | string[] | undefined): string {
  if (!error) return "";
  if (error === "account_not_linked") return "Sign in with your password once to connect Google to your existing account.";
  if (error === "access_denied") return "Google sign-in was canceled. Try again or use your password.";
  if (error === "email_doesn't_match") return "Choose the Google account with the same email as your Noteworthy account.";
  if (error === "account_already_linked_to_different_user") return "This Google account is already connected to another account.";
  return "Could not sign in with Google. Try again or use your password.";
}

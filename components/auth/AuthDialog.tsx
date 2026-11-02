"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Eye, EyeOff, Loader2, X } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import {
  getAuthHref,
  getGoogleErrorMessage,
  getReturnPath,
  replaceAuthLocation,
} from "@/lib/auth-redirects";
import { NavigationLink } from "@/components/marketing/NavigationLink";
import { AuthBrandPanel, AuthHeading } from "./AuthDialogDesign";
import styles from "./auth-dialog.module.css";

interface AuthDialogProps {
  mode: "login" | "register";
  returnTo: string;
  notice?: "banned" | "expired";
  oauthError?: string;
}

export function AuthDialog({ mode, returnTo, notice, oauthError }: AuthDialogProps) {
  const router = useRouter();
  const formId = useId();
  const isRegister = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(getGoogleErrorMessage(oauthError));
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [closing, startTransition] = useTransition();
  const busy = pending !== null || closing;
  const submitting = useRef(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function recoverFromProvider(event: PageTransitionEvent) {
      if (!event.persisted) return;
      submitting.current = false;
      setPending(null);
    }
    window.addEventListener("pageshow", recoverFromProvider);
    return () => window.removeEventListener("pageshow", recoverFromProvider);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || closing) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();
    if (isRegister && !name) {
      setError("Please enter your name.");
      return;
    }
    submitting.current = true;
    setPending("email");
    setError("");
    try {
      const result = isRegister
        ? await signUp.email({ name, email, password })
        : await signIn.email({ email, password });
      if (result.error) {
        setError(
          result.error.message ||
            (isRegister
              ? "Could not create your account. Please try again."
              : "Could not sign in. Please try again."),
        );
      } else {
        // Start with fresh server data and remove the auth page from browser history.
        replaceAuthLocation(oauthError === "account_not_linked"
          ? `/account?connect=google&next=${encodeURIComponent(getReturnPath(returnTo))}`
          : getReturnPath(returnTo));
        return;
      }
    } catch {
      setError("Could not connect. Check your connection and try again.");
    }
    submitting.current = false;
    setPending(null);
  }

  async function handleGoogleSignIn() {
    if (submitting.current || closing) return;
    submitting.current = true;
    setPending("google");
    setError("");
    try {
      const result = await signIn.social({
        provider: "google",
        callbackURL: getReturnPath(returnTo),
        errorCallbackURL: getAuthHref("login", returnTo),
      });
      if (!result.error && result.data?.url) return;
      setError("Could not start Google sign-in. Try again or use your password.");
    } catch {
      setError("Could not connect. Check your connection and try again.");
    }
    submitting.current = false;
    setPending(null);
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !submitting.current && !closing)
          startTransition(() => router.replace("/"));
      }}
    >
      <Dialog.Overlay className={styles.authOverlay} />
      <Dialog.Content
        className={styles.authContent}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          firstField.current?.focus();
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <AuthBrandPanel />
        <div className={styles.formPanel}>
          <Dialog.Close
            className={styles.authClose}
            disabled={busy}
            aria-label="Close and return home"
          >
            {closing ? (
              <Loader2
                size={20}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <X size={20} />
            )}
          </Dialog.Close>
          <AuthHeading mode={mode} />
          {closing && (
            <p className={styles.authNotice} role="status">
              Returning home...
            </p>
          )}
          {notice === "banned" && (
            <p className={styles.authNotice} role="status">
              Your account has been suspended. Contact your administrator for
              help.
            </p>
          )}
          {notice === "expired" && (
            <p className={styles.authNotice} role="status">
              Your session ended. Sign in to pick up where you left off.
            </p>
          )}
          <form onSubmit={handleSubmit} aria-busy={busy}>
            {error && (
              <p className={styles.authError} role="alert">
                {error}
              </p>
            )}
            <fieldset disabled={busy} className={styles.authFields}>
              <button type="button" className={styles.googleButton} onClick={handleGoogleSignIn}>
                {pending === "google" ? <Loader2 size={18} className="animate-spin" /> : <GoogleMark />}
                {pending === "google" ? "Connecting to Google..." : "Continue with Google"}
              </button>
              <div className={styles.authDivider}><span>or use email</span></div>
              {isRegister && (
                <div className={styles.authField}>
                  <label htmlFor={`${formId}-name`}>Name</label>
                  <input
                    ref={isRegister ? firstField : undefined}
                    id={`${formId}-name`}
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    required
                    maxLength={100}
                  />
                </div>
              )}
              <div className={styles.authField}>
                <label htmlFor={`${formId}-email`}>Email</label>
                <input
                  ref={isRegister ? undefined : firstField}
                  id={`${formId}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className={styles.authField}>
                <label htmlFor={`${formId}-password`}>Password</label>
                <div className={styles.passwordInput}>
                  <input
                    id={`${formId}-password`}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    placeholder={
                      isRegister ? "Create a password" : "Your password"
                    }
                    required
                    minLength={isRegister ? 8 : undefined}
                    maxLength={128}
                    aria-describedby={
                      isRegister ? `${formId}-password-hint` : undefined
                    }
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {isRegister && (
                  <p
                    id={`${formId}-password-hint`}
                    className={styles.passwordHint}
                  >
                    At least 8 characters
                  </p>
                )}
              </div>
              <button type="submit" className={styles.primaryButton}>
                {pending === "email" ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    {isRegister ? "Creating account..." : "Signing in..."}
                  </>
                ) : (
                  <>
                    {isRegister ? "Create account" : "Sign in"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </fieldset>
          </form>
          <p className={styles.authFooter}>
            {isRegister ? "Already have an account?" : "New to Noteworthy?"}{" "}
            <NavigationLink
              href={getAuthHref(isRegister ? "login" : "register", returnTo)}
              aria-disabled={busy}
              onClick={(event) => {
                if (submitting.current || closing) event.preventDefault();
              }}
            >
              {isRegister ? "Sign in" : "Create an account"}
            </NavigationLink>
          </p>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.13H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.91A6 6 0 0 1 6.1 12c0-.66.11-1.3.31-1.91V7.5H3.07A10 10 0 0 0 2 12c0 1.61.38 3.14 1.07 4.5l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5L18.7 4.6A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.5l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>;
}

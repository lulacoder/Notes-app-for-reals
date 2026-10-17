"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Eye, EyeOff, Loader2, X } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { getAuthHref, getReturnPath, replaceAuthLocation } from "@/lib/auth-redirects";
import { Brand } from "@/components/marketing/Brand";
import styles from "@/components/marketing/paper.module.css";

interface AuthDialogProps {
  mode: "login" | "register";
  returnTo: string;
  notice?: "banned" | "expired";
}

export function AuthDialog({ mode, returnTo, notice }: AuthDialogProps) {
  const router = useRouter();
  const formId = useId();
  const isRegister = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const firstField = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();
    if (isRegister && !name) {
      setError("Please enter your name.");
      return;
    }
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      const result = isRegister
        ? await signUp.email({ name, email, password })
        : await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || (isRegister ? "Could not create your account. Please try again." : "Could not sign in. Please try again."));
      } else {
        // Start with fresh server data and remove the auth page from browser history.
        replaceAuthLocation(getReturnPath(returnTo));
        return;
      }
    } catch {
      setError("Could not connect. Check your connection and try again.");
    }
    submitting.current = false;
    setPending(false);
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !submitting.current) router.replace("/"); }}>
      <Dialog.Overlay className={styles.authOverlay} />
      <Dialog.Content className={`${styles.paper} ${styles.authContent}`} onOpenAutoFocus={(event) => { event.preventDefault(); firstField.current?.focus(); }} onCloseAutoFocus={(event) => event.preventDefault()}>
        <div className={styles.authBrand}><Brand /></div>
        <Dialog.Close className={styles.authClose} disabled={pending} aria-label="Close and return home"><X size={20} /></Dialog.Close>
        <Dialog.Title className={styles.authTitle}>{isRegister ? "Create an account" : "Welcome back"}</Dialog.Title>
        <Dialog.Description className={styles.authDescription}>{isRegister ? "A place for your notes and ideas." : "Sign in to access your notes."}</Dialog.Description>
        {notice === "banned" && <p className={styles.authNotice} role="status">Your account has been suspended. Contact your administrator for help.</p>}
        {notice === "expired" && <p className={styles.authNotice} role="status">Your session ended. Sign in to pick up where you left off.</p>}
        <form onSubmit={handleSubmit} aria-busy={pending}>
          {error && <p className={styles.authError} role="alert">{error}</p>}
          <fieldset disabled={pending} className={styles.authFields}>
            {isRegister && <div className={styles.authField}>
              <label htmlFor={`${formId}-name`}>Name</label>
              <input ref={isRegister ? firstField : undefined} id={`${formId}-name`} name="name" type="text" autoComplete="name" placeholder="Your name" required maxLength={100} />
            </div>}
            <div className={styles.authField}>
              <label htmlFor={`${formId}-email`}>Email</label>
              <input ref={isRegister ? undefined : firstField} id={`${formId}-email`} name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" required />
            </div>
            <div className={styles.authField}>
              <label htmlFor={`${formId}-password`}>Password</label>
              <div className={styles.passwordInput}>
                <input id={`${formId}-password`} name="password" type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} placeholder="Your password" required minLength={isRegister ? 8 : undefined} maxLength={128} aria-describedby={isRegister ? `${formId}-password-hint` : undefined} />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              {isRegister && <p id={`${formId}-password-hint`} className={styles.passwordHint}>At least 8 characters</p>}
            </div>
            <button type="submit" className={styles.primaryButton}>{pending ? <><Loader2 size={17} className="animate-spin" />{isRegister ? "Creating account..." : "Signing in..."}</> : <>{isRegister ? "Create account" : "Sign in"}<ArrowRight size={16} /></>}</button>
          </fieldset>
        </form>
        <p className={styles.authFooter}>{isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <Link href={getAuthHref(isRegister ? "login" : "register", returnTo)} aria-disabled={pending} onClick={(event) => { if (submitting.current) event.preventDefault(); }}>{isRegister ? "Sign in" : "Sign up"}</Link>
        </p>
      </Dialog.Content>
    </Dialog.Root>
  );
}

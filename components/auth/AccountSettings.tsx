"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Check, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { getGoogleErrorMessage, getReturnPath } from "@/lib/auth-redirects";
import { Button } from "@/components/ui/button";

interface AccountSettingsProps {
  returnTo: string;
  connectGoogle: boolean;
  oauthError?: string;
}

export function AccountSettings({ returnTo, connectGoogle, oauthError }: AccountSettingsProps) {
  const methods = useQuery(api.auth.getSignInMethods);
  const addPassword = useMutation(api.auth.addPassword);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(getGoogleErrorMessage(oauthError));
  const [saved, setSaved] = useState(false);
  const submitting = useRef(false);
  const destination = getReturnPath(returnTo);

  useEffect(() => {
    function recoverFromProvider(event: PageTransitionEvent) {
      if (!event.persisted) return;
      submitting.current = false;
      setPending(false);
    }
    window.addEventListener("pageshow", recoverFromProvider);
    return () => window.removeEventListener("pageshow", recoverFromProvider);
  }, []);

  async function linkGoogle(reauthenticate = false) {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      const callbackURL = `/account?next=${encodeURIComponent(destination)}`;
      const result = reauthenticate
        ? await authClient.signIn.social({ provider: "google", callbackURL, errorCallbackURL: callbackURL })
        : await authClient.linkSocial({ provider: "google", callbackURL, errorCallbackURL: callbackURL });
      if (!result.error && result.data?.url) return;
      setError("Could not connect Google. Try again.");
    } catch {
      setError("Could not connect. Check your connection and try again.");
    }
    submitting.current = false;
    setPending(false);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("password") ?? "");
    if (newPassword !== data.get("confirmPassword")) {
      setError("Passwords do not match.");
      return;
    }
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      await addPassword({ newPassword });
      setSaved(true);
      form.reset();
    } catch {
      setError("Could not add a password. Sign in with Google again, then retry with a password between 8 and 128 characters.");
    }
    submitting.current = false;
    setPending(false);
  }

  return <div className="w-full overflow-y-auto px-5 py-10 sm:px-10">
    <div className="mx-auto max-w-xl space-y-8">
      <div><p className="mb-2 text-sm text-muted-foreground">Your workspace</p><h1 className="text-3xl font-semibold tracking-tight">Account and sign-in</h1><p className="mt-3 text-sm text-muted-foreground">{methods?.email}</p></div>
      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {!methods ? <p role="status">Loading sign-in methods...</p> : <>
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-medium">Google</h2>
          {methods.hasGoogle ? <p className="mt-3 flex items-center gap-2 text-sm"><Check size={16} />Google is connected to this workspace.</p> : <>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{connectGoogle ? "Your password is confirmed. " : ""}Connect the Google account that uses {methods.email}. Your notes stay in this account.</p>
            <Button className="mt-5" variant="outline" disabled={pending} onClick={() => linkGoogle()}>{pending && <Loader2 size={16} className="animate-spin" />}Connect Google</Button>
          </>}
        </section>
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-medium">Password</h2>
          {saved || methods.hasPassword ? <p role="status" className="mt-3 text-sm">{saved ? "Password added. You can now sign in with Google or email and password." : "Email and password sign-in is enabled."}</p> : <>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Add a password to sign in with {methods.email} as well as Google.</p>
            <form onSubmit={savePassword} className="mt-5">
              <fieldset disabled={pending} className="space-y-4">
                <label className="block text-sm">New password<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className="mt-2 block w-full rounded-md border bg-background px-3 py-2" /></label>
                <label className="block text-sm">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className="mt-2 block w-full rounded-md border bg-background px-3 py-2" /></label>
                <p className="text-xs text-muted-foreground">At least 8 characters. Requires a recent Google sign-in.</p>
                <Button type="submit">{pending ? "Saving..." : "Add password"}</Button>
              </fieldset>
            </form>
            <button type="button" disabled={pending} className="mt-4 text-sm underline underline-offset-4" onClick={() => linkGoogle(true)}>Sign in with Google again</button>
          </>}
        </section>
      </>}
      <Link className="inline-block text-sm font-medium underline underline-offset-4" href={destination}>Back to workspace</Link>
    </div>
  </div>;
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import { Brand } from "@/components/marketing/Brand";
import styles from "@/components/marketing/paper.module.css";

export function AuthDialogLoading({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [closing, startTransition] = useTransition();

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !closing) startTransition(() => router.replace("/")); }}>
      <Dialog.Overlay className={styles.authOverlay} />
      <Dialog.Content className={`${styles.paper} ${styles.authContent}`} onCloseAutoFocus={(event) => event.preventDefault()}>
        <div className={styles.authBrand}><Brand /></div>
        <Dialog.Close className={styles.authClose} disabled={closing} aria-label="Close and return home"><X size={20} /></Dialog.Close>
        <Dialog.Title className={styles.authTitle}>{mode === "register" ? "Create an account" : "Welcome back"}</Dialog.Title>
        <Dialog.Description className={styles.authDescription}>{mode === "register" ? "A place for your notes and ideas." : "Sign in to access your notes."}</Dialog.Description>
        <div className={styles.authLoading} role="status">
          <Loader2 size={24} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span>{closing ? "Returning home..." : mode === "register" ? "Loading sign up..." : "Loading sign in..."}</span>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import { AuthBrandPanel, AuthHeading } from "./AuthDialogDesign";
import styles from "./auth-dialog.module.css";

export function AuthDialogLoading({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [closing, startTransition] = useTransition();

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !closing) startTransition(() => router.replace("/"));
      }}
    >
      <Dialog.Overlay className={styles.authOverlay} />
      <Dialog.Content
        className={styles.authContent}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <AuthBrandPanel />
        <div className={styles.formPanel}>
          <Dialog.Close
            className={styles.authClose}
            disabled={closing}
            aria-label="Close and return home"
          >
            <X size={20} />
          </Dialog.Close>
          <AuthHeading mode={mode} />
          <div className={styles.authLoading} role="status">
            <Loader2
              size={24}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span>
              {closing
                ? "Returning home..."
                : mode === "register"
                  ? "Loading sign up..."
                  : "Loading sign in..."}
            </span>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

import * as Dialog from "@radix-ui/react-dialog";
import { Check, ImageIcon } from "lucide-react";
import { Brand } from "@/components/marketing/Brand";
import styles from "./auth-dialog.module.css";

export function AuthBrandPanel() {
  return (
    <aside className={styles.visualPanel} aria-hidden="true">
      <Brand />
      <p className={styles.visualTitle}>
        Good things
        <br />
        start here.
      </p>
      <div className={styles.illustration}>
        <svg viewBox="0 0 280 220" fill="none" aria-hidden="true">
          <g
            stroke="#f23c64"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M70 65C110 100 152 90 195 70m-8-3 8 3-4 8M69 83C60 145 96 155 123 171m-1-8 1 8-8-1M205 90C219 139 188 162 165 173m8 1-8-1 3-8" />
          </g>
        </svg>
        <div className={`${styles.artNote} ${styles.pinkNote}`}>
          <i />
          <i />
          <i />
        </div>
        <div className={`${styles.artNote} ${styles.greenNote}`}>
          <ImageIcon strokeWidth={1.3} />
        </div>
        <div className={`${styles.artNote} ${styles.purpleNote}`}>
          {[1, 2, 3].map((line) => (
            <span key={line}>
              <Check size={12} />
              <i />
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function AuthHeading({ mode }: { mode: "login" | "register" }) {
  return (
    <>
      <div className={styles.mobileBrand}>
        <Brand />
      </div>
      <Dialog.Title className={styles.authTitle}>
        {mode === "register"
          ? "A little space for your ideas."
          : "Welcome back."}
      </Dialog.Title>
      <Dialog.Description className={styles.authDescription}>
        {mode === "register"
          ? "Make a home for your notes, plans, and possibilities."
          : "Pick up where your ideas left off."}
      </Dialog.Description>
    </>
  );
}

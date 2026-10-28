"use client";

import type { ComponentProps, ReactNode } from "react";
import Link, { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import styles from "./paper.module.css";

export function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}><NavigationLabel>{children}</NavigationLabel></Link>;
}

function NavigationLabel({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span className={styles.navigationLabel} aria-busy={pending}>
      <span className={styles.navigationText} data-pending={pending}>{children}</span>
      {pending && <span className={styles.navigationSpinner} role="status">
        <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        <span className="sr-only">Loading...</span>
      </span>}
    </span>
  );
}

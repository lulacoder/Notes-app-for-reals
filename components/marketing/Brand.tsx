import { cn } from "@/lib/utils";
import styles from "./paper.module.css";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={cn(styles.brand, compact && styles.brandCompact)}>
      <svg viewBox="0 0 36 40" fill="none" aria-hidden="true">
        <path d="M6 35 9 6l20 28 3-29" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m9 6 20 28" stroke="#e58590" strokeWidth="7" strokeLinecap="round" />
      </svg>
      <span>Noteworthy</span>
    </span>
  );
}

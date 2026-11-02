import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/marketing/Brand";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy policy | Noteworthy",
  description: "How Noteworthy handles account information and workspace content.",
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Noteworthy home"><Brand /></Link>
        <Link href="/" className={styles.back}><ArrowLeft size={15} /> Back to Noteworthy</Link>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Noteworthy / Your information</p>
          <h1>Privacy policy</h1>
          <p>How your account and the things you create are handled in Noteworthy.</p>
          <span>Last updated November 2, 2026</span>
        </div>
        <article className={styles.content}>
          <section><h2>Information we handle</h2><p>When you create an account, Noteworthy stores your name, email address, and account and session information. If you use a password, the authentication service stores a protected password rather than a plain-text password.</p><p>We also store the content you add, such as notes, canvases, boards, tags, uploaded images, and saved versions. The service may process technical information, such as IP address and browser information, to operate and secure sessions.</p></section>
          <section><h2>Signing in with Google</h2><p>If you choose Google sign-in, Google provides your account identifier, email address, name, and, if available, profile image. Noteworthy uses this information to identify you, create or connect your account, and sign you in. The authentication service may store Google authentication tokens to support the sign-in connection.</p><p>Noteworthy requests basic sign-in information. It does not request access to your Google Drive, Gmail, or other Google content as part of this sign-in.</p><p>Noteworthy&apos;s use and transfer of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including its Limited Use requirements.</p></section>
          <section><h2>How information is used and shared</h2><p>We use account and workspace information to provide the service, save and display your work, maintain sessions, and manage security and support. Noteworthy uses Convex for its backend, database, authentication data, and file storage, and Vercel to host the web application. Google handles Google sign-in when you choose it. These providers process information as needed to provide their services.</p><p>Administrators can manage accounts and handle support or security issues. Please avoid storing information you do not want processed by the service.</p></section>
          <section><h2>Cookies and local storage</h2><p>Noteworthy uses authentication cookies to keep you signed in. It also uses browser storage for some interface preferences and temporary canvas drafts. Your browser can clear this information, which may sign you out, reset preferences, or remove a draft.</p></section>
          <section><h2>Retention and your choices</h2><p>Your workspace information remains in the service until it is deleted. Some items may first move to trash or have saved versions; backups and service-provider records may remain after deletion. You can delete supported workspace items in the app. To request account deletion or ask about your information, contact us below.</p><p>You can manage Noteworthy&apos;s access to your Google account from your Google Account&apos;s third-party connections. Removing access can affect Google sign-in.</p></section>
          <section><h2>Contact</h2><p>For privacy questions or requests, email <a href="mailto:leultesfaye0755@gmail.com">leultesfaye0755@gmail.com</a>.</p></section>
          <section><h2>Changes to this policy</h2><p>We may update this page as the service changes. The date at the top shows when the policy was last updated.</p></section>
        </article>
      </main>
    </div>
  );
}

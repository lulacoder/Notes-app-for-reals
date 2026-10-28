import { ArrowRight, FileText, LayoutDashboard, Network } from "lucide-react";
import { Brand } from "./Brand";
import { NavigationLink } from "./NavigationLink";
import { WorkspacePreview } from "./WorkspacePreview";
import styles from "./paper.module.css";

export function LandingPage() {
  return (
    <div className={styles.paper}>
      <a href="#main" className={styles.skipLink}>Skip to content</a>
      <header className={styles.header}>
        <NavigationLink href="/" aria-label="Noteworthy home"><Brand /></NavigationLink>
        <nav aria-label="Features" className={styles.featureNav}>
          <a href="#notes">Notes</a><a href="#canvas">Canvas</a><a href="#boards">Boards</a>
        </nav>
        <nav aria-label="Account" className={styles.accountNav}>
          <NavigationLink href="/login" className={styles.secondaryButton}>Sign in</NavigationLink>
          <NavigationLink href="/register" className={styles.primaryButton}>Start writing <ArrowRight size={15} /></NavigationLink>
        </nav>
      </header>
      <main id="main" className={styles.main}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>A little space to think.</p>
            <h1 id="hero-title">Write it down.<br />Map it out.</h1>
            <p className={styles.intro}>Write notes, connect ideas on a canvas, and organize tasks on a board.</p>
            <div className={styles.heroActions}>
              <NavigationLink href="/register" className={styles.primaryButton}>Start writing <ArrowRight size={17} /></NavigationLink>
              <NavigationLink href="/login" className={styles.secondaryButton}>Sign in</NavigationLink>
            </div>
            <p className={styles.heroFootnote}>Your next idea starts with a blank page.</p>
          </div>
          <WorkspacePreview />
        </section>
        <section className={styles.features} aria-label="Your ideas, in a few different forms">
          <article id="notes"><span className={styles.featureIcon}><FileText /></span><div><h2>Write</h2><p>Rich text notes with checklists, links, and tags.</p></div></article>
          <article id="canvas"><span className={styles.featureIcon}><Network /></span><div><h2>Connect</h2><p>Link your ideas on a canvas with sticky notes and mind maps.</p></div></article>
          <article id="boards"><span className={styles.featureIcon}><LayoutDashboard /></span><div><h2>Organize</h2><p>Keep tasks in view with simple kanban boards.</p></div></article>
        </section>
      </main>
      <footer className={styles.footer}><span>Noteworthy</span><span>A place for your notes and ideas.</span></footer>
    </div>
  );
}

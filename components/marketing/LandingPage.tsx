import Image from "next/image";
import { ArrowRight, Check, Plus } from "lucide-react";
import { Brand } from "./Brand";
import { NavigationLink } from "./NavigationLink";
import { BoardPreview, CanvasPreview, NotesPreview } from "./ProductPreviews";
import { WorkflowDemo } from "./WorkflowDemo";
import styles from "./landing.module.css";

const useCases = [
  {
    title: "Study notes",
    text: "Keep track of what you're learning with notes, diagrams, and checklists.",
    image: "study",
    alt: "An open notebook and pencil on a wooden desk",
    href: "#notes",
  },
  {
    title: "Creative projects",
    text: "Gather ideas, map things out on a canvas, and turn them into a clear plan.",
    image: "studio",
    alt: "A sunlit creative studio with a chair and plants",
    href: "#canvas",
  },
  {
    title: "Everyday plans",
    text: "Organize your thoughts, tasks, and next steps, all in one place.",
    image: "planning",
    alt: "A weekly plan beside a coffee cup",
    href: "#boards",
  },
];
const questions = [
  {
    question: "What can I use Noteworthy for?",
    answer:
      "Noteworthy is a personal workspace for notes, visual thinking, and task boards. Use it for study notes, creative projects, everyday plans, or an idea you want to come back to.",
  },
  {
    question: "How do notes and canvases work together?",
    answer:
      "Write in a note when you need to focus on the details. Embed notes on a canvas, add sticky notes and shapes, and connect related ideas to see the bigger picture.",
  },
  {
    question: "How do I get started?",
    answer:
      "Create an account with your name, email, and password. Then write your first note, open a canvas, or make a task board. Start wherever your idea takes you.",
  },
];

export function LandingPage() {
  return (
    <div className={styles.landing}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <div className={styles.darkSection}>
        <header className={`${styles.container} ${styles.header}`}>
          <NavigationLink
            href="/"
            aria-label="Noteworthy home"
            className={styles.wordmark}
          >
            <Brand />
          </NavigationLink>
          <nav className={styles.featureNav} aria-label="Features">
            <a href="#notes">Notes</a>
            <a href="#canvas">Canvas</a>
            <a href="#boards">Boards</a>
          </nav>
          <nav className={styles.accountNav} aria-label="Account">
            <NavigationLink href="/login" className={styles.signIn}>
              Sign in
            </NavigationLink>
            <NavigationLink href="/register" className={styles.primaryButton}>
              Start writing <ArrowRight size={15} />
            </NavigationLink>
          </nav>
        </header>
        <section
          className={`${styles.container} ${styles.hero}`}
          aria-labelledby="hero-title"
        >
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>A little space to think.</p>
            <h1 id="hero-title">
              Make something
              <br />
              of your ideas.
            </h1>
            <p className={styles.heroIntro}>
              A personal workspace for notes, visual thinking, and the plans
              that come next.
            </p>
            <div className={styles.heroActions}>
              <NavigationLink href="/register" className={styles.primaryButton}>
                Create an account <ArrowRight size={16} />
              </NavigationLink>
              <a href="#workflow" className={styles.textLink}>
                Explore the workspace <ArrowRight size={16} />
              </a>
            </div>
            <p className={styles.heroFootnote}>
              <Check size={13} /> Your notes. Your canvas. Your next step.
            </p>
          </div>
          <div
            className={styles.heroPreview}
            role="img"
            aria-label="A visual project canvas with connected ideas, a note, and inspiration for a studio website"
          >
            <CanvasPreview sidebar />
          </div>
        </section>
      </div>
      <main id="main">
        <section
          id="workflow"
          className={`${styles.container} ${styles.workflowSection}`}
          aria-labelledby="workflow-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>
              From a quick thought to a clear plan
            </p>
            <h2 id="workflow-title">One idea. Room to grow.</h2>
            <p>
              Capture it in a note. See it on a canvas. Give it a next step.
            </p>
          </div>
          <WorkflowDemo />
        </section>
        <section
          id="notes"
          className={`${styles.container} ${styles.showcase}`}
          aria-labelledby="notes-title"
        >
          <div className={styles.showcaseCopy}>
            <p className={styles.eyebrow}>01 / Notes</p>
            <h2 id="notes-title">
              Get the
              <br />
              thought down.
            </h2>
            <p>
              Some ideas need a blank page. Write freely, bring a little order
              with checklists, and keep the useful details close.
            </p>
            <ul className={styles.featureList}>
              <li>
                <Check /> Rich text, links, and checklists
              </li>
              <li>
                <Check /> Tags to keep things organized
              </li>
              <li>
                <Check /> Space for the rough draft, too
              </li>
            </ul>
            <NavigationLink href="/register" className={styles.textLink}>
              Make your first note <ArrowRight size={16} />
            </NavigationLink>
          </div>
          <div
            className={styles.notesStage}
            role="img"
            aria-label="A studio website note with rich text, a checklist, an inspiration photo, and tags"
          >
            <NotesPreview />
          </div>
        </section>
        <section
          id="canvas"
          className={styles.darkSection}
          aria-labelledby="canvas-title"
        >
          <div
            className={`${styles.container} ${styles.showcase} ${styles.canvasShowcase}`}
          >
            <div className={styles.showcaseCopy}>
              <p className={styles.eyebrow}>02 / Canvas</p>
              <h2 id="canvas-title">
                See the
                <br />
                connections.
              </h2>
              <p>
                When a list isn&apos;t quite enough, spread things out. Put
                notes, ideas, and possibilities side by side and find your way
                through.
              </p>
              <ul className={styles.featureList}>
                <li>
                  <Check /> Sticky notes and connected shapes
                </li>
                <li>
                  <Check /> Your notes, right on the canvas
                </li>
                <li>
                  <Check /> Room to follow a new direction
                </li>
              </ul>
              <NavigationLink href="/register" className={styles.textLink}>
                Give your ideas some room <ArrowRight size={16} />
              </NavigationLink>
            </div>
            <div
              className={styles.canvasStage}
              role="img"
              aria-label="A mind map connecting a website's goals, inspiration, structure, and content"
            >
              <CanvasPreview />
            </div>
          </div>
        </section>
        <section
          id="boards"
          className={`${styles.container} ${styles.showcase} ${styles.boardShowcase}`}
          aria-labelledby="boards-title"
        >
          <div className={styles.showcaseCopy}>
            <p className={styles.eyebrow}>03 / Boards</p>
            <h2 id="boards-title">
              Give the plan
              <br />a next step.
            </h2>
            <p>
              Turn ideas into action with simple kanban boards. Keep track of
              what&apos;s next, what you&apos;re working on, and what&apos;s
              done.
            </p>
            <NavigationLink href="/register" className={styles.textLink}>
              Put your plan in motion <ArrowRight size={16} />
            </NavigationLink>
          </div>
          <div
            className={styles.boardStage}
            role="img"
            aria-label="A project board with tasks grouped into To do, In progress, and Done"
          >
            <BoardPreview />
          </div>
        </section>
        <section
          className={`${styles.container} ${styles.useCases}`}
          aria-labelledby="usecases-title"
        >
          <div className={styles.useCasesIntro}>
            <p className={styles.eyebrow}>Whatever&apos;s on your mind</p>
            <h2 id="usecases-title">Make it yours.</h2>
            <p>
              A place for personal projects, from your next exam to your next
              big idea.
            </p>
          </div>
          <div className={styles.useCaseGrid}>
            {useCases.map((item) => (
              <a href={item.href} className={styles.useCase} key={item.title}>
                <div className={styles.useCaseImage}>
                  <Image
                    src={`/images/marketing/${item.image}.webp`}
                    alt={item.alt}
                    width={600}
                    height={400}
                    sizes="(max-width: 600px) 90vw, (max-width: 1000px) 30vw, 260px"
                  />
                </div>
                <div className={styles.useCaseCopy}>
                  <h3>
                    {item.title}
                    <ArrowRight size={16} />
                  </h3>
                  <p>{item.text}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
        <section
          className={`${styles.container} ${styles.faqSection}`}
          aria-labelledby="faq-title"
        >
          <div>
            <p className={styles.eyebrow}>A few things to know</p>
            <h2 id="faq-title">
              Frequently <br />
              asked questions.
            </h2>
          </div>
          <div className={styles.faqList}>
            {questions.map((item) => (
              <details className={styles.faq} key={item.question}>
                <summary>
                  {item.question}
                  <Plus size={18} aria-hidden="true" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section
          className={styles.closingSection}
          aria-labelledby="closing-title"
        >
          <div className={`${styles.container} ${styles.closingInner}`}>
            <div>
              <h2 id="closing-title">Start with one thought.</h2>
              <p>Notes, canvases, and boards. All in one personal workspace.</p>
            </div>
            <NavigationLink href="/register" className={styles.darkButton}>
              Create an account <ArrowRight size={17} />
            </NavigationLink>
          </div>
        </section>
      </main>
      <footer className={styles.darkSection}>
        <div className={`${styles.container} ${styles.footer}`}>
          <div className={styles.footerBrand}>
            <NavigationLink href="/" aria-label="Noteworthy home">
              <Brand />
            </NavigationLink>
            <p>
              A personal workspace for notes,
              <br />
              visual ideas, and the plans that follow.
            </p>
          </div>
          <nav aria-label="Footer">
            <a href="#notes">Notes</a>
            <a href="#canvas">Canvas</a>
            <a href="#boards">Boards</a>
            <NavigationLink href="/login">
              Sign in <ArrowRight size={13} />
            </NavigationLink>
          </nav>
        </div>
        <div className={`${styles.container} ${styles.footerBottom}`}>
          <span>Make a little room for your ideas.</span>
          <span>Made for your train of thought.</span>
        </div>
      </footer>
    </div>
  );
}

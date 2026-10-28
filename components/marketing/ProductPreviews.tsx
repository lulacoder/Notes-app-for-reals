import Image from "next/image";
import {
  Bold,
  Check,
  FileText,
  Heading1,
  ImageIcon,
  Italic,
  LayoutDashboard,
  Link2,
  List,
  Maximize2,
  MoreHorizontal,
  MousePointer2,
  Network,
  Plus,
  Square,
  Type,
  Underline,
} from "lucide-react";
import styles from "./landing.module.css";

// Lightweight illustrations that never request private workspace data.
export function NotesPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`${styles.notePreview} ${compact ? styles.compactNote : ""}`}
    >
      <div className={styles.previewTopbar}>
        <span>
          <FileText size={13} /> Notes{" "}
          <span className={styles.previewSlash}>/</span> Studio website
        </span>
        <MoreHorizontal size={17} />
      </div>
      <div className={styles.editorToolbar} aria-hidden="true">
        <Heading1 />
        <Bold />
        <Italic />
        <Underline />
        <span />
        <List />
        <Link2 />
        <ImageIcon />
      </div>
      <div className={styles.noteBody}>
        <h3>Studio website</h3>
        <p>
          A refreshed home for my work. A little more space for the things I
          want to make.
        </p>
        {!compact && (
          <Image
            className={styles.notePhoto}
            src="/images/marketing/studio.webp"
            alt="A quiet creative studio with a chair and leafy plant"
            width={540}
            height={360}
            sizes="(max-width: 760px) 35vw, 200px"
          />
        )}
        <h4>
          {compact ? "Ideas for the new site" : "A few things to start with"}
        </h4>
        <ul className={styles.noteChecklist}>
          <li>
            <Square /> Showcase selected work
          </li>
          <li>
            <Square /> Keep the design minimal
          </li>
          <li>
            <span className={styles.checkedBox}>
              <Check />
            </span>{" "}
            Add a contact form
          </li>
          <li>
            <Square /> Collect a little inspiration
          </li>
        </ul>
        {!compact && (
          <>
            <h4>Useful links</h4>
            <p className={styles.noteLinks}>
              <Link2 size={12} /> Portfolio references
              <br />
              <Link2 size={12} /> Type and layout ideas
            </p>
          </>
        )}
        <div className={styles.noteTags}>
          <span>#website</span>
          <span>#ideas</span>
          <span>#inspiration</span>
        </div>
      </div>
    </div>
  );
}

export function CanvasPreview({
  compact = false,
  sidebar = false,
}: {
  compact?: boolean;
  sidebar?: boolean;
}) {
  const marker = compact
    ? "arrow-small"
    : sidebar
      ? "arrow-hero"
      : "arrow-feature";
  return (
    <div
      className={`${styles.canvasPreview} ${compact ? styles.compactCanvas : ""} ${sidebar ? styles.withSidebar : ""}`}
    >
      {sidebar && (
        <div className={styles.canvasSidebar} aria-hidden="true">
          <strong>Noteworthy</strong>
          <span>
            <FileText /> Notes
          </span>
          <span className={styles.sidebarActive}>
            <Network /> Canvas
          </span>
          <span>
            <LayoutDashboard /> Boards
          </span>
          <span className={styles.sidebarNew}>
            <Plus /> New
          </span>
        </div>
      )}
      <div className={styles.canvasMain}>
        <div className={styles.canvasTopbar}>
          <span>
            <Network size={13} /> Studio website
          </span>
          <span aria-hidden="true">
            <Maximize2 size={12} />
            <span>100%</span>
            <Plus size={14} />
          </span>
        </div>
        <div className={styles.canvasSurface}>
          {!compact && (
            <div className={styles.canvasTools} aria-hidden="true">
              <MousePointer2 />
              <Square />
              <Type />
              <ImageIcon />
              <Plus />
            </div>
          )}
          <svg
            className={styles.canvasConnections}
            viewBox="0 0 600 390"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <marker
                id={marker}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="m1 1 7 4-7 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </marker>
            </defs>
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              markerEnd={`url(#${marker})`}
            >
              <path d="M170 120 Q255 120 280 183" />
              <path d="M310 180 Q340 135 335 105" />
              <path d="M330 192 Q440 190 465 130" />
              <path d="M280 220 Q210 300 155 305" />
              <path d="M315 225 Q350 285 335 310" />
              <path d="M345 210 Q465 225 470 290" />
            </g>
          </svg>
          <div className={`${styles.sticky} ${styles.stickyPink}`}>
            <strong>Studio website</strong>
            <ul>
              <li>A clear story</li>
              <li>Selected work</li>
              <li>Get in touch</li>
            </ul>
          </div>
          <div className={`${styles.sticky} ${styles.stickyYellow}`}>
            <strong>Inspiration</strong>
            <Image
              src="/images/marketing/studio.webp"
              alt=""
              width={540}
              height={360}
              sizes="120px"
            />
          </div>
          <div className={`${styles.sticky} ${styles.stickyBlue}`}>
            <strong>Structure</strong>
            <ul>
              <li>Homepage</li>
              <li>Work</li>
              <li>About</li>
              <li>Contact</li>
            </ul>
          </div>
          <div className={styles.canvasCenter}>
            Build
            <br />
            website
          </div>
          <div className={`${styles.sticky} ${styles.stickyGreen}`}>
            <strong>Visual style</strong>
            <Image
              src="/images/marketing/studio.webp"
              alt=""
              width={540}
              height={360}
              sizes="120px"
            />
          </div>
          <div className={`${styles.sticky} ${styles.stickyPurple}`}>
            <strong>Content</strong>
            <ul>
              <li>Headlines</li>
              <li>Project images</li>
              <li>Short blurbs</li>
            </ul>
          </div>
          {!compact && (
            <div className={styles.embeddedNote}>
              <FileText size={12} />
              <strong>Draft homepage</strong>
              <span>
                <Square /> Write headline
              </span>
              <span>
                <Square /> Add hero image
              </span>
              <small>#website &nbsp; #ideas</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const columns = [
  {
    title: "To do",
    tasks: ["Collect references", "Draft homepage", "Write about page"],
  },
  { title: "In progress", tasks: ["Design visual style", "Review navigation"] },
  {
    title: "Done",
    tasks: ["Set up domain", "Choose typography", "Add images"],
  },
];

export function BoardPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`${styles.boardPreview} ${compact ? styles.compactBoard : ""}`}
    >
      <div className={styles.previewTopbar}>
        <span>
          <LayoutDashboard size={13} /> Studio website
        </span>
        <MoreHorizontal size={17} />
      </div>
      <div className={styles.boardColumns}>
        {columns.map((column, index) => (
          <div className={styles.boardColumn} key={column.title}>
            <div className={styles.columnTitle}>
              <span>
                {column.title} <small>{column.tasks.length}</small>
              </span>
              <MoreHorizontal size={12} />
            </div>
            {column.tasks.slice(0, compact ? 2 : 3).map((task) => (
              <div className={styles.taskCard} key={task}>
                <span className={styles.taskStatus} data-stage={index}>
                  {index === 2 && <Check size={9} />}
                </span>
                <span>{task}</span>
              </div>
            ))}
            <span className={styles.addTask}>
              <Plus size={12} /> Add a task
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

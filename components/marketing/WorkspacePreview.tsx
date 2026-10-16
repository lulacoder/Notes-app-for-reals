import { ArrowLeft, Bold, Check, ChevronDown, FileText, Italic, LayoutDashboard, Link2, List, MoreHorizontal, Network, Plus, Search, Square, Star, Tag, Underline } from "lucide-react";
import { Brand } from "./Brand";
import styles from "./paper.module.css";

// A lightweight HTML illustration. These are examples, not interactive app controls.
export function WorkspacePreview() {
  return (
    <div className={styles.workspace} role="img" aria-label="A Noteworthy workspace with project notes, a connected launch plan on a canvas, and a task board.">
      <div aria-hidden="true">
        <div className={styles.workspaceHeader}>
          <Brand compact />
          <span className={styles.previewSearch}><Search size={13} /> Search your workspace</span>
          <span className={styles.previewAvatar}>J</span>
        </div>
        <div className={styles.workspaceBody}>
          <div className={styles.previewSidebar}>
            <span className={styles.activeNav}><FileText /> Notes</span>
            <span><Network /> Canvas</span>
            <span><LayoutDashboard /> Boards</span>
            <hr />
            <span><FileText /> All notes</span>
            <span><Star /> Favorites</span>
            <span><Tag /> Tags</span>
            <span className={styles.newNote}><Plus /> New note</span>
          </div>
          <div className={styles.previewNote}>
            <div className={styles.previewTools}><ArrowLeft size={13} /><MoreHorizontal size={17} /></div>
            <h2>Project notes</h2>
            <div className={styles.formatting}><span>Normal <ChevronDown size={10} /></span><Bold /><Italic /><Underline /><List /><Link2 /></div>
            <span className={styles.previewTag}># product</span>
            <h3>Goals</h3>
            <ul><li>Make room for good ideas</li><li>Build a first version</li><li>Learn as we go</li></ul>
            <h3>Next steps</h3>
            <p><Square /> Define core features</p>
            <p><Square /> Build prototype</p>
            <p><Square /> Plan user testing</p>
            <div className={styles.reference}>
              <h3>References</h3>
              <span><FileText size={18} /><span>Product brief<small>Note · Linked</small></span></span>
            </div>
          </div>
          <div className={styles.previewRight}>
            <div className={styles.previewCanvas}>
              <div className={styles.previewPanelTitle}><span><Network /> Launch plan</span><MoreHorizontal /></div>
              <div className={styles.canvasDrawing}>
                <svg className={styles.connections} viewBox="0 0 360 205" preserveAspectRatio="none">
                  <path d="M95 45C165 45 130 105 180 103M270 45C210 45 230 103 180 103M95 168C155 168 145 103 180 103M270 168C210 168 235 103 180 103" fill="none" stroke="#8c8a82" strokeWidth="1.2" />
                </svg>
                <div className={styles.stickyIdeas}><b>Ideas</b><span>Better onboarding</span><span>More templates</span></div>
                <div className={styles.stickyBuild}><b>Build</b><span>Core experience</span><span>Mobile friendly</span></div>
                <div className={styles.stickyCenter}>Launch plan</div>
                <div className={styles.stickyResearch}><b>Research</b><span>User interviews</span><span>Early feedback</span></div>
                <div className={styles.stickyMarketing}><b>Marketing</b><span>Landing page</span><span>Early beta</span></div>
              </div>
            </div>
            <div className={styles.previewBoard}>
              <div className={styles.previewPanelTitle}><span><LayoutDashboard /> Tasks</span><MoreHorizontal /></div>
              <div className={styles.boardColumns}>
                <div><b>To do <small>2</small></b><p><Square /> Design onboarding<span># design</span></p><p><Square /> Plan user testing<span># product</span></p></div>
                <div><b>Doing <small>1</small></b><p><Square /> Build prototype<span># product</span></p></div>
                <div><b>Done <small>1</small></b><p><Check /> Define project goals<span># planning</span></p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

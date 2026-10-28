"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { BoardPreview, CanvasPreview, NotesPreview } from "./ProductPreviews";
import styles from "./landing.module.css";

const steps = [
  {
    title: "Capture",
    description: "Jot down the idea, messy or neat.",
    detail:
      "Start with a note. A few words, a useful link, a list of things to explore.",
    Preview: NotesPreview,
  },
  {
    title: "Connect",
    description: "Turn related thoughts into a bigger picture.",
    detail:
      "Spread your ideas across a canvas. Add notes and find the connections.",
    Preview: CanvasPreview,
  },
  {
    title: "Plan",
    description: "Break it into tasks and make progress.",
    detail:
      "Give the next steps a home on a board. See what's next and what's done.",
    Preview: BoardPreview,
  },
];

export function WorkflowDemo() {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div
        className={styles.workflowSteps}
        role="tablist"
        aria-label="Explore the workflow"
      >
        {steps.map((step, index) => (
          <button
            className={styles.workflowStep}
            key={step.title}
            id={`workflow-tab-${index}`}
            role="tab"
            aria-selected={active === index}
            aria-controls="workflow-detail"
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? steps.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        steps.length) %
                      steps.length;
              setActive(next);
              document.getElementById(`workflow-tab-${next}`)?.focus();
            }}
          >
            <span className={styles.stepHeading}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <strong>{step.title}</strong>
              <ArrowRight size={17} />
            </span>
            <span className={styles.stepDescription}>{step.description}</span>
            <span className={styles.stepPreview} aria-hidden="true">
              <step.Preview compact />
            </span>
          </button>
        ))}
      </div>
      <div
        id="workflow-detail"
        className={styles.workflowDetail}
        role="tabpanel"
        aria-labelledby={`workflow-tab-${active}`}
        tabIndex={0}
      >
        <span>0{active + 1} /</span>
        <p>{steps[active].detail}</p>
        <span className={styles.demoHint}>
          One project. Three ways to think.
        </span>
      </div>
    </div>
  );
}

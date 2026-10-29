"use client";

import { useCallback, useRef, useState } from "react";

import type { Shape } from "@/lib/canvas/model";

export function useCanvasHistory(initial: Shape[]) {
  const [state, setState] = useState<{
    past: Shape[][];
    present: Shape[];
    future: Shape[][];
  }>({ past: [], present: initial, future: [] });
  const current = useRef(initial);
  const commit = useCallback((shapes: Shape[]) => {
    current.current = shapes;
    setState((old) =>
      JSON.stringify(old.present) === JSON.stringify(shapes)
        ? old
        : {
            past: [...old.past, old.present].slice(-100),
            present: shapes,
            future: [],
          },
    );
  }, []);
  const reset = useCallback((shapes: Shape[]) => {
    current.current = shapes;
    setState({ past: [], present: shapes, future: [] });
  }, []);
  const undo = useCallback(
    () =>
      setState((old) => {
        if (!old.past.length) return old;
        const previous = old.past[old.past.length - 1];
        current.current = previous;
        return {
          past: old.past.slice(0, -1),
          present: previous,
          future: [old.present, ...old.future],
        };
      }),
    [],
  );
  const redo = useCallback(
    () =>
      setState((old) => {
        if (!old.future.length) return old;
        const next = old.future[0];
        current.current = next;
        return {
          past: [...old.past, old.present],
          present: next,
          future: old.future.slice(1),
        };
      }),
    [],
  );
  return {
    shapes: state.present,
    current,
    commit,
    reset,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}

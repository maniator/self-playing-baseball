import * as React from "react";

import type { DragEndEvent } from "@dnd-kit/core";
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import type { EditorAction, EditorPlayer } from "./editorState";

/** Sentinel droppable IDs for empty lineup/bench sections. */
export const LINEUP_DROPPABLE_ID = "lineup-droppable";
export const BENCH_DROPPABLE_ID = "bench-droppable";

type Options = {
  lineup: EditorPlayer[];
  bench: EditorPlayer[];
  pitchers: EditorPlayer[];
  dispatch: React.Dispatch<EditorAction>;
};

type Return = {
  sensors: ReturnType<typeof useSensors>;
  handleLineupBenchDragEnd: (event: DragEndEvent) => void;
  handlePitchersDragEnd: (event: DragEndEvent) => void;
};

/** Returns configured DnD sensors and drag-end handlers for the team editor. */
export function useEditorDragHandlers({ lineup, bench, pitchers, dispatch }: Options): Return {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleLineupBenchDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeInLineup = lineup.some((p) => p.id === active.id);
      const activeInBench = bench.some((p) => p.id === active.id);
      if (!activeInLineup && !activeInBench) return;

      const activeSection: "lineup" | "bench" = activeInLineup ? "lineup" : "bench";
      const overInLineup = lineup.some((p) => p.id === over.id);
      const overInBench = bench.some((p) => p.id === over.id);
      const overSectionId =
        over.id === LINEUP_DROPPABLE_ID
          ? "lineup"
          : over.id === BENCH_DROPPABLE_ID
            ? "bench"
            : null;
      if (!overInLineup && !overInBench && !overSectionId) return;

      const overSection: "lineup" | "bench" = overInLineup
        ? "lineup"
        : overInBench
          ? "bench"
          : (overSectionId as "lineup" | "bench");
      const currentSection = activeSection === "lineup" ? lineup : bench;

      if (activeSection === overSection && (overInLineup || overInBench)) {
        // Same-section reorder.
        const oldIndex = currentSection.findIndex((p) => p.id === active.id);
        const newIndex = currentSection.findIndex((p) => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(currentSection, oldIndex, newIndex);
        dispatch({
          type: "REORDER",
          section: activeSection,
          orderedIds: reordered.map((p) => p.id),
        });
      } else if (activeSection === overSection && overSectionId !== null) {
        // Same section, dropped onto sentinel (move to end).
        const oldIndex = currentSection.findIndex((p) => p.id === active.id);
        if (oldIndex === -1 || oldIndex === currentSection.length - 1) return;
        const reordered = arrayMove(currentSection, oldIndex, currentSection.length - 1);
        dispatch({
          type: "REORDER",
          section: activeSection,
          orderedIds: reordered.map((p) => p.id),
        });
      } else if (activeSection !== overSection) {
        // Cross-section transfer.
        const overCurrentSection = overSection === "lineup" ? lineup : bench;
        const toIndex =
          overInBench || overInLineup
            ? overCurrentSection.findIndex((p) => p.id === over.id)
            : overCurrentSection.length;
        dispatch({
          type: "TRANSFER_PLAYER",
          fromSection: activeSection,
          toSection: overSection,
          playerId: String(active.id),
          toIndex: toIndex === -1 ? overCurrentSection.length : toIndex,
        });
      }
    },
    [lineup, bench, dispatch],
  );

  const handlePitchersDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = pitchers.findIndex((p) => p.id === active.id);
      const newIndex = pitchers.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(pitchers, oldIndex, newIndex);
      dispatch({ type: "REORDER", section: "pitchers", orderedIds: reordered.map((p) => p.id) });
    },
    [pitchers, dispatch],
  );

  return { sensors, handleLineupBenchDragEnd, handlePitchersDragEnd };
}

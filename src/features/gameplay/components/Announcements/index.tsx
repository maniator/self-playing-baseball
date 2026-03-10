import * as React from "react";

import { useGameContext } from "@feat/gameplay/context/index";

import { AnnouncementsArea, EmptyState, HeadingRow, Log, Toggle } from "./styles";

/** Pixels from the top edge within which auto-scroll to newest entry fires. */
const SCROLL_THRESHOLD = 60;

const Announcements: React.FunctionComponent = () => {
  const { log, teams, teamLabels } = useGameContext();
  const [expanded, setExpanded] = React.useState(false);
  const areaRef = React.useRef<HTMLDivElement>(null);

  /**
   * Replaces raw team IDs in old log entries with their display names.
   * New log entries already contain display names (from teamLabels), so this
   * is a backward-compatibility shim for saves created before the teamLabels fix.
   */
  const resolveEntry = (entry: string): string =>
    teams.reduce((s, id, i) => {
      const label = teamLabels[i];
      return id !== label ? s.replaceAll(id, label) : s;
    }, entry);

  React.useEffect(() => {
    if (!expanded) return;
    const el = areaRef.current;
    if (!el) return;
    // log is newest-first; scroll to top only when the user is already near it
    const isNearTop = el.scrollTop < SCROLL_THRESHOLD;
    if (isNearTop) {
      el.scrollTop = 0;
    }
  }, [log, expanded]);

  return (
    <>
      <HeadingRow>
        <span>Play-by-play</span>
        <Toggle
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse play-by-play" : "Expand play-by-play"}
        >
          {expanded ? "▼ hide" : "▶ show"}
        </Toggle>
      </HeadingRow>
      {expanded && (
        <AnnouncementsArea
          ref={areaRef}
          aria-live="polite"
          aria-atomic="false"
          data-testid="play-by-play-log"
        >
          {log.length === 0 ? (
            <EmptyState>Press &quot;Play Ball!&quot; to start the game.</EmptyState>
          ) : (
            log.map((announcement, idx) => (
              <Log key={idx} data-log-index={log.length - 1 - idx}>
                {resolveEntry(announcement)}
              </Log>
            ))
          )}
        </AnnouncementsArea>
      )}
    </>
  );
};

export default Announcements;

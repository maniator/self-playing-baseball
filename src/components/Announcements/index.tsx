import * as React from "react";

import styled from "styled-components";

import { useGameContext } from "@context/index";
import { mq } from "@utils/mediaQueries";

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
  margin-top: 12px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #333;
  position: sticky;
  top: 0;
  background: #000;
  z-index: 1;
`;

const Toggle = styled.button`
  background: none;
  border: none;
  color: #555;
  font-size: 11px;
  cursor: pointer;
  padding: 0 2px;
  &:hover {
    color: #aaa;
  }
`;

const AnnouncementsArea = styled.div`
  overflow-y: auto;
  padding-right: 8px;
  max-height: 300px;
  min-height: 60px;
  ${mq.mobile} {
    min-height: auto;
    max-height: none;
  }
`;

const EmptyState = styled.div`
  color: #555;
  font-size: 12px;
  padding: 6px 5px;
`;

const Log = styled.div`
  font-size: 12px;
  padding: 3px 5px;
  color: #ccc;
  ${mq.mobile} {
    font-size: 11px;
  }
`;

/** Pixels from the top edge within which auto-scroll to newest entry fires. */
const SCROLL_THRESHOLD = 60;

const Announcements: React.FunctionComponent = () => {
  const { log } = useGameContext();
  const [expanded, setExpanded] = React.useState(false);
  const areaRef = React.useRef<HTMLDivElement>(null);

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
            <EmptyState>Press &quot;Batter Up!&quot; to start the game.</EmptyState>
          ) : (
            log.map((announcement, idx) => <Log key={idx}>{announcement}</Log>)
          )}
        </AnnouncementsArea>
      )}
    </>
  );
};

export default Announcements;

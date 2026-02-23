import * as React from "react";

import {
  CloseButton,
  CloseXButton,
  Dialog,
  DialogHeader,
  DialogTitle,
  HelpButton,
  Li,
  List,
  ScrollBody,
  SectionBody,
  SectionDetails,
  SectionSummary,
} from "./styles";

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Section: React.FunctionComponent<SectionProps> = ({ title, defaultOpen, children }) => (
  <SectionDetails defaultOpen={defaultOpen}>
    <SectionSummary>{title}</SectionSummary>
    <SectionBody>{children}</SectionBody>
  </SectionDetails>
);

const InstructionsModal: React.FunctionComponent = () => {
  const ref = React.useRef<HTMLDialogElement>(null);

  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();

  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside) close();
  };

  return (
    <>
      <HelpButton onClick={open} aria-label="How to play">
        ?
      </HelpButton>

      <Dialog ref={ref} onClick={handleClick}>
        <DialogHeader>
          <DialogTitle>⚾ How to Play</DialogTitle>
          <CloseXButton onClick={close} aria-label="Close">
            ✕
          </CloseXButton>
        </DialogHeader>

        <ScrollBody>
          <Section title="Basics" defaultOpen>
            <List>
              <Li>
                Press <strong>Batter Up!</strong> (or Spacebar) to pitch.
              </Li>
              <Li>
                Each pitch is a swing, take, or hit — randomised but seeded so every game is
                repeatable.
              </Li>
              <Li>3 strikes = out · 4 balls = walk · 3 outs = end of half-inning.</Li>
              <Li>
                The game lasts 9 innings. If the home team leads after the top of the 9th, they win
                without batting. Walk-off: if the home team takes the lead during the bottom of the
                9th+, the game ends immediately.
              </Li>
            </List>
          </Section>

          <Section title="Pre-game customisation">
            <List>
              <Li>
                Before starting, enter team names and optionally upload a{" "}
                <strong>roster CSV</strong> to give each lineup real player names.
              </Li>
              <Li>
                Drag rows in the <strong>batting order</strong> to reorder your lineup.
              </Li>
              <Li>
                Override any batter&apos;s <strong>Contact</strong>, <strong>Power</strong>, or{" "}
                <strong>Speed</strong> stats to change how they perform.
              </Li>
            </List>
          </Section>

          <Section title="Auto-play">
            <List>
              <Li>
                Enable <strong>Auto-play</strong> to let the game pitch itself.
              </Li>
              <Li>Choose Slow / Normal / Fast speed.</Li>
              <Li>
                🔊 slider = play-by-play voice volume · 🔔 slider = chime &amp; fanfare volume.
              </Li>
            </List>
          </Section>

          <Section title="Manager Mode (requires Auto-play)">
            <List>
              <Li>
                Pick which team you manage and a <strong>Strategy</strong> (Balanced / Aggressive /
                Patient / Contact / Power).
              </Li>
              <Li>
                At key moments the game pauses and asks for your decision — steal, bunt, intentional
                walk, pinch-hitter, defensive shift, or count-based choices.
              </Li>
              <Li>
                A chime sounds and a browser notification appears (if allowed) when a decision is
                ready.
              </Li>
              <Li>A 10-second countdown auto-skips if you don&apos;t choose in time.</Li>
              <Li>Steals are only offered when the odds are ≥ 73 %.</Li>
              <Li>
                Intentional walk is only offered in the 7th inning or later, close game, with 2
                outs.
              </Li>
              <Li>
                Pinch-hitter is only offered in the 7th inning or later, with a runner on 2nd or
                3rd, fewer than 2 outs, at the start of an at-bat.
              </Li>
              <Li>
                Defensive shift is only offered when your team is in the field, at the start of the
                opponent&apos;s at-bat.
              </Li>
            </List>
          </Section>

          <Section title="Live batting stats">
            <List>
              <Li>
                The <strong>Batting Stats</strong> panel (always visible) shows AB, H, BB, K, and
                RBI for every batter in both lineups.
              </Li>
              <Li>
                Click/tap a batter&apos;s row to open the <strong>Player Details</strong> section
                below the table — it shows expanded stats including 1B, 2B, 3B, HR, AVG, OBP, SLG,
                and OPS.
              </Li>
              <Li>The game continues running while you inspect a player&apos;s stats.</Li>
            </List>
          </Section>

          <Section title="Saves &amp; Sharing">
            <List>
              <Li>
                Click <strong>💾 Saves</strong> to save, load, export, or import a game.
              </Li>
              <Li>
                <strong>Export save</strong> downloads a JSON file you can share or back up.{" "}
                <strong>Import save</strong> restores a game from that file.
              </Li>
              <Li>
                Game saves (including MLB team data) are stored locally in{" "}
                <strong>IndexedDB</strong> via RxDB — no server required.
              </Li>
              <Li>
                Click <strong>Share seed</strong> to copy a link containing only the random seed.
              </Li>
              <Li>
                Anyone with the seed link will see identical pitches — but Manager decisions are
                yours to make again.
              </Li>
            </List>
          </Section>

          <Section title="Hit types">
            <List>
              <Li>
                <strong>Single</strong> — batter to 1st; runner on 3rd scores; others advance one
                base.
              </Li>
              <Li>
                <strong>Double</strong> — batter to 2nd; runners on 2nd/3rd score; runner on 1st to
                3rd.
              </Li>
              <Li>
                <strong>Triple</strong> — batter to 3rd; all runners score.
              </Li>
              <Li>
                <strong>Home run</strong> — everyone scores.
              </Li>
              <Li>
                <strong>Walk</strong> — batter to 1st; force advancement only.
              </Li>
            </List>
          </Section>

          <CloseButton onClick={close}>Got it!</CloseButton>
        </ScrollBody>
      </Dialog>
    </>
  );
};

export default InstructionsModal;

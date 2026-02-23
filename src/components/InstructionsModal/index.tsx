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

      <Dialog ref={ref} onClick={handleClick} data-testid="instructions-modal">
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
                Press <strong>Play Ball!</strong> to start the game.
              </Li>
              <Li>
                Once the game starts, it runs automatically pitch-by-pitch — no clicking required.
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

          {/* Keep this copy aligned with the current New Game dialog and gameplay controls.
              Do not document planned features here. */}
          <Section title="Pre-game customization">
            <List>
              <Li>
                Choose the <strong>Matchup</strong> type — AL vs AL, NL vs NL, or Interleague — then
                pick your Home and Away teams from the dropdowns.
              </Li>
              <Li>
                Under <strong>Manage a team?</strong> choose None — just watch, Away, or Home. You
                can also switch teams and toggle Manager Mode after the game starts.
              </Li>
              <Li>
                Click <strong>▸ Customize Players</strong> to expand player editing. Use the{" "}
                <strong>Away</strong> and <strong>Home</strong> tabs to switch teams.
              </Li>
              <Li>
                For each batter: enter a <strong>nickname</strong>, adjust <strong>CON</strong> /{" "}
                <strong>PWR</strong> / <strong>SPD</strong> using preset tiers (Poor → Elite), and
                drag the ⠿ handle to reorder the batting lineup.
              </Li>
              <Li>
                For the starting pitcher: enter a <strong>nickname</strong> and adjust{" "}
                <strong>CTL</strong> / <strong>VEL</strong> / <strong>STM</strong> with the same
                preset tiers.
              </Li>
              <Li>
                Enter a custom <strong>Seed</strong> for a repeatable game, or leave blank for
                random.
              </Li>
            </List>
          </Section>

          <Section title="Game Flow">
            <List>
              <Li>The game runs automatically once started — sit back and watch.</Li>
              <Li>Choose Slow / Normal / Fast speed to control the pace.</Li>
              <Li>
                🔊 slider = play-by-play voice volume · 🔔 slider = chime &amp; fanfare volume.
              </Li>
            </List>
          </Section>

          <Section title="Manager Mode">
            <List>
              <Li>
                Turn on <strong>Manager Mode</strong> and pick which team you manage, along with a{" "}
                <strong>Strategy</strong> (Balanced / Aggressive / Patient / Contact / Power).
              </Li>
              <Li>
                The game keeps running automatically between decision moments. At key moments it
                pauses and asks for your decision — steal, bunt, intentional walk, pinch-hitter,
                defensive shift, or count-based choices.
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

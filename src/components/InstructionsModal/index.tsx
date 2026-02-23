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
          {/* Keep this copy aligned with the current UI and gameplay behavior.
              Do not document planned features or internal tuning rules here. */}
          <Section title="Basics" defaultOpen>
            <List>
              <Li>
                Press <strong>Play Ball!</strong> to start.
              </Li>
              <Li>The game runs automatically pitch-by-pitch — no clicking needed.</Li>
              <Li>Outcomes are randomised but seeded — same seed always plays out the same way.</Li>
              <Li>3 strikes = out · 4 balls = walk · 3 outs = half-inning over.</Li>
              <Li>
                9 innings; home team wins if ahead after 8½. Walk-off ends the game instantly.
              </Li>
            </List>
          </Section>

          <Section title="Pre-game customization">
            <List>
              <Li>
                Choose a <strong>Matchup</strong> type (AL vs AL, NL vs NL, or Interleague) and
                select your Home and Away teams.
              </Li>
              <Li>
                Under <strong>Manage a team?</strong> pick Home, Away, or None. You can also change
                this after the game starts.
              </Li>
              <Li>
                Expand <strong>▸ Customize Players</strong> to set nicknames, tweak stat presets,
                and drag ⠿ to reorder the batting lineup — for both teams.
              </Li>
              <Li>
                Enter a <strong>Seed</strong> for a repeatable game, or leave blank for random.
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
                Enable <strong>Manager Mode</strong>, pick which team to manage, and choose a{" "}
                <strong>Strategy</strong> (Balanced, Aggressive, Patient, Contact, or Power).
              </Li>
              <Li>
                The game keeps running between decisions. At key moments it pauses and asks — steal,
                bunt, intentional walk, pinch-hitter, or defensive shift.
              </Li>
              <Li>
                A chime sounds and a browser notification appears (if allowed) when a decision is
                ready.
              </Li>
              <Li>You have 10 seconds to decide; the game auto-skips if you don&apos;t.</Li>
            </List>
          </Section>

          <Section title="Live batting stats">
            <List>
              <Li>
                The <strong>Batting Stats</strong> panel shows AB, H, BB, K, and RBI for every
                batter.
              </Li>
              <Li>
                Tap or click any row to see <strong>Player Details</strong> — expanded stats appear
                below the table.
              </Li>
              <Li>The game keeps running while you browse stats.</Li>
            </List>
          </Section>

          <Section title="Saves &amp; Sharing">
            <List>
              <Li>
                Click <strong>💾 Saves</strong> to save, load, export, or import a game. Saves are
                stored locally — no account needed.
              </Li>
              <Li>
                <strong>Export save</strong> downloads a JSON file you can back up or share.{" "}
                <strong>Import save</strong> restores it.
              </Li>
              <Li>
                Click <strong>Share seed</strong> to copy a link. Anyone with it sees the same
                pitches — Manager decisions are yours to replay.
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

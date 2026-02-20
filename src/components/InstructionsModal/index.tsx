import * as React from "react";
import { HelpButton, Dialog, DialogTitle, Section, SectionHeading, List, Li, CloseButton } from "./styles";

const InstructionsModal: React.FunctionComponent<{}> = () => {
  const ref = React.useRef<HTMLDialogElement>(null);

  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();

  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const outside =
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top  || e.clientY > rect.bottom;
    if (outside) close();
  };

  return (
    <>
      <HelpButton onClick={open} aria-label="How to play">?</HelpButton>

      <Dialog ref={ref} onClick={handleClick}>
        <DialogTitle>⚾ How to Play</DialogTitle>

        <Section>
          <SectionHeading>Basics</SectionHeading>
          <List>
            <Li>Press <strong>Batter Up!</strong> (or Spacebar) to pitch.</Li>
            <Li>Each pitch is a swing, take, or hit — randomised but seeded so every game is repeatable.</Li>
            <Li>3 strikes = out · 4 balls = walk · 3 outs = end of half-inning.</Li>
            <Li>The game lasts 9 innings. If the home team leads after the top of the 9th, they win without batting. Walk-off: if the home team takes the lead during the bottom of the 9th+, the game ends immediately.</Li>
          </List>
        </Section>

        <Section>
          <SectionHeading>Auto-play</SectionHeading>
          <List>
            <Li>Enable <strong>Auto-play</strong> to let the game pitch itself.</Li>
            <Li>Choose Slow / Normal / Fast speed.</Li>
            <Li>🔊 slider = play-by-play voice volume · 🔔 slider = chime &amp; fanfare volume.</Li>
          </List>
        </Section>

        <Section>
          <SectionHeading>Manager Mode (requires Auto-play)</SectionHeading>
          <List>
            <Li>Pick which team you manage and a <strong>Strategy</strong> (Balanced / Aggressive / Patient / Contact / Power).</Li>
            <Li>At key moments the game pauses and asks for your decision — steal, bunt, intentional walk, pinch-hitter, defensive shift, or count-based choices.</Li>
            <Li>A chime sounds and a browser notification appears (if allowed) when a decision is ready.</Li>
            <Li>A 10-second countdown auto-skips if you don't choose in time.</Li>
            <Li>Steals are only offered when the odds are ≥ 73 %.</Li>
            <Li>Intentional walk is only offered in the 7th inning or later, close game, with 2 outs.</Li>
            <Li>Pinch-hitter is only offered in the 7th inning or later, with a runner on 2nd or 3rd, fewer than 2 outs, at the start of an at-bat.</Li>
            <Li>Defensive shift is only offered when your team is in the field, at the start of the opponent's at-bat.</Li>
          </List>
        </Section>

        <Section>
          <SectionHeading>Sharing</SectionHeading>
          <List>
            <Li>Click <strong>Share replay</strong> to copy a link containing the random seed.</Li>
            <Li>Anyone with the link will see identical pitches — but Manager decisions are yours to make again.</Li>
          </List>
        </Section>

        <Section>
          <SectionHeading>Hit types</SectionHeading>
          <List>
            <Li><strong>Single</strong> — batter to 1st; runner on 3rd scores; others advance one base.</Li>
            <Li><strong>Double</strong> — batter to 2nd; runners on 2nd/3rd score; runner on 1st to 3rd.</Li>
            <Li><strong>Triple</strong> — batter to 3rd; all runners score.</Li>
            <Li><strong>Home run</strong> — everyone scores.</Li>
            <Li><strong>Walk</strong> — batter to 1st; force advancement only.</Li>
          </List>
        </Section>

        <CloseButton onClick={close}>Got it!</CloseButton>
      </Dialog>
    </>
  );
};

export default InstructionsModal;

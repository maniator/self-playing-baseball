import * as React from "react";
import styled from "styled-components";

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const HelpButton = styled.button`
  background: rgba(47, 63, 105, 0.7);
  color: #aaccff;
  border: 1px solid #4a6090;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;

  &:hover {
    background: rgba(74, 96, 144, 0.9);
    color: #fff;
  }
`;

const Dialog = styled.dialog`
  background: #0d1b2e;
  color: #e0f0ff;
  border: 2px solid #4a6090;
  border-radius: 14px;
  padding: 28px 32px 24px;
  max-width: min(560px, 92vw);
  width: 100%;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;

  &::backdrop {
    background: rgba(0, 0, 0, 0.65);
  }
`;

const DialogTitle = styled.h2`
  margin: 0 0 16px;
  font-size: 18px;
  color: aquamarine;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Section = styled.section`
  margin-bottom: 16px;
`;

const SectionHeading = styled.h3`
  margin: 0 0 6px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #88bbee;
`;

const List = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: #cce0ff;
`;

const Li = styled.li`
  margin-bottom: 4px;
`;

const CloseButton = styled.button`
  display: block;
  margin: 20px auto 0;
  background: aquamarine;
  color: darkblue;
  border: none;
  border-radius: 20px;
  padding: 8px 24px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const InstructionsModal: React.FunctionComponent<{}> = () => {
  const ref = React.useRef<HTMLDialogElement>(null);

  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();

  // Close on backdrop click
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
            <Li>The game lasts 9 innings; home team wins if they lead after the bottom of the 9th.</Li>
            <Li>Walk-off: if the home team takes the lead in the bottom of the 9th+, the game ends immediately.</Li>
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
            <Li>At key moments the game pauses and asks for your decision — steal, bunt, IBB, or count-based choices.</Li>
            <Li>A chime sounds and a browser notification appears (if allowed) when a decision is ready.</Li>
            <Li>A 10-second countdown auto-skips if you don't choose in time.</Li>
            <Li>Steals are only offered when the odds are ≥ 73 %.</Li>
            <Li>IBB is only offered in the 7th inning or later, close game, with 2 outs.</Li>
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
            <Li><strong>Walk / IBB</strong> — batter to 1st; force advancement only.</Li>
          </List>
        </Section>

        <CloseButton onClick={close}>Got it!</CloseButton>
      </Dialog>
    </>
  );
};

export default InstructionsModal;

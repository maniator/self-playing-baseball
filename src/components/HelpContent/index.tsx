import * as React from "react";

import {
  Li,
  List,
  SectionBody,
  SectionDetails,
  SectionSummary,
} from "@components/InstructionsModal/styles";

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Section: React.FunctionComponent<SectionProps> = ({ title, defaultOpen, children }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen ?? false);
  return (
    <SectionDetails open={isOpen} onToggle={(e) => setIsOpen(e.currentTarget.open)}>
      <SectionSummary>{title}</SectionSummary>
      <SectionBody>{children}</SectionBody>
    </SectionDetails>
  );
};

const HelpContent: React.FunctionComponent = () => (
  <>
    <Section title="Basics" defaultOpen>
      <List>
        <Li>
          Press <strong>Play Ball!</strong> to start.
        </Li>
        <Li>The game runs automatically pitch-by-pitch — no clicking needed.</Li>
        <Li>Outcomes are randomized but seeded — same seed always plays out the same way.</Li>
        <Li>3 strikes = out · 4 balls = walk · 3 outs = half-inning over.</Li>
        <Li>
          Home team wins if ahead after the top of the 9th. Walk-off ends the game immediately.
        </Li>
      </List>
    </Section>

    <Section title="Pre-game customization">
      <List>
        <Li>
          Choose your <strong>Away</strong> and <strong>Home</strong> custom teams from the list.
        </Li>
        <Li>
          Under <strong>Manage a team?</strong> pick Home, Away, or None. You can also change this
          after the game starts.
        </Li>
        <Li>
          Expand <strong>▸ Customize Players</strong> to set nicknames, tweak stat presets, and drag
          ⠿ to reorder the batting lineup.
        </Li>
        <Li>
          Enter a <strong>Seed</strong> for a repeatable game, or leave blank for random.
        </Li>
      </List>
    </Section>

    <Section title="Custom Teams">
      <List>
        <Li>
          Click <strong>Manage Teams</strong> to create and edit your own teams with custom players,
          stats, and positions.
        </Li>
        <Li>
          Use <strong>✨ Generate Random</strong> to create a randomized team as a starting point.
          Edit names, stats, and positions to customize it.
        </Li>
        <Li>
          Each team needs at least one lineup player and one pitcher before it can be used in a
          game.
        </Li>
        <Li>
          Pitchers are marked SP (starter), RP (reliever), or SP/RP (swingman). Only RP-eligible
          pitchers can be used for in-game pitching changes.
        </Li>
      </List>
    </Section>

    <Section title="Game Flow">
      <List>
        <Li>The game runs automatically once started — sit back and watch.</Li>
        <Li>Choose Slow / Normal / Fast speed to control the pace.</Li>
        <Li>🔊 slider = play-by-play voice volume · 🔔 slider = chime &amp; fanfare volume.</Li>
      </List>
    </Section>

    <Section title="Manager Mode">
      <List>
        <Li>
          Enable <strong>Manager Mode</strong>, pick which team to manage, and choose a{" "}
          <strong>Strategy</strong> (Balanced, Aggressive, Patient, Contact, or Power).
        </Li>
        <Li>
          The game keeps running between decisions. At key moments it pauses and asks — steal, bunt,
          intentional walk, pinch-hitter, or defensive shift.
        </Li>
        <Li>
          A chime sounds and a browser notification appears (if allowed) when a decision is ready.
        </Li>
        <Li>You have 10 seconds to decide; the game auto-skips if you don&apos;t.</Li>
        <Li>
          Click <strong>🔄 Substitution</strong> to make in-game roster changes: swap a batter from
          the bench or make a pitching change. Pitching changes show how many batters the current
          pitcher has faced (BF). Once a player is substituted out they cannot re-enter.
        </Li>
        <Li>
          The opposing (unmanaged) team makes its own AI decisions — pitching changes when their
          pitcher is tired, etc.
        </Li>
      </List>
    </Section>

    <Section title="Live batting stats">
      <List>
        <Li>
          The <strong>Batting Stats</strong> panel shows AB, H, BB, K, and RBI for every batter.
        </Li>
        <Li>
          Tap or click a batter&apos;s row to see <strong>Player Details</strong> — expanded stats
          appear below the table.
        </Li>
        <Li>The game keeps running while you browse stats.</Li>
      </List>
    </Section>

    <Section title="Saves &amp; Sharing">
      <List>
        <Li>
          Click <strong>💾 Saves</strong> to save, load, export, or import a game. Saves are stored
          locally — no account needed.
        </Li>
        <Li>
          <strong>Export save</strong> downloads a JSON file you can back up or share.{" "}
          <strong>Import save</strong> restores it.
        </Li>
        <Li>
          Click <strong>Share seed</strong> to copy a link. Anyone with it sees the same pitches —
          Manager decisions are yours to replay.
        </Li>
      </List>
    </Section>

    <Section title="Hit types">
      <List>
        <Li>
          <strong>Single</strong> — batter to 1st; runner on 3rd scores; others advance one base.
        </Li>
        <Li>
          <strong>Double</strong> — batter to 2nd; runners on 2nd/3rd score; runner on 1st to 3rd.
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
  </>
);

export default HelpContent;

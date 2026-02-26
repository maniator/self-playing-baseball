import * as React from "react";

import { useNavigate } from "react-router-dom";

/**
 * Standalone help page — renders the same content as InstructionsModal
 * but as a full page accessible from Home without starting a game.
 * InstructionsModal is left unchanged (still used in-game as a dialog).
 */

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Section: React.FunctionComponent<SectionProps> = ({ title, defaultOpen, children }) => (
  <details open={defaultOpen}>
    <summary>{title}</summary>
    <div>{children}</div>
  </details>
);

const HelpPage: React.FunctionComponent = () => {
  const navigate = useNavigate();

  return (
    <div data-testid="help-page">
      <button
        type="button"
        onClick={() => navigate(-1)}
        data-testid="help-page-back-button"
        aria-label="Go back"
      >
        ← Back
      </button>

      <h2>⚾ How to Play</h2>

      <Section title="Basics" defaultOpen>
        <ul>
          <li>
            Press <strong>Play Ball!</strong> to start.
          </li>
          <li>The game runs automatically pitch-by-pitch — no clicking needed.</li>
          <li>Outcomes are randomized but seeded — same seed always plays out the same way.</li>
          <li>3 strikes = out · 4 balls = walk · 3 outs = half-inning over.</li>
          <li>
            Home team wins if ahead after the top of the 9th. Walk-off ends the game immediately.
          </li>
        </ul>
      </Section>

      <Section title="Pre-game customization">
        <ul>
          <li>
            Choose a <strong>Matchup</strong> type (MLB: AL vs AL, NL vs NL, or Interleague) or{" "}
            <strong>Custom</strong> to use your own teams. Select Home and Away teams.
          </li>
          <li>
            Under <strong>Manage a team?</strong> pick Home, Away, or None. You can also change this
            after the game starts.
          </li>
          <li>
            Expand <strong>▸ Customize Players</strong> to set nicknames, tweak stat presets, and
            drag ⠿ to reorder the batting lineup — for both teams (MLB games only).
          </li>
          <li>
            Enter a <strong>Seed</strong> for a repeatable game, or leave blank for random.
          </li>
        </ul>
      </Section>

      <Section title="Custom Teams">
        <ul>
          <li>
            Click <strong>Manage Teams</strong> to create and edit your own teams with custom
            players, stats, and positions.
          </li>
          <li>
            Use <strong>✨ Generate Random</strong> to create a randomized team as a starting point.
            Edit names, stats, and positions to customize it.
          </li>
          <li>
            Each team needs at least one lineup player and one pitcher before it can be used in a
            game.
          </li>
          <li>
            Pitchers are marked SP (starter), RP (reliever), or SP/RP (swingman). Only RP-eligible
            pitchers can be used for in-game pitching changes.
          </li>
        </ul>
      </Section>

      <Section title="Game Flow">
        <ul>
          <li>The game runs automatically once started — sit back and watch.</li>
          <li>Choose Slow / Normal / Fast speed to control the pace.</li>
          <li>🔊 slider = play-by-play voice volume · 🔔 slider = chime &amp; fanfare volume.</li>
        </ul>
      </Section>

      <Section title="Manager Mode">
        <ul>
          <li>
            Enable <strong>Manager Mode</strong>, pick which team to manage, and choose a{" "}
            <strong>Strategy</strong> (Balanced, Aggressive, Patient, Contact, or Power).
          </li>
          <li>
            The game keeps running between decisions. At key moments it pauses and asks — steal,
            bunt, intentional walk, pinch-hitter, or defensive shift.
          </li>
          <li>
            A chime sounds and a browser notification appears (if allowed) when a decision is ready.
          </li>
          <li>You have 10 seconds to decide; the game auto-skips if you don&apos;t.</li>
          <li>
            Click <strong>🔄 Substitution</strong> to make in-game roster changes: swap a batter
            from the bench or make a pitching change. Pitching changes show how many batters the
            current pitcher has faced (BF). Once a player is substituted out they cannot re-enter.
          </li>
          <li>
            The opposing (unmanaged) team makes its own AI decisions — pitching changes when their
            pitcher is tired, etc.
          </li>
        </ul>
      </Section>

      <Section title="Live batting stats">
        <ul>
          <li>
            The <strong>Batting Stats</strong> panel shows AB, H, BB, K, and RBI for every batter.
          </li>
          <li>
            Tap or click a batter&apos;s row to see <strong>Player Details</strong> — expanded stats
            appear below the table.
          </li>
          <li>The game keeps running while you browse stats.</li>
        </ul>
      </Section>

      <Section title="Saves &amp; Sharing">
        <ul>
          <li>
            Click <strong>💾 Saves</strong> to save, load, export, or import a game. Saves are
            stored locally — no account needed.
          </li>
          <li>
            <strong>Export save</strong> downloads a JSON file you can back up or share.{" "}
            <strong>Import save</strong> restores it.
          </li>
          <li>
            Click <strong>Share seed</strong> to copy a link. Anyone with it sees the same pitches —
            Manager decisions are yours to replay.
          </li>
        </ul>
      </Section>

      <Section title="Hit types">
        <ul>
          <li>
            <strong>Single</strong> — batter to 1st; runner on 3rd scores; others advance one base.
          </li>
          <li>
            <strong>Double</strong> — batter to 2nd; runners on 2nd/3rd score; runner on 1st to 3rd.
          </li>
          <li>
            <strong>Triple</strong> — batter to 3rd; all runners score.
          </li>
          <li>
            <strong>Home run</strong> — everyone scores.
          </li>
          <li>
            <strong>Walk</strong> — batter to 1st; force advancement only.
          </li>
        </ul>
      </Section>
    </div>
  );
};

export default HelpPage;

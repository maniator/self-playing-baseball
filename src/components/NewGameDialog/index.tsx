import * as React from "react";

import type { TeamCustomPlayerOverrides } from "@context/index";
import { getSeed, reinitSeed } from "@utils/rng";

import PlayerCustomizationPanel from "./PlayerCustomizationPanel";
import {
  Dialog,
  Divider,
  FieldGroup,
  FieldLabel,
  Input,
  PlayBallButton,
  RadioLabel,
  ResumeButton,
  SectionLabel,
  SeedHint,
  Select,
  Title,
} from "./styles";
import { usePlayerCustomization } from "./usePlayerCustomization";
import { useTeamSelection } from "./useTeamSelection";

export { DEFAULT_AL_TEAM, DEFAULT_NL_TEAM } from "./constants";

type ManagedTeam = 0 | 1 | null;

export type PlayerOverrides = {
  away: TeamCustomPlayerOverrides;
  home: TeamCustomPlayerOverrides;
  awayOrder: string[];
  homeOrder: string[];
};

type Props = {
  onStart: (
    homeTeam: string,
    awayTeam: string,
    managedTeam: ManagedTeam,
    playerOverrides: PlayerOverrides,
  ) => void;
  autoSaveName?: string;
  onResume?: () => void;
};

const NewGameDialog: React.FunctionComponent<Props> = ({ onStart, autoSaveName, onResume }) => {
  const ref = React.useRef<HTMLDialogElement>(null);
  const [managed, setManaged] = React.useState<"none" | "0" | "1">("none");
  // Pre-fill with the current seed so it's visible and shareable at a glance.
  const [seedInput, setSeedInput] = React.useState(() => getSeed()?.toString(36) ?? "");

  React.useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);

  const { mode, homeLeague, home, setHome, away, setAway, homeList, awayList, handleModeChange, handleHomeLeagueChange } = useTeamSelection(); // prettier-ignore
  const { homeOverrides, setHomeOverrides, awayOverrides, setAwayOverrides, homeOrder, setHomeOrder, awayOrder, setAwayOrder } = usePlayerCustomization(home, away); // prettier-ignore

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Apply the seed before game state is initialized; updates URL too.
    reinitSeed(seedInput.trim());
    const mt: ManagedTeam = managed === "none" ? null : (Number(managed) as 0 | 1);
    onStart(home, away, mt, { away: awayOverrides, home: homeOverrides, awayOrder, homeOrder });
    ref.current?.close();
  };

  return (
    <Dialog ref={ref} onCancel={(e) => e.preventDefault()} data-testid="new-game-dialog">
      <Title>⚾ New Game</Title>
      {onResume && autoSaveName && (
        <>
          <ResumeButton type="button" onClick={onResume}>
            ▶ Resume: {autoSaveName}
          </ResumeButton>
          <Divider>— or start a new game —</Divider>
        </>
      )}
      <form onSubmit={handleSubmit}>
        <FieldGroup data-testid="matchup-mode-select">
          <SectionLabel>Matchup</SectionLabel>
          {(
            [
              ["al", "AL vs AL"],
              ["nl", "NL vs NL"],
              ["interleague", "Interleague"],
            ] as const
          ).map(([v, label]) => (
            <RadioLabel key={v}>
              <input
                type="radio"
                name="mode"
                value={v}
                checked={mode === v}
                onChange={() => handleModeChange(v)}
              />
              {label}
            </RadioLabel>
          ))}
        </FieldGroup>
        {mode === "interleague" && (
          <FieldGroup>
            <SectionLabel>Home team league</SectionLabel>
            {(
              [
                ["al", "AL"],
                ["nl", "NL"],
              ] as const
            ).map(([v, label]) => (
              <RadioLabel key={v}>
                <input
                  type="radio"
                  name="homeLeague"
                  value={v}
                  checked={homeLeague === v}
                  onChange={() => handleHomeLeagueChange(v)}
                />
                {label}
              </RadioLabel>
            ))}
          </FieldGroup>
        )}
        <FieldGroup>
          <FieldLabel htmlFor="ng-home">Home team</FieldLabel>
          <Select
            id="ng-home"
            data-testid="home-team-select"
            value={home}
            onChange={(e) => setHome(e.target.value)}
          >
            {homeList.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup>
          <FieldLabel htmlFor="ng-away">Away team</FieldLabel>
          <Select
            id="ng-away"
            data-testid="away-team-select"
            value={away}
            onChange={(e) => setAway(e.target.value)}
          >
            {awayList.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup>
          <SectionLabel>Manage a team?</SectionLabel>
          {(["none", "0", "1"] as const).map((v) => (
            <RadioLabel key={v}>
              <input
                type="radio"
                name="managed"
                value={v}
                checked={managed === v}
                onChange={() => setManaged(v)}
              />
              {v === "none" ? "None — just watch" : v === "0" ? `Away (${away})` : `Home (${home})`}
            </RadioLabel>
          ))}
        </FieldGroup>
        <PlayerCustomizationPanel
          awayTeam={away}
          homeTeam={home}
          awayOverrides={awayOverrides}
          homeOverrides={homeOverrides}
          onAwayChange={setAwayOverrides}
          onHomeChange={setHomeOverrides}
          awayOrder={awayOrder}
          homeOrder={homeOrder}
          onAwayOrderChange={setAwayOrder}
          onHomeOrderChange={setHomeOrder}
        />
        <FieldGroup>
          <FieldLabel htmlFor="ng-seed">Seed</FieldLabel>
          <Input
            id="ng-seed"
            type="text"
            data-testid="seed-input"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            placeholder="random"
            autoComplete="off"
            spellCheck={false}
          />
          <SeedHint>
            Leave blank for a random game. Share the URL after starting to replay.
          </SeedHint>
        </FieldGroup>
        <PlayBallButton type="submit" data-testid="play-ball-button">
          Play Ball!
        </PlayBallButton>
      </form>
    </Dialog>
  );
};

export default NewGameDialog;

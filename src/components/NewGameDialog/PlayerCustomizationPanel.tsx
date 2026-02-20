import * as React from "react";

import type { PlayerCustomization, TeamCustomPlayerOverrides } from "@context/index";
import { generateRoster } from "@utils/roster";

import {
  ModInput,
  ModLabel,
  NicknameInput,
  PanelSection,
  PanelToggle,
  PitcherRow,
  PlayerList,
  PlayerRow,
  PosTag,
  Tab,
  TabBar,
} from "./styles";

const MOD_MIN = -20;
const MOD_MAX = 20;

type Props = {
  awayTeam: string;
  homeTeam: string;
  awayOverrides: TeamCustomPlayerOverrides;
  homeOverrides: TeamCustomPlayerOverrides;
  onAwayChange: (overrides: TeamCustomPlayerOverrides) => void;
  onHomeChange: (overrides: TeamCustomPlayerOverrides) => void;
};

const clampMod = (val: number) => Math.max(MOD_MIN, Math.min(MOD_MAX, Math.round(val)));

const PlayerCustomizationPanel: React.FunctionComponent<Props> = ({
  awayTeam,
  homeTeam,
  awayOverrides,
  homeOverrides,
  onAwayChange,
  onHomeChange,
}) => {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"away" | "home">("away");

  const awayRoster = React.useMemo(() => generateRoster(awayTeam), [awayTeam]);
  const homeRoster = React.useMemo(() => generateRoster(homeTeam), [homeTeam]);

  const activeRoster = activeTab === "away" ? awayRoster : homeRoster;
  const activeOverrides = activeTab === "away" ? awayOverrides : homeOverrides;
  const onActiveChange = activeTab === "away" ? onAwayChange : onHomeChange;

  const updateField = (playerId: string, field: keyof PlayerCustomization, raw: string) => {
    const current = activeOverrides[playerId] ?? {};
    let value: string | number | undefined;
    if (field === "nickname") {
      value = raw || undefined;
    } else {
      const n = parseInt(raw, 10);
      value = isNaN(n) ? undefined : clampMod(n);
    }
    const updated: PlayerCustomization = { ...current, [field]: value };
    onActiveChange({ ...activeOverrides, [playerId]: updated });
  };

  const getNum = (playerId: string, field: keyof PlayerCustomization): string => {
    const v = activeOverrides[playerId]?.[field];
    return v === undefined ? "0" : String(v);
  };

  const getNick = (playerId: string): string =>
    (activeOverrides[playerId]?.nickname as string | undefined) ?? "";

  const allPlayers = [...activeRoster.batters, activeRoster.pitcher];

  return (
    <PanelSection>
      <PanelToggle type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "▾" : "▸"} Customize Players
      </PanelToggle>
      {open && (
        <>
          <TabBar>
            <Tab $active={activeTab === "away"} type="button" onClick={() => setActiveTab("away")}>
              Away: {awayTeam}
            </Tab>
            <Tab $active={activeTab === "home"} type="button" onClick={() => setActiveTab("home")}>
              Home: {homeTeam}
            </Tab>
          </TabBar>
          <PlayerList>
            {allPlayers.map((player) =>
              player.isPitcher ? (
                <React.Fragment key={player.id}>
                  <PitcherRow>
                    <PosTag>{player.position}</PosTag>
                    <NicknameInput
                      type="text"
                      placeholder="Nickname"
                      maxLength={20}
                      value={getNick(player.id)}
                      onChange={(e) => updateField(player.id, "nickname", e.target.value)}
                      aria-label={`${player.position} nickname`}
                    />
                    {(["controlMod", "velocityMod", "staminaMod"] as const).map((field, i) => (
                      <ModLabel key={field}>
                        {["CTL", "VEL", "STM"][i]}
                        <ModInput
                          type="number"
                          min={MOD_MIN}
                          max={MOD_MAX}
                          value={getNum(player.id, field)}
                          onChange={(e) => updateField(player.id, field, e.target.value)}
                          aria-label={`${player.position} ${["CTL", "VEL", "STM"][i]}`}
                        />
                      </ModLabel>
                    ))}
                  </PitcherRow>
                </React.Fragment>
              ) : (
                <PlayerRow key={player.id}>
                  <PosTag>{player.position}</PosTag>
                  <NicknameInput
                    type="text"
                    placeholder="Nickname"
                    maxLength={20}
                    value={getNick(player.id)}
                    onChange={(e) => updateField(player.id, "nickname", e.target.value)}
                    aria-label={`${player.position} nickname`}
                  />
                  {(["contactMod", "powerMod", "speedMod"] as const).map((field, i) => (
                    <ModLabel key={field}>
                      {["CNT", "PWR", "SPD"][i]}
                      <ModInput
                        type="number"
                        min={MOD_MIN}
                        max={MOD_MAX}
                        value={getNum(player.id, field)}
                        onChange={(e) => updateField(player.id, field, e.target.value)}
                        aria-label={`${player.position} ${["CNT", "PWR", "SPD"][i]}`}
                      />
                    </ModLabel>
                  ))}
                </PlayerRow>
              ),
            )}
          </PlayerList>
        </>
      )}
    </PanelSection>
  );
};

export default PlayerCustomizationPanel;

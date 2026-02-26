import * as React from "react";

import {
  customTeamToBenchRoster,
  customTeamToDisplayName,
  customTeamToGameId,
  customTeamToLineupOrder,
  customTeamToPitcherRoster,
  customTeamToPlayerOverrides,
  validateCustomTeamForGame,
} from "@features/customTeams/adapters/customTeamAdapter";

import type { ExhibitionGameSetup } from "@components/AppShell";
import { getSpEligiblePitchers } from "@components/NewGameDialog";
import { usePlayerCustomization } from "@components/NewGameDialog/usePlayerCustomization";
import { useTeamSelection } from "@components/NewGameDialog/useTeamSelection";
import { useCustomTeams } from "@hooks/useCustomTeams";
import { getSeed, reinitSeed } from "@utils/rng";

export type GameType = "mlb" | "custom";
type ManagedTeam = 0 | 1 | null;

/** All state, derived values, and the submit handler for ExhibitionSetupPage. */
export const useExhibitionSetup = (onStartGame: (setup: ExhibitionGameSetup) => void) => {
  const [gameType, setGameType] = React.useState<GameType>("custom");
  const [managed, setManaged] = React.useState<"none" | "0" | "1">("none");
  const [seedInput, setSeedInput] = React.useState(() => getSeed()?.toString(36) ?? "");
  const [teamValidationError, setTeamValidationError] = React.useState<string>("");

  const teamSelection = useTeamSelection();
  const { home, away } = teamSelection;
  const playerCustomization = usePlayerCustomization(home, away);

  const { teams: customTeams } = useCustomTeams();
  const [customAwayId, setCustomAwayId] = React.useState<string>("");
  const [customHomeId, setCustomHomeId] = React.useState<string>("");

  React.useEffect(() => {
    if (customTeams.length === 0) return;
    const ids = customTeams.map((t) => t.id);
    if (!customAwayId || !ids.includes(customAwayId)) setCustomAwayId(customTeams[0].id);
    if (!customHomeId || !ids.includes(customHomeId))
      setCustomHomeId(customTeams[customTeams.length > 1 ? 1 : 0].id);
  }, [customTeams, customAwayId, customHomeId]);

  const awayDoc = customTeams.find((t) => t.id === customAwayId);
  const homeDoc = customTeams.find((t) => t.id === customHomeId);
  const awaySpPitchers = getSpEligiblePitchers(awayDoc?.roster?.pitchers ?? []);
  const homeSpPitchers = getSpEligiblePitchers(homeDoc?.roster?.pitchers ?? []);

  const [awayStarterIdx, setAwayStarterIdx] = React.useState<number>(0);
  const [homeStarterIdx, setHomeStarterIdx] = React.useState<number>(0);

  React.useEffect(() => {
    const doc = customTeams.find((t) => t.id === customAwayId);
    setAwayStarterIdx(getSpEligiblePitchers(doc?.roster?.pitchers ?? [])[0]?.idx ?? 0);
  }, [customAwayId, customTeams]);

  React.useEffect(() => {
    const doc = customTeams.find((t) => t.id === customHomeId);
    setHomeStarterIdx(getSpEligiblePitchers(doc?.roster?.pitchers ?? [])[0]?.idx ?? 0);
  }, [customHomeId, customTeams]);

  React.useEffect(() => {
    setTeamValidationError("");
  }, [customAwayId, customHomeId, gameType]);

  // Reuse already-computed docs — avoids redundant list scans on every render.
  const awayLabel =
    gameType === "custom" ? (awayDoc ? customTeamToDisplayName(awayDoc) : "Away") : away;
  const homeLabel =
    gameType === "custom" ? (homeDoc ? customTeamToDisplayName(homeDoc) : "Home") : home;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reinitSeed(seedInput.trim());
    const mt: ManagedTeam = managed === "none" ? null : (Number(managed) as 0 | 1);

    if (gameType === "custom") {
      if (!awayDoc || !homeDoc) {
        setTeamValidationError(
          customTeams.length === 0
            ? "Create at least two custom teams before starting a custom exhibition."
            : "Select valid away and home custom teams before starting the game.",
        );
        return;
      }

      if (customAwayId === customHomeId) {
        setTeamValidationError(
          "Away and home teams must be different — choose two different teams.",
        );
        return;
      }

      const awayError = validateCustomTeamForGame(awayDoc);
      if (awayError) {
        setTeamValidationError(`Away team — ${awayError}`);
        return;
      }
      const homeError = validateCustomTeamForGame(homeDoc);
      if (homeError) {
        setTeamValidationError(`Home team — ${homeError}`);
        return;
      }

      if (mt !== null) {
        const managedSpPitchers = mt === 0 ? awaySpPitchers : homeSpPitchers;
        const managedLabel = mt === 0 ? awayLabel : homeLabel;
        if (managedSpPitchers.length === 0) {
          setTeamValidationError(
            `${managedLabel} has no SP-eligible pitchers. Add at least one SP or SP/RP pitcher to start a managed game.`,
          );
          return;
        }
      }

      setTeamValidationError("");
      onStartGame({
        homeTeam: customTeamToGameId(homeDoc),
        awayTeam: customTeamToGameId(awayDoc),
        managedTeam: mt,
        playerOverrides: {
          away: customTeamToPlayerOverrides(awayDoc),
          home: customTeamToPlayerOverrides(homeDoc),
          awayOrder: customTeamToLineupOrder(awayDoc),
          homeOrder: customTeamToLineupOrder(homeDoc),
          awayBench: customTeamToBenchRoster(awayDoc),
          homeBench: customTeamToBenchRoster(homeDoc),
          awayPitchers: customTeamToPitcherRoster(awayDoc),
          homePitchers: customTeamToPitcherRoster(homeDoc),
          startingPitcherIdx:
            mt !== null
              ? [
                  awaySpPitchers.find((p) => p.idx === awayStarterIdx)?.idx ?? 0,
                  homeSpPitchers.find((p) => p.idx === homeStarterIdx)?.idx ?? 0,
                ]
              : undefined,
        },
      });
    } else {
      const { awayOverrides, homeOverrides, awayOrder, homeOrder } = playerCustomization;
      onStartGame({
        homeTeam: home,
        awayTeam: away,
        managedTeam: mt,
        playerOverrides: { away: awayOverrides, home: homeOverrides, awayOrder, homeOrder },
      });
    }
  };

  return {
    gameType,
    setGameType,
    managed,
    setManaged,
    seedInput,
    setSeedInput,
    teamValidationError,
    teamSelection,
    playerCustomization,
    customTeams,
    customAwayId,
    setCustomAwayId,
    customHomeId,
    setCustomHomeId,
    awayDoc,
    homeDoc,
    awaySpPitchers,
    homeSpPitchers,
    awayStarterIdx,
    setAwayStarterIdx,
    homeStarterIdx,
    setHomeStarterIdx,
    awayLabel,
    homeLabel,
    handleSubmit,
  };
};

import type { ModPreset } from "@context/index";

export type { ModPreset } from "@context/index";

export const DEFAULT_AL_TEAM = "New York Yankees";
export const DEFAULT_NL_TEAM = "New York Mets";

export const MOD_OPTIONS: ReadonlyArray<{ readonly label: string; readonly value: ModPreset }> = [
  { label: "Elite", value: 20 },
  { label: "High", value: 10 },
  { label: "Above", value: 5 },
  { label: "Avg", value: 0 },
  { label: "Below", value: -5 },
  { label: "Low", value: -10 },
  { label: "Poor", value: -20 },
];

export const BATTER_MOD_FIELDS = ["contactMod", "powerMod", "speedMod"] as const;
export const PITCHER_MOD_FIELDS = ["controlMod", "velocityMod", "staminaMod"] as const;
export const BATTER_STAT_LABELS = ["CON", "PWR", "SPD"] as const;
export const PITCHER_STAT_LABELS = ["CTL", "VEL", "STM"] as const;

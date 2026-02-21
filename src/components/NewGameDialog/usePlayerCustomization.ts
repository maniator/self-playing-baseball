import * as React from "react";

import type { TeamCustomPlayerOverrides } from "@context/index";
import { generateRoster } from "@utils/roster";

const defaultOrder = (teamName: string) => generateRoster(teamName).batters.map((b) => b.id);

export type UsePlayerCustomizationReturn = {
  homeOverrides: TeamCustomPlayerOverrides;
  setHomeOverrides: React.Dispatch<React.SetStateAction<TeamCustomPlayerOverrides>>;
  awayOverrides: TeamCustomPlayerOverrides;
  setAwayOverrides: React.Dispatch<React.SetStateAction<TeamCustomPlayerOverrides>>;
  homeOrder: string[];
  setHomeOrder: React.Dispatch<React.SetStateAction<string[]>>;
  awayOrder: string[];
  setAwayOrder: React.Dispatch<React.SetStateAction<string[]>>;
};

export function usePlayerCustomization(home: string, away: string): UsePlayerCustomizationReturn {
  const [homeOverrides, setHomeOverrides] = React.useState<TeamCustomPlayerOverrides>({});
  const [awayOverrides, setAwayOverrides] = React.useState<TeamCustomPlayerOverrides>({});
  const [homeOrder, setHomeOrder] = React.useState<string[]>(() => defaultOrder(home));
  const [awayOrder, setAwayOrder] = React.useState<string[]>(() => defaultOrder(away));

  // Reset overrides and lineup order when the selected team changes
  const prevHome = React.useRef(home);
  const prevAway = React.useRef(away);

  React.useEffect(() => {
    if (prevHome.current !== home) {
      setHomeOverrides({});
      setHomeOrder(defaultOrder(home));
      prevHome.current = home;
    }
  }, [home]);

  React.useEffect(() => {
    if (prevAway.current !== away) {
      setAwayOverrides({});
      setAwayOrder(defaultOrder(away));
      prevAway.current = away;
    }
  }, [away]);

  return {
    homeOverrides,
    setHomeOverrides,
    awayOverrides,
    setAwayOverrides,
    homeOrder,
    setHomeOrder,
    awayOrder,
    setAwayOrder,
  };
}

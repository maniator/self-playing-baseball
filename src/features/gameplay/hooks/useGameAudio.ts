import * as React from "react";

import { LogAction } from "@feat/gameplay/context/index";
import { play7thInningStretch, playVictoryFanfare } from "@feat/gameplay/utils/announce";

/**
 * Plays audio for special game moments: 7th inning stretch and victory fanfare.
 * No longer manages pause state — the scheduler handles that internally.
 */
export const useGameAudio = (
  inning: number,
  atBat: number,
  gameOver: boolean,
  dispatchLog: (action: LogAction) => void,
): void => {
  const log = React.useCallback(
    (msg: string) => dispatchLog({ type: "log", payload: msg }),
    [dispatchLog],
  );

  const prevInningSignatureRef = React.useRef(`${inning}-${atBat}`);

  React.useEffect(() => {
    const sig = `${inning}-${atBat}`;
    if (sig !== prevInningSignatureRef.current) {
      prevInningSignatureRef.current = sig;
      if (inning === 7 && atBat === 1) {
        log("⚾ Seventh inning stretch! Take me out to the ball game!");
        play7thInningStretch();
      }
    }
  }, [inning, atBat, log]);

  const prevGameOverRef = React.useRef(gameOver);
  React.useEffect(() => {
    if (!prevGameOverRef.current && gameOver) {
      playVictoryFanfare();
    }
    prevGameOverRef.current = gameOver;
  }, [gameOver]);
};

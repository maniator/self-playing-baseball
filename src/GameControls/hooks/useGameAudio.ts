import * as React from "react";
import { playVictoryFanfare, play7thInningStretch } from "../../utilities/announce";

/**
 * Handles between-inning pause detection and victory fanfare.
 * Returns betweenInningsPauseRef, which the auto-play scheduler reads
 * to insert a brief hold when muted at half-inning transitions.
 */
export const useGameAudio = (
  inning: number,
  atBat: number,
  gameOver: boolean,
  dispatchLog: Function,
): React.MutableRefObject<boolean> => {
  const log = (msg: string) => dispatchLog({ type: "log", payload: msg });

  const betweenInningsPauseRef = React.useRef(false);
  const prevInningSignatureRef = React.useRef(`${inning}-${atBat}`);

  React.useEffect(() => {
    const sig = `${inning}-${atBat}`;
    if (sig !== prevInningSignatureRef.current) {
      betweenInningsPauseRef.current = true;
      prevInningSignatureRef.current = sig;
      if (inning === 7 && atBat === 1) {
        log("⚾ Seventh inning stretch! Take me out to the ball game!");
        play7thInningStretch();
      }
    }
  }, [inning, atBat]);

  const prevGameOverRef = React.useRef(gameOver);
  React.useEffect(() => {
    if (!prevGameOverRef.current && gameOver) {
      playVictoryFanfare();
    }
    prevGameOverRef.current = gameOver;
  }, [gameOver]);

  return betweenInningsPauseRef;
};

import * as React from "react";

import styled from "styled-components";
import { ContextValue, GameContext, Strategy, State } from "../Context";
import { detectDecision } from "../Context/reducer";
import { Hit } from "../constants/hitTypes";
import getRandomInt from "../utilities/getRandomInt";
import { cancelAnnouncements, setMuted } from "../utilities/announce";
import { buildReplayUrl } from "../utilities/rng";
import DecisionPanel from "../DecisionPanel";

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const Button = styled.button`
  background: aquamarine;
  color: darkblue;
  padding: 12px 18px;
  border-radius: 30px;
  cursor: pointer;
  border: none;
  font-family: inherit;
  font-size: 14px;
`;

const ShareButton = styled(Button)`
  background: #2f3f69;
  color: #fff;
`;

const AutoPlayGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  background: rgba(47, 63, 105, 0.5);
  border-radius: 10px;
  padding: 5px 10px;
`;

const ToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;

  & input[type="checkbox"] {
    accent-color: aquamarine;
    cursor: pointer;
    width: 14px;
    height: 14px;
  }
`;

const Select = styled.select`
  background: #1a2440;
  border: 1px solid #4a6090;
  color: #fff;
  border-radius: 8px;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
`;

const SPEED_SLOW = 1200;
const SPEED_NORMAL = 700;
const SPEED_FAST = 350;

function loadBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === "true";
}

function loadInt(key: string, fallback: number): number {
  const v = localStorage.getItem(key);
  return v === null ? fallback : parseInt(v, 10);
}

function loadString<T extends string>(key: string, fallback: T): T {
  const v = localStorage.getItem(key);
  return v === null ? fallback : (v as T);
}

const outfield = {
  [Hit.Homerun]: "over the fence!",
  [Hit.Triple]: "to the back wall",
  [Hit.Double]: "to center",
  [Hit.Single]: "to an empty area of the field"
};

const BatterButton: React.FunctionComponent<{}> = () => {
  const { dispatch, dispatchLog, strikes, balls, baseLayout, outs, inning, score, atBat, pendingDecision, gameOver, onePitchModifier, teams }: ContextValue = React.useContext(GameContext);
  const [autoPlay, setAutoPlay] = React.useState(() => loadBool("autoPlay", false));
  const [speed, setSpeed] = React.useState(() => loadInt("speed", SPEED_NORMAL));
  const [muted, setMutedState] = React.useState(() => loadBool("muted", false));
  const [managerMode, setManagerMode] = React.useState(() => loadBool("managerMode", false));
  const [strategy, setStrategy] = React.useState<Strategy>(() => loadString<Strategy>("strategy", "balanced"));
  const [managedTeam, setManagedTeam] = React.useState<0 | 1>(() => (loadInt("managedTeam", 0) === 1 ? 1 : 0));

  // Tracks the mute state that was active before autoplay started, so we can
  // restore it when autoplay is turned off (even if the user toggled mute mid-play).
  const previousMuteRef = React.useRef<boolean | null>(null);

  const log = (message: string) => dispatchLog({ type: "log", payload: message });

  // Keep a ref so the autoplay interval always uses the latest strikes value
  const strikesRef = React.useRef(strikes);
  strikesRef.current = strikes;

  // Keep refs for values used inside the interval callback
  const managerModeRef = React.useRef(managerMode);
  managerModeRef.current = managerMode;

  const strategyRef = React.useRef(strategy);
  strategyRef.current = strategy;

  const managedTeamRef = React.useRef(managedTeam);
  managedTeamRef.current = managedTeam;

  const gameStateRef = React.useRef({ strikes, balls, baseLayout, outs, inning, score, atBat, pendingDecision, gameOver, onePitchModifier, teams });
  gameStateRef.current = { strikes, balls, baseLayout, outs, inning, score, atBat, pendingDecision, gameOver, onePitchModifier, teams };

  // After a decision is resolved (pending → null), skip detection for the very next pitch
  const skipDecisionRef = React.useRef(false);
  const prevPendingDecision = React.useRef(pendingDecision);
  React.useEffect(() => {
    if (prevPendingDecision.current !== null && pendingDecision === null) {
      skipDecisionRef.current = true;
    }
    prevPendingDecision.current = pendingDecision;
  }, [pendingDecision]);

  const handleClickButton = React.useCallback(() => {
    const currentState = gameStateRef.current;

    // Don't pitch if game is over
    if (currentState.gameOver) return;

    // If there's a pending decision, don't auto-pitch — wait for user action
    if (managerModeRef.current && currentState.pendingDecision) return;

    // In manager mode, detect decision points only when the managed team is at bat
    if (managerModeRef.current && !skipDecisionRef.current && currentState.atBat === managedTeamRef.current) {
      const decision = detectDecision(
        currentState as State,
        strategyRef.current,
        true
      );
      if (decision) {
        dispatch({ type: "set_pending_decision", payload: decision });
        return;
      }
    }
    // Reset skip flag — we're about to pitch (with or without a modifier)
    skipDecisionRef.current = false;

    const random = getRandomInt(1000);
    const currentStrikes = strikesRef.current;

    cancelAnnouncements();

    // Apply "protect" one-pitch modifier (0-2 count): reduce swing rate → more contact
    const protectBonus = currentState.onePitchModifier === "protect" ? 0.7 : 1;
    // Apply strategy swing rate modifier
    const contactMod = strategyRef.current === "contact" ? 1.15 : strategyRef.current === "power" ? 0.9 : 1;
    const swingRate = Math.round((500 - (75 * currentStrikes)) * contactMod * protectBonus);

    if (random < swingRate) {
      dispatch({ type: "strike" });
    } else if (random < 880) {
      dispatch({ type: "wait", payload: { strategy: strategyRef.current } });
    } else {
      // Apply strategy to hit type probabilities
      const strat = strategyRef.current;
      const hitRoll = getRandomInt(100);
      let base: Hit;
      if (strat === "power") {
        base = hitRoll < 30 ? Hit.Homerun : hitRoll < 50 ? Hit.Triple : hitRoll < 70 ? Hit.Double : Hit.Single;
      } else if (strat === "contact") {
        base = hitRoll < 5 ? Hit.Homerun : hitRoll < 15 ? Hit.Triple : hitRoll < 35 ? Hit.Double : Hit.Single;
      } else {
        base = getRandomInt(4) as Hit;
      }
      log(`Player hit the ball ${outfield[base]}!`);
      dispatch({ type: "hit", payload: { hitType: base, strategy: strat } });
    }
  }, [dispatch, dispatchLog]);

  // Stable ref so the interval always calls the latest handler without stale closures
  const handleClickRef = React.useRef(handleClickButton);
  handleClickRef.current = handleClickButton;

  // Auto-play interval — restarts when enabled or speed changes; pauses when pendingDecision in manager mode
  React.useEffect(() => {
    if (!autoPlay) return;
    if (pendingDecision && managerMode) {
      // Paused — no interval
      return;
    }
    const id = setInterval(() => handleClickRef.current(), speed);
    return () => clearInterval(id);
  }, [autoPlay, speed, pendingDecision, managerMode]);

  // Persist settings to localStorage
  React.useEffect(() => { localStorage.setItem("autoPlay", String(autoPlay)); }, [autoPlay]);
  React.useEffect(() => { localStorage.setItem("speed", String(speed)); }, [speed]);
  React.useEffect(() => { localStorage.setItem("muted", String(muted)); }, [muted]);
  React.useEffect(() => { localStorage.setItem("managerMode", String(managerMode)); }, [managerMode]);
  React.useEffect(() => { localStorage.setItem("strategy", strategy); }, [strategy]);
  React.useEffect(() => { localStorage.setItem("managedTeam", String(managedTeam)); }, [managedTeam]);

  // Sync mute state into the announce module
  React.useEffect(() => { setMuted(muted); }, [muted]);

  const handlePitch = React.useCallback((event: KeyboardEvent) => {
    if ((event.target as HTMLInputElement).type !== "text") {
      handleClickRef.current();
    }
  }, []);

  React.useEffect(() => {
    window.addEventListener("keyup", handlePitch, false);
    return () => window.removeEventListener("keyup", handlePitch, false);
  }, [handlePitch]);

  const handleManagerModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setManagerMode(enabled);
    if (enabled && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const handleAutoPlayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setAutoPlay(enabled);
    if (enabled) {
      // Save whatever mute state the user had, then auto-mute for autoplay.
      previousMuteRef.current = muted;
      if (!muted) {
        setMutedState(true);
      }
    } else {
      // Restore the mute state the user had before autoplay started.
      if (previousMuteRef.current !== null) {
        setMutedState(previousMuteRef.current);
        previousMuteRef.current = null;
      }
    }
  };

  const handleMuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMutedState(e.target.checked);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSpeed(parseInt(e.target.value, 10));
  };

  const handleShareReplay = () => {
    const url = buildReplayUrl();
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => log("Replay link copied!"))
        .catch(() => window.prompt("Copy this replay link:", url));
    } else {
      window.prompt("Copy this replay link:", url);
    }
  };

  return (
    <>
      <Controls>
        <Button onClick={handleClickButton} disabled={gameOver}>Batter Up!</Button>
        <ShareButton onClick={handleShareReplay}>Share replay</ShareButton>
        <AutoPlayGroup>
          <ToggleLabel>
            <input type="checkbox" checked={autoPlay} onChange={handleAutoPlayChange} />
            Auto-play
          </ToggleLabel>
          <ToggleLabel>
            Speed
            <Select value={speed} onChange={handleSpeedChange}>
              <option value={SPEED_SLOW}>Slow</option>
              <option value={SPEED_NORMAL}>Normal</option>
              <option value={SPEED_FAST}>Fast</option>
            </Select>
          </ToggleLabel>
          <ToggleLabel>
            <input type="checkbox" checked={muted} onChange={handleMuteChange} />
            Mute
          </ToggleLabel>
          <ToggleLabel>
            <input type="checkbox" checked={managerMode} onChange={handleManagerModeChange} />
            Manager Mode
          </ToggleLabel>
          {managerMode && (
            <>
              <ToggleLabel>
                Team
                <Select value={managedTeam} onChange={e => setManagedTeam(Number(e.target.value) === 1 ? 1 : 0)}>
                  <option value={0}>{teams[0]}</option>
                  <option value={1}>{teams[1]}</option>
                </Select>
              </ToggleLabel>
              <ToggleLabel>
                Strategy
                <Select value={strategy} onChange={e => setStrategy(e.target.value as Strategy)}>
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">Aggressive</option>
                  <option value="patient">Patient</option>
                  <option value="contact">Contact</option>
                  <option value="power">Power</option>
                </Select>
              </ToggleLabel>
            </>
          )}
        </AutoPlayGroup>
      </Controls>
      {managerMode && <DecisionPanel strategy={strategy} />}
    </>
  );
};

export default BatterButton;


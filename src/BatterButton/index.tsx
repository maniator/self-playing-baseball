import * as React from "react";

import styled from "styled-components";
import { ContextValue, GameContext, Strategy, State } from "../Context";
import { detectDecision } from "../Context/reducer";
import { Hit } from "../constants/hitTypes";
import getRandomInt from "../utilities/getRandomInt";
import { setAnnouncementVolume, setAlertVolume, isSpeechPending, playVictoryFanfare, play7thInningStretch, setSpeechRate } from "../utilities/announce";
import { buildReplayUrl } from "../utilities/rng";
import { appLog } from "../utilities/logger";
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

const NewGameButton = styled(Button)`
  background: #22c55e;
  color: #fff;
  font-weight: bold;
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

const VolumeRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #cce8ff;
  cursor: default;
`;

const VolumeIcon = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: inherit;
  &:hover { opacity: 0.75; }
`;

const RangeInput = styled.input`
  accent-color: aquamarine;
  cursor: pointer;
  width: 72px;
  height: 4px;
  vertical-align: middle;
`;

const NotifBadge = styled.span<{ $ok: boolean }>`
  font-size: 11px;
  color: ${({ $ok }) => ($ok ? "#4ade80" : "#fbbf24")};
  cursor: ${({ $ok }) => ($ok ? "default" : "pointer")};
  white-space: nowrap;
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

function loadFloat(key: string, fallback: number): number {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  const f = parseFloat(v);
  return Number.isFinite(f) ? Math.max(0, Math.min(1, f)) : fallback;
}

function loadString<T extends string>(key: string, fallback: T): T {
  const v = localStorage.getItem(key);
  return v === null ? fallback : (v as T);
}

const BatterButton: React.FunctionComponent<{}> = () => {
  const { dispatch, dispatchLog, strikes, balls, baseLayout, outs, inning, score, atBat, pendingDecision, gameOver, onePitchModifier, teams }: ContextValue = React.useContext(GameContext);
  const [autoPlay, setAutoPlay] = React.useState(() => loadBool("autoPlay", false));
  const [speed, setSpeed] = React.useState(() => loadInt("speed", SPEED_NORMAL));
  const [announcementVolume, setAnnouncementVolumeState] = React.useState(() => loadFloat("announcementVolume", 1));
  const [alertVolume, setAlertVolumeState] = React.useState(() => loadFloat("alertVolume", 1));
  const [managerMode, setManagerMode] = React.useState(() => loadBool("managerMode", false));
  const [strategy, setStrategy] = React.useState<Strategy>(() => loadString<Strategy>("strategy", "balanced"));
  const [managedTeam, setManagedTeam] = React.useState<0 | 1>(() => (loadInt("managedTeam", 0) === 1 ? 1 : 0));

  // Track browser notification permission so we can show an in-UI status badge.
  const [notifPermission, setNotifPermission] = React.useState<NotificationPermission | "unavailable">(() => {
    if (typeof Notification === "undefined") return "unavailable";
    return Notification.permission;
  });

  // Keep autoPlay accessible as a ref so the keyboard handler can read the latest value
  // without needing to re-register on every autoPlay change.
  const autoPlayRef = React.useRef(autoPlay);
  autoPlayRef.current = autoPlay;

  // Stable refs for values needed inside the speech-gated scheduler (avoids stale closures).
  // mutedRef is true when announcement volume is 0 — scheduler skips speech-wait when silent.
  const mutedRef = React.useRef(announcementVolume === 0);
  mutedRef.current = announcementVolume === 0;

  const speedRef = React.useRef(speed);
  speedRef.current = speed;

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

  // Detect inning/half-inning transitions for the between-innings pause and 7th-inning stretch.
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

  // Play victory fanfare once when the game ends.
  const prevGameOverRef = React.useRef(gameOver);
  React.useEffect(() => {
    if (!prevGameOverRef.current && gameOver) {
      playVictoryFanfare();
    }
    prevGameOverRef.current = gameOver;
  }, [gameOver]);

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
    const onePitchMod = currentState.onePitchModifier;

    // Apply "protect" one-pitch modifier (0-2 count): reduce swing rate → more contact
    const protectBonus = onePitchMod === "protect" ? 0.7 : 1;
    // Apply strategy swing rate modifier
    const contactMod = strategyRef.current === "contact" ? 1.15 : strategyRef.current === "power" ? 0.9 : 1;
    const swingRate = Math.round((500 - (75 * currentStrikes)) * contactMod * protectBonus);

    // "swing" modifier: batter commits to swinging — override the take range so no
    // called balls are possible (the batter literally swings at everything < 920).
    const effectiveSwingRate = onePitchMod === "swing" ? 920 : swingRate;

    if (random < effectiveSwingRate) {
      // Swing — 30% of swings are fouls (can't strike out on a foul ball)
      if (getRandomInt(100) < 30) {
        dispatch({ type: "foul" });
      } else {
        dispatch({ type: "strike", payload: { swung: true } });
      }
    } else if (random < 920) {
      // Take the pitch — umpire calls ball or strike
      dispatch({ type: "wait", payload: { strategy: strategyRef.current } });
    } else {
      // Ball in play — determine hit type with realistic MLB distribution
      const strat = strategyRef.current;
      const hitRoll = getRandomInt(100);
      let base: Hit;
      if (strat === "power") {
        // Power: more HRs/doubles, fewer singles
        base = hitRoll < 20 ? Hit.Homerun : hitRoll < 23 ? Hit.Triple : hitRoll < 43 ? Hit.Double : Hit.Single;
      } else if (strat === "contact") {
        // Contact: more singles, fewer HRs
        base = hitRoll < 8 ? Hit.Homerun : hitRoll < 10 ? Hit.Triple : hitRoll < 28 ? Hit.Double : Hit.Single;
      } else {
        // Balanced (and aggressive/patient): MLB-realistic distribution
        // ~13% HR, ~2% triple, ~20% double, ~65% single
        base = hitRoll < 13 ? Hit.Homerun : hitRoll < 15 ? Hit.Triple : hitRoll < 35 ? Hit.Double : Hit.Single;
      }
      // Hit callout is logged inside the reducer (hitBall) after pop-out check — no log here.
      dispatch({ type: "hit", payload: { hitType: base, strategy: strat } });
    }
  }, [dispatch, dispatchLog]);

  // Stable ref so the interval always calls the latest handler without stale closures
  const handleClickRef = React.useRef(handleClickButton);
  handleClickRef.current = handleClickButton;

  // Auto-play scheduler — speech-gated: waits for the current announcement to finish
  // before firing the next pitch, so nothing gets cut off. Also adds a brief pause at
  // inning/half-inning transitions when muted (speech naturally provides one when unmuted).
  React.useEffect(() => {
    if (!autoPlay) return;
    if (pendingDecision && managerMode) return; // paused at a manager decision

    let timerId: ReturnType<typeof setTimeout>;
    let extraWait = 0;
    const MAX_SPEECH_WAIT_MS = 8000;
    const SPEECH_POLL_MS = 300;

    const tick = (delay: number) => {
      timerId = setTimeout(() => {
        if (!autoPlayRef.current || gameStateRef.current.gameOver) return;

        // When unmuted, wait for any ongoing speech to finish before pitching.
        if (!mutedRef.current && isSpeechPending() && extraWait < MAX_SPEECH_WAIT_MS) {
          extraWait += SPEECH_POLL_MS;
          tick(SPEECH_POLL_MS);
          return;
        }

        // When muted, still hold briefly at inning/half-inning transitions.
        if (mutedRef.current && betweenInningsPauseRef.current) {
          betweenInningsPauseRef.current = false;
          extraWait = 0;
          tick(1500);
          return;
        }

        betweenInningsPauseRef.current = false;
        extraWait = 0;
        handleClickRef.current();
        tick(speedRef.current);
      }, delay);
    };

    tick(speedRef.current);
    return () => clearTimeout(timerId);
  }, [autoPlay, pendingDecision, managerMode]);

  // Persist settings to localStorage
  React.useEffect(() => { localStorage.setItem("autoPlay", String(autoPlay)); }, [autoPlay]);
  React.useEffect(() => { localStorage.setItem("speed", String(speed)); }, [speed]);
  React.useEffect(() => { localStorage.setItem("announcementVolume", String(announcementVolume)); }, [announcementVolume]);
  React.useEffect(() => { localStorage.setItem("alertVolume", String(alertVolume)); }, [alertVolume]);
  React.useEffect(() => { localStorage.setItem("managerMode", String(managerMode)); }, [managerMode]);
  React.useEffect(() => { localStorage.setItem("strategy", strategy); }, [strategy]);
  React.useEffect(() => { localStorage.setItem("managedTeam", String(managedTeam)); }, [managedTeam]);

  // Sync volume states into the announce module.
  React.useEffect(() => { setAnnouncementVolume(announcementVolume); }, [announcementVolume]);
  React.useEffect(() => { setAlertVolume(alertVolume); }, [alertVolume]);

  // Sync speed → TTS rate so the voice keeps pace with autoplay.
  React.useEffect(() => { setSpeechRate(speed); }, [speed]);

  const handlePitch = React.useCallback((event: KeyboardEvent) => {
    if (autoPlayRef.current) return; // autoplay handles pitching; spacebar does nothing
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
    if (!enabled) return;
    if (typeof Notification === "undefined") {
      appLog.warn("Manager Mode enabled — Notification API not available in this browser");
      return;
    }
    appLog.log(`Manager Mode enabled — current permission="${Notification.permission}"`);
    if (Notification.permission === "default") {
      appLog.log("Requesting notification permission…");
      Notification.requestPermission().then(result => {
        appLog.log(`Notification permission result="${result}"`);
        setNotifPermission(result);
      });
    } else {
      setNotifPermission(Notification.permission);
    }
  };

  const handleRequestNotifPermission = React.useCallback(() => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(result => {
      appLog.log(`Notification permission result="${result}"`);
      setNotifPermission(result);
    });
  }, []);

  const handleAutoPlayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setAutoPlay(enabled);
    // Manager Mode requires autoplay — turn it off when autoplay is disabled.
    if (!enabled && managerMode) {
      setManagerMode(false);
    }
  };

  const handleAnnouncementVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = parseFloat(e.target.value);
    if (Number.isFinite(f)) setAnnouncementVolumeState(Math.max(0, Math.min(1, f)));
  };

  const handleAlertVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = parseFloat(e.target.value);
    if (Number.isFinite(f)) setAlertVolumeState(Math.max(0, Math.min(1, f)));
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSpeed(parseInt(e.target.value, 10));
  };

  const handleShareReplay = () => {
    const url = buildReplayUrl();
    const managerNote = managerMode
      ? "\n\nNote: Manager Mode decisions are not included in the replay — the same pitches will occur, but you'll need to make the same decisions again."
      : "";
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => log(managerMode ? "Replay link copied! (Manager decisions not included)" : "Replay link copied!"))
        .catch(() => window.prompt(`Copy this replay link:${managerNote}`, url));
    } else {
      window.prompt(`Copy this replay link:${managerNote}`, url);
    }
  };

  return (
    <>
      <Controls>
        {!autoPlay && <Button onClick={handleClickButton} disabled={gameOver}>Batter Up!</Button>}
        {gameOver && <NewGameButton onClick={() => dispatch({ type: "reset" })}>New Game</NewGameButton>}
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
          <VolumeRow>
            🔊
            <RangeInput
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={announcementVolume}
              onChange={handleAnnouncementVolumeChange}
              aria-label="Announcement volume"
            />
          </VolumeRow>
          <VolumeRow>
            🔔
            <RangeInput
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={alertVolume}
              onChange={handleAlertVolumeChange}
              aria-label="Alert volume"
            />
          </VolumeRow>
          {autoPlay && (
            <ToggleLabel>
              <input type="checkbox" checked={managerMode} onChange={handleManagerModeChange} />
              Manager Mode
            </ToggleLabel>
          )}
          {autoPlay && managerMode && (
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
              {notifPermission === "granted" && (
                <NotifBadge $ok={true}>🔔 on</NotifBadge>
              )}
              {notifPermission === "denied" && (
                <NotifBadge $ok={false} title="Enable notifications in your browser settings">
                  🔕 blocked
                </NotifBadge>
              )}
              {notifPermission === "default" && (
                <NotifBadge $ok={false} onClick={handleRequestNotifPermission} title="Click to grant notification permission">
                  🔔 click to enable
                </NotifBadge>
              )}
            </>
          )}
        </AutoPlayGroup>
      </Controls>
      {autoPlay && managerMode && <DecisionPanel strategy={strategy} />}
    </>
  );
};

export default BatterButton;


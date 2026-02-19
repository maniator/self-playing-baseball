import * as React from "react";
import { useGameContext } from "../Context";
import { Strategy } from "../Context";
import { playDecisionChime } from "../utilities/announce";
import { appLog } from "../utilities/logger";
import { DECISION_TIMEOUT_SEC } from "./constants";
import { showManagerNotification, closeManagerNotification } from "./notificationHelpers";
import DecisionButtons from "./DecisionButtons";
import { Panel, CountdownRow, CountdownTrack, CountdownFill, CountdownLabel } from "./styles";

type Props = {
  strategy: Strategy;
};

const DecisionPanel: React.FunctionComponent<Props> = ({ strategy }) => {
  const { dispatch, pendingDecision } = useGameContext();
  const [secondsLeft, setSecondsLeft] = React.useState(DECISION_TIMEOUT_SEC);

  // Listen for actions dispatched from the service worker (notification button taps).
  // Validate the message origin so only same-origin SW messages are processed.
  // SW-to-page postMessages have event.origin === "" (empty string), so we only
  // reject messages whose origin is explicitly a different, non-empty origin.
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.origin && typeof window !== "undefined" && event.origin !== window.location.origin) return;
      if (event.data?.type !== "NOTIFICATION_ACTION") return;
      const { action, payload } = event.data;
      switch (action) {
        case "steal":      dispatch({ type: "steal_attempt", payload }); break;
        case "bunt":       dispatch({ type: "bunt_attempt", payload }); break;
        case "take":       dispatch({ type: "set_one_pitch_modifier", payload: "take" }); break;
        case "swing":      dispatch({ type: "set_one_pitch_modifier", payload: "swing" }); break;
        case "protect":    dispatch({ type: "set_one_pitch_modifier", payload: "protect" }); break;
        case "normal":     dispatch({ type: "set_one_pitch_modifier", payload: "normal" }); break;
        case "ibb":        dispatch({ type: "intentional_walk" }); break;
        case "skip":       dispatch({ type: "skip_decision" }); break;
        case "ph_contact":    dispatch({ type: "set_pinch_hitter_strategy", payload: "contact" }); break;
        case "ph_patient":    dispatch({ type: "set_pinch_hitter_strategy", payload: "patient" }); break;
        case "ph_power":      dispatch({ type: "set_pinch_hitter_strategy", payload: "power" }); break;
        case "ph_aggressive": dispatch({ type: "set_pinch_hitter_strategy", payload: "aggressive" }); break;
        case "ph_balanced":   dispatch({ type: "set_pinch_hitter_strategy", payload: "balanced" }); break;
        case "shift_on":   dispatch({ type: "set_defensive_shift", payload: true }); break;
        case "shift_off":  dispatch({ type: "set_defensive_shift", payload: false }); break;
        default: break; // "focus" — just brings tab to front, no game action needed
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [dispatch]);

  // Countdown timer + chime + notification on new decision
  React.useEffect(() => {
    if (!pendingDecision) {
      setSecondsLeft(DECISION_TIMEOUT_SEC);
      closeManagerNotification();
      return;
    }
    appLog.log("pendingDecision set:", pendingDecision.kind);
    setSecondsLeft(DECISION_TIMEOUT_SEC);

    // Sound alert (respects mute)
    playDecisionChime();

    // Browser notification — always send immediately so the user is alerted
    // whether they are on the tab or have switched away.
    showManagerNotification(pendingDecision);

    // Re-send if the user switches away while the decision is still pending
    // (e.g. they saw the in-page panel but then tabbed away).
    const handleVisibility = () => {
      if (document.hidden) {
        appLog.log("visibilitychange — tab hidden, re-sending notification for:", pendingDecision.kind);
        showManagerNotification(pendingDecision);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          dispatch({ type: "skip_decision" });
          return DECISION_TIMEOUT_SEC;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [pendingDecision, dispatch]);

  if (!pendingDecision) return null;

  const skip = () => dispatch({ type: "skip_decision" });
  const pct = (secondsLeft / DECISION_TIMEOUT_SEC) * 100;

  return (
    <Panel>
      <DecisionButtons
        pendingDecision={pendingDecision}
        strategy={strategy}
        onSkip={skip}
        onDispatch={dispatch}
      />
      <CountdownRow>
        <CountdownTrack>
          <CountdownFill $pct={pct} />
        </CountdownTrack>
        <CountdownLabel>auto-skip {secondsLeft}s</CountdownLabel>
      </CountdownRow>
    </Panel>
  );
};

export default DecisionPanel;

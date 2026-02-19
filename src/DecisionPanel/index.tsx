import * as React from "react";
import styled from "styled-components";
import { ContextValue, GameContext, DecisionType, Strategy } from "../Context";
import { playDecisionChime } from "../utilities/announce";
import { appLog } from "../utilities/logger";

const DECISION_TIMEOUT_SEC = 10;
const NOTIF_TAG = "manager-decision";

const getNotificationBody = (d: DecisionType): string => {
  switch (d.kind) {
    case "steal": return `Steal from ${d.base === 0 ? "1st" : "2nd"} base? (${d.successPct}% success)`;
    case "bunt": return "Sacrifice bunt opportunity";
    case "count30": return "Count is 3-0 — Take or swing?";
    case "count02": return "Count is 0-2 — Protect or swing?";
    case "ibb": return "Intentional walk opportunity";
    default: return "Manager decision needed";
  }
};

const getNotificationActions = (d: DecisionType): { action: string; title: string }[] => {
  switch (d.kind) {
    case "steal":  return [{ action: "steal",   title: "⚾ Yes, steal!" }, { action: "skip", title: "⏭ Skip" }];
    case "bunt":   return [{ action: "bunt",    title: "✅ Bunt!"       }, { action: "skip", title: "⏭ Skip" }];
    case "count30":return [{ action: "take",    title: "🤚 Take"        }, { action: "swing",  title: "⚾ Swing" }];
    case "count02":return [{ action: "protect", title: "🛡 Protect"     }, { action: "normal", title: "⚾ Normal" }];
    case "ibb":    return [{ action: "ibb",     title: "✅ Yes, IBB"    }, { action: "skip", title: "⏭ Skip" }];
    default:       return [{ action: "skip",    title: "⏭ Skip" }];
  }
};

interface ServiceWorkerNotificationOptions extends NotificationOptions {
  actions?: { action: string; title: string }[];
  data?: unknown;
}

/** Show a service-worker notification with action buttons.
 *  Always sent (regardless of tab visibility) so the user receives an alert
 *  both when they are watching the game and after they switch away.
 *  requireInteraction: true keeps the notification visible until acted upon.
 *  Falls back to a plain Notification if the SW path fails. */
const showManagerNotification = (d: DecisionType): void => {
  const permission = typeof Notification !== "undefined" ? Notification.permission : "unavailable";
  appLog.log(`showManagerNotification — kind="${d.kind}" permission="${permission}"`);

  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    appLog.warn(`showManagerNotification — skipped (permission="${permission}")`);
    return;
  }

  const title = "⚾ Your turn, Manager!";
  const body = getNotificationBody(d);

  if ("serviceWorker" in navigator) {
    appLog.log("showManagerNotification — awaiting navigator.serviceWorker.ready");
    navigator.serviceWorker.ready
      .then(reg => {
        appLog.log("SW ready — calling reg.showNotification");
        return reg.showNotification(title, {
          body,
          tag: NOTIF_TAG,
          actions: getNotificationActions(d),
          data: d,
          requireInteraction: true,
        } as ServiceWorkerNotificationOptions);
      })
      .then(() => appLog.log("showNotification resolved — notification delivered to OS"))
      .catch((err) => {
        appLog.error("SW showNotification failed:", err, "— falling back to plain Notification");
        try {
          new Notification(title, { body, tag: NOTIF_TAG });
          appLog.log("plain Notification fallback sent");
        } catch (e) {
          appLog.error("plain Notification fallback also failed:", e);
        }
      });
  } else {
    appLog.log("showManagerNotification — no SW support, using plain Notification");
    try {
      new Notification(title, { body });
      appLog.log("plain Notification sent");
    } catch (e) {
      appLog.error("plain Notification failed:", e);
    }
  }
};

/** Close any open manager-decision notification (called when decision resolves). */
const closeManagerNotification = (): void => {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready
    .then(reg => reg.getNotifications({ tag: NOTIF_TAG }))
    .then(list => {
      if (list.length > 0) {
        appLog.log(`closeManagerNotification — closing ${list.length} notification(s)`);
        list.forEach(n => n.close());
      }
    })
    .catch(() => {});
};

const Panel = styled.div`
  background: rgba(0, 30, 60, 0.92);
  border: 2px solid aquamarine;
  border-radius: 12px;
  padding: 14px 18px 10px;
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  font-size: 14px;
`;

const Prompt = styled.span`
  flex: 1 1 auto;
  color: #e0f8f0;
  font-weight: 600;
`;

const Odds = styled.span`
  color: #aaffcc;
  font-size: 13px;
`;

const ActionButton = styled.button`
  background: aquamarine;
  color: darkblue;
  padding: 7px 14px;
  border-radius: 20px;
  cursor: pointer;
  border: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
`;

const SkipButton = styled(ActionButton)`
  background: #3a4a6a;
  color: #ccc;
`;

const CountdownRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 4px;
`;

const CountdownTrack = styled.div`
  flex: 1;
  height: 4px;
  background: #1a2e1a;
  border-radius: 2px;
  overflow: hidden;
`;

const CountdownFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ $pct }) => $pct > 50 ? "#44cc88" : $pct > 25 ? "#ffaa33" : "#ff4444"};
  border-radius: 2px;
  transition: width 0.95s linear, background 0.5s ease;
`;

const CountdownLabel = styled.span`
  color: #888;
  font-size: 11px;
  white-space: nowrap;
  min-width: 52px;
  text-align: right;
`;

type Props = {
  strategy: Strategy;
};

const DecisionPanel: React.FunctionComponent<Props> = ({ strategy }) => {
  const { dispatch, pendingDecision }: ContextValue = React.useContext(GameContext);
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
        case "steal":   dispatch({ type: "steal_attempt", payload }); break;
        case "bunt":    dispatch({ type: "bunt_attempt", payload }); break;
        case "take":    dispatch({ type: "set_one_pitch_modifier", payload: "take" }); break;
        case "swing":   dispatch({ type: "set_one_pitch_modifier", payload: "swing" }); break;
        case "protect": dispatch({ type: "set_one_pitch_modifier", payload: "protect" }); break;
        case "normal":  dispatch({ type: "set_one_pitch_modifier", payload: "normal" }); break;
        case "ibb":     dispatch({ type: "intentional_walk" }); break;
        case "skip":    dispatch({ type: "skip_decision" }); break;
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

  const renderButtons = () => {
    switch (pendingDecision.kind) {
      case "steal": {
        const { base, successPct } = pendingDecision;
        return (
          <>
            <Prompt>Steal attempt from {base === 0 ? "1st" : "2nd"} base?</Prompt>
            <Odds>Est. success: {successPct}%</Odds>
            <ActionButton onClick={() => dispatch({ type: "steal_attempt", payload: { base, successPct } })}>
              Yes, steal!
            </ActionButton>
            <SkipButton onClick={skip}>Skip</SkipButton>
          </>
        );
      }
      case "bunt":
        return (
          <>
            <Prompt>Sacrifice bunt?</Prompt>
            <ActionButton onClick={() => dispatch({ type: "bunt_attempt", payload: { strategy } })}>
              Yes, bunt!
            </ActionButton>
            <SkipButton onClick={skip}>Skip</SkipButton>
          </>
        );
      case "count30":
        return (
          <>
            <Prompt>Count is 3-0. Take or swing?</Prompt>
            <ActionButton onClick={() => dispatch({ type: "set_one_pitch_modifier", payload: "take" })}>
              Take (walk odds ↑)
            </ActionButton>
            <ActionButton onClick={() => dispatch({ type: "set_one_pitch_modifier", payload: "swing" })}>
              Swing away
            </ActionButton>
            <SkipButton onClick={skip}>Skip</SkipButton>
          </>
        );
      case "count02":
        return (
          <>
            <Prompt>Count is 0-2. Protect or normal swing?</Prompt>
            <ActionButton onClick={() => dispatch({ type: "set_one_pitch_modifier", payload: "protect" })}>
              Protect (contact ↑)
            </ActionButton>
            <ActionButton onClick={() => dispatch({ type: "set_one_pitch_modifier", payload: "normal" })}>
              Normal swing
            </ActionButton>
            <SkipButton onClick={skip}>Skip</SkipButton>
          </>
        );
      case "ibb":
        return (
          <>
            <Prompt>Issue an intentional walk (IBB)?</Prompt>
            <ActionButton onClick={() => dispatch({ type: "intentional_walk" })}>
              Yes, IBB
            </ActionButton>
            <SkipButton onClick={skip}>Skip</SkipButton>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Panel>
      {renderButtons()}
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

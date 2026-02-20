import * as React from "react";

import { LogAction } from "@context/index";
import { appLog } from "@utils/logger";

import { useShareReplay } from "./useShareReplay";

interface PlayerControlsArgs {
  managerMode: boolean;
  setManagerMode: (v: boolean) => void;
  announcementVolume: number;
  setAnnouncementVolumeState: (v: number) => void;
  alertVolume: number;
  setAlertVolumeState: (v: number) => void;
  dispatchLog: (action: LogAction) => void;
}

export const usePlayerControls = ({
  managerMode,
  setManagerMode,
  announcementVolume,
  setAnnouncementVolumeState,
  alertVolume,
  setAlertVolumeState,
  dispatchLog,
}: PlayerControlsArgs) => {
  const { handleShareReplay } = useShareReplay({ dispatchLog });

  const [notifPermission, setNotifPermission] = React.useState<
    NotificationPermission | "unavailable"
  >(() => {
    if (typeof Notification === "undefined") return "unavailable";
    return Notification.permission;
  });

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
      Notification.requestPermission().then((result) => {
        appLog.log(`Notification permission result="${result}"`);
        setNotifPermission(result);
      });
    } else {
      setNotifPermission(Notification.permission);
    }
  };

  const handleRequestNotifPermission = React.useCallback(() => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((result) => {
      appLog.log(`Notification permission result="${result}"`);
      setNotifPermission(result);
    });
  }, []);

  const handleAnnouncementVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = parseFloat(e.target.value);
    if (Number.isFinite(f)) setAnnouncementVolumeState(Math.max(0, Math.min(1, f)));
  };

  const handleAlertVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = parseFloat(e.target.value);
    if (Number.isFinite(f)) setAlertVolumeState(Math.max(0, Math.min(1, f)));
  };

  const prevAnnouncementVolumeRef = React.useRef(announcementVolume);
  const handleToggleAnnouncementMute = React.useCallback(() => {
    if (announcementVolume > 0) {
      prevAnnouncementVolumeRef.current = announcementVolume;
      setAnnouncementVolumeState(0);
    } else {
      setAnnouncementVolumeState(
        prevAnnouncementVolumeRef.current > 0 ? prevAnnouncementVolumeRef.current : 1,
      );
    }
  }, [announcementVolume, setAnnouncementVolumeState]);

  const prevAlertVolumeRef = React.useRef(alertVolume);
  const handleToggleAlertMute = React.useCallback(() => {
    if (alertVolume > 0) {
      prevAlertVolumeRef.current = alertVolume;
      setAlertVolumeState(0);
    } else {
      setAlertVolumeState(prevAlertVolumeRef.current > 0 ? prevAlertVolumeRef.current : 1);
    }
  }, [alertVolume, setAlertVolumeState]);

  return {
    notifPermission,
    handleManagerModeChange,
    handleRequestNotifPermission,
    handleAnnouncementVolumeChange,
    handleAlertVolumeChange,
    handleToggleAnnouncementMute,
    handleToggleAlertMute,
    handleShareReplay,
  };
};

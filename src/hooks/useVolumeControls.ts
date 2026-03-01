import * as React from "react";

import { useLocalStorage } from "usehooks-ts";

import { setAlertVolume, setAnnouncementVolume } from "@utils/announce";

/**
 * Manages and persists announcement + music (alert) volume.
 * Reads and writes the same localStorage keys as the gameplay screen so
 * settings are shared between the home screen and the game.
 */
export const useVolumeControls = () => {
  const [announcementVolume, setAnnouncementVolumeState] = useLocalStorage("announcementVolume", 1);
  const [alertVolume, setAlertVolumeState] = useLocalStorage("alertVolume", 1);

  const safeAnnouncementVolume =
    typeof announcementVolume === "number" && announcementVolume >= 0 && announcementVolume <= 1
      ? announcementVolume
      : 1;
  const safeAlertVolume =
    typeof alertVolume === "number" && alertVolume >= 0 && alertVolume <= 1 ? alertVolume : 1;

  // Self-heal: if localStorage contained an invalid value, write the safe default back so
  // the corrected value persists across page loads (mirrors useGameControls behaviour).
  React.useEffect(() => {
    if (announcementVolume !== safeAnnouncementVolume)
      setAnnouncementVolumeState(safeAnnouncementVolume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    if (alertVolume !== safeAlertVolume) setAlertVolumeState(safeAlertVolume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    setAnnouncementVolume(safeAnnouncementVolume);
  }, [safeAnnouncementVolume]);

  React.useEffect(() => {
    setAlertVolume(safeAlertVolume);
  }, [safeAlertVolume]);

  const prevAnnouncementVolumeRef = React.useRef(safeAnnouncementVolume);
  const prevAlertVolumeRef = React.useRef(safeAlertVolume);

  // Always keep prev refs up-to-date so unmuting restores the right level even if
  // volume was changed via another surface (e.g. the in-game controls).
  if (safeAnnouncementVolume > 0) prevAnnouncementVolumeRef.current = safeAnnouncementVolume;
  if (safeAlertVolume > 0) prevAlertVolumeRef.current = safeAlertVolume;

  const handleAnnouncementVolumeChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = parseFloat(e.target.value);
      if (Number.isFinite(f)) setAnnouncementVolumeState(Math.max(0, Math.min(1, f)));
    },
    [setAnnouncementVolumeState],
  );

  const handleAlertVolumeChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = parseFloat(e.target.value);
      if (Number.isFinite(f)) setAlertVolumeState(Math.max(0, Math.min(1, f)));
    },
    [setAlertVolumeState],
  );

  const handleToggleAnnouncementMute = React.useCallback(() => {
    if (safeAnnouncementVolume > 0) {
      prevAnnouncementVolumeRef.current = safeAnnouncementVolume;
      setAnnouncementVolumeState(0);
    } else {
      setAnnouncementVolumeState(
        prevAnnouncementVolumeRef.current > 0 ? prevAnnouncementVolumeRef.current : 1,
      );
    }
  }, [safeAnnouncementVolume, setAnnouncementVolumeState]);

  const handleToggleAlertMute = React.useCallback(() => {
    if (safeAlertVolume > 0) {
      prevAlertVolumeRef.current = safeAlertVolume;
      setAlertVolumeState(0);
    } else {
      setAlertVolumeState(prevAlertVolumeRef.current > 0 ? prevAlertVolumeRef.current : 1);
    }
  }, [safeAlertVolume, setAlertVolumeState]);

  return {
    announcementVolume: safeAnnouncementVolume,
    alertVolume: safeAlertVolume,
    handleAnnouncementVolumeChange,
    handleAlertVolumeChange,
    handleToggleAnnouncementMute,
    handleToggleAlertMute,
  };
};

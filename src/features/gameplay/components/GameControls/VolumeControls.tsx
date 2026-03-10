import * as React from "react";

import { RangeInput, VolumeIcon, VolumeRow } from "./styles";

type Props = {
  announcementVolume: number;
  alertVolume: number;
  onAnnouncementVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAlertVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleAnnouncementMute: () => void;
  onToggleAlertMute: () => void;
};

const VolumeControls: React.FunctionComponent<Props> = ({
  announcementVolume,
  alertVolume,
  onAnnouncementVolumeChange,
  onAlertVolumeChange,
  onToggleAnnouncementMute,
  onToggleAlertMute,
}) => (
  <>
    <VolumeRow>
      <VolumeIcon
        type="button"
        onClick={onToggleAnnouncementMute}
        title={announcementVolume === 0 ? "Unmute announcements" : "Mute announcements"}
        aria-label={announcementVolume === 0 ? "Unmute announcements" : "Mute announcements"}
      >
        {announcementVolume === 0 ? "🔇" : "🔊"}
      </VolumeIcon>
      <RangeInput
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={announcementVolume}
        onChange={onAnnouncementVolumeChange}
        aria-label="Announcement volume"
      />
    </VolumeRow>
    <VolumeRow>
      <VolumeIcon
        type="button"
        onClick={onToggleAlertMute}
        title={alertVolume === 0 ? "Unmute music" : "Mute music"}
        aria-label={alertVolume === 0 ? "Unmute music" : "Mute music"}
      >
        {alertVolume === 0 ? "🔇" : "🎵"}
      </VolumeIcon>
      <RangeInput
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={alertVolume}
        onChange={onAlertVolumeChange}
        aria-label="Music volume"
      />
    </VolumeRow>
  </>
);

export default VolumeControls;

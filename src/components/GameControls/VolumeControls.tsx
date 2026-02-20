import * as React from "react";

import styled from "styled-components";

import { AnnouncementVoiceOption } from "@utils/announce";

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
  &:hover {
    opacity: 0.75;
  }
`;

const RangeInput = styled.input`
  accent-color: aquamarine;
  cursor: pointer;
  width: 72px;
  height: 4px;
  vertical-align: middle;
`;

const VoiceSelect = styled.select`
  background: #1a2440;
  border: 1px solid #4a6090;
  color: #fff;
  border-radius: 8px;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  max-width: 190px;
`;

type Props = {
  announcementVolume: number;
  announcementVoice: string;
  announcementVoiceOptions: AnnouncementVoiceOption[];
  alertVolume: number;
  onAnnouncementVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnnouncementVoiceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onAlertVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleAnnouncementMute: () => void;
  onToggleAlertMute: () => void;
};

const VolumeControls: React.FunctionComponent<Props> = ({
  announcementVolume,
  announcementVoice,
  announcementVoiceOptions,
  alertVolume,
  onAnnouncementVolumeChange,
  onAnnouncementVoiceChange,
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
        title={alertVolume === 0 ? "Unmute alerts" : "Mute alerts"}
        aria-label={alertVolume === 0 ? "Unmute alerts" : "Mute alerts"}
      >
        {alertVolume === 0 ? "🔕" : "🔔"}
      </VolumeIcon>
      <RangeInput
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={alertVolume}
        onChange={onAlertVolumeChange}
        aria-label="Alert volume"
      />
    </VolumeRow>
    <VolumeRow>
      Voice
      <VoiceSelect
        value={announcementVoice}
        onChange={onAnnouncementVoiceChange}
        aria-label="Announcement voice"
      >
        <option value="auto">Auto</option>
        {announcementVoiceOptions.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name} ({voice.lang}){voice.isDefault ? " • default" : ""}
          </option>
        ))}
      </VoiceSelect>
    </VolumeRow>
  </>
);

export default VolumeControls;

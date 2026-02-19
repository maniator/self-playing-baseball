const synth = window.speechSynthesis;
let announcementsMuted = false;

export const announce = (message: string) => {
  if (announcementsMuted) {
    return;
  }

  const utterThis = new SpeechSynthesisUtterance(message);

  utterThis.pitch = 1;
  utterThis.rate = 1;
  synth.speak(utterThis);
};

export const cancelAnnouncements = () => synth.cancel();

export const canAnnounce = () => !(synth.speaking || synth.pending);

export const setAnnouncementsMuted = (muted: boolean) => {
  announcementsMuted = muted;
};

export const areAnnouncementsMuted = () => announcementsMuted;

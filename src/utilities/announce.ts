const synth = window.speechSynthesis;
let muted = false;

export const announce = (message) => {
  if (muted) {
    return;
  }

  const utterThis = new SpeechSynthesisUtterance(message);

  utterThis.pitch = 1;
  utterThis.rate = 1;
  synth.speak(utterThis);
};

export const cancelAnnouncements = () => synth.cancel();

export const canAnnounce = () => !(synth.speaking || synth.pending);

export const setAnnouncementsMuted = (value: boolean) => {
  muted = value;

  if (value) {
    cancelAnnouncements();
  }
};

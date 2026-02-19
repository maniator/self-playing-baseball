const synth = window.speechSynthesis;
const MUTE_KEY = "baseball.mute";

const isMuted = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
};

export const announce = (message: string) => {
  if (isMuted()) {
    return;
  }

  const utterThis = new SpeechSynthesisUtterance(message);

  utterThis.pitch = 1;
  utterThis.rate = 1;
  synth.speak(utterThis);
};

export const cancelAnnouncements = () => synth.cancel();

export const canAnnounce = () => !(synth.speaking || synth.pending);

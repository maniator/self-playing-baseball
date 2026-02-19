const synth = window.speechSynthesis;
let _muted = false;

export const setMuted = (m: boolean): void => {
  _muted = m;
  if (m) synth.cancel();
};

export const announce = (message: string): void => {
  if (_muted) return;
  const utterThis = new SpeechSynthesisUtterance(message);

  utterThis.pitch = 1;
  utterThis.rate = 1;
  synth.speak(utterThis);
};

export const cancelAnnouncements = () => synth.cancel();

export const canAnnounce = () => !(synth.speaking || synth.pending);

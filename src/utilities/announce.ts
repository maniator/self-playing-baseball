const synth = window.speechSynthesis;
let _muted = false;

export const setMuted = (m: boolean): void => {
  _muted = m;
  if (m) synth.cancel();
};

export const isMuted = (): boolean => _muted;

export const announce = (message: string): void => {
  if (_muted) return;
  const utterThis = new SpeechSynthesisUtterance(message);

  utterThis.pitch = 1;
  utterThis.rate = 1;
  synth.speak(utterThis);
};

export const cancelAnnouncements = () => synth.cancel();

export const canAnnounce = () => !(synth.speaking || synth.pending);

/** Play a short two-note chime to alert the manager. Respects the mute flag. */
export const playDecisionChime = (): void => {
  if (_muted) return;
  try {
    const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx: AudioContext = new AudioCtx();

    const playNote = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    };

    // Two ascending notes: E5 → A5
    playNote(659, ctx.currentTime, 0.22);
    playNote(880, ctx.currentTime + 0.13, 0.35);
  } catch (_e) {
    // AudioContext unavailable — silently ignore
  }
};

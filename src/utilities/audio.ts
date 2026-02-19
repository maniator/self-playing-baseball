export let _alertVolume = 1.0;

export const setAlertVolume = (v: number): void => {
  _alertVolume = Math.max(0, Math.min(1, v));
};

export const getAlertVolume = (): number => _alertVolume;

/** Play a short two-note chime to alert the manager. Skips when alert volume is 0. */
export const playDecisionChime = (): void => {
  if (_alertVolume === 0) return;
  try {
    const AudioCtxConstructor: typeof AudioContext =
      window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxConstructor) return;
    const ctx = new AudioCtxConstructor();

    const playNote = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2 * _alertVolume, start + 0.02);
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

// Shared helper used by the fanfares below.
const makeFanfareNote = (
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  start: number,
  dur: number,
  volume = 0.28,
): void => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume * _alertVolume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.start(start);
  osc.stop(start + dur + 0.02);
};

/** Triumphant rising fanfare played when the game ends. Respects alert volume. */
export const playVictoryFanfare = (): void => {
  if (_alertVolume === 0) return;
  try {
    const Ctx: typeof AudioContext =
      window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t = ctx.currentTime;
    const n = (f: number, s: number, d: number) => makeFanfareNote(ctx, "square", f, t + s, d);

    n(261.63, 0.00, 0.12); // C4
    n(329.63, 0.13, 0.12); // E4
    n(392.00, 0.26, 0.12); // G4
    n(523.25, 0.39, 0.45); // C5  (held)
    n(659.25, 0.60, 0.09); // E5
    n(783.99, 0.70, 0.09); // G5
    n(1046.5, 0.80, 0.55); // C6  (high finish)
  } catch (_e) {}
};

/** Plays the opening bars of "Take Me Out to the Ball Game" for the 7th-inning stretch.
 *  Skips when alert volume is 0. */
export const play7thInningStretch = (): void => {
  if (_alertVolume === 0) return;
  try {
    const Ctx: typeof AudioContext =
      window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t = ctx.currentTime;
    const n = (f: number, s: number, d: number) => makeFanfareNote(ctx, "sine", f, t + s, d, 0.22);

    const q = 0.32;

    n(392.00, 0 * q, q);
    n(329.63, 1 * q, q);
    n(261.63, 2 * q, q * 1.5);
    n(261.63, 3.5 * q, q * 0.5);
    n(329.63, 4 * q, q);
    n(392.00, 5 * q, q);
    n(392.00, 6 * q, q * 2);

    n(440.00, 8  * q, q);
    n(440.00, 9  * q, q);
    n(440.00, 10 * q, q * 1.5);
    n(349.23, 11.5 * q, q * 0.5);
    n(440.00, 12 * q, q);
    n(523.25, 13 * q, q * 2);
  } catch (_e) {}
};

export let _alertVolume = 1.0;

export const setAlertVolume = (v: number): void => {
  _alertVolume = Math.max(0, Math.min(1, v));
  // Keep the home-screen music master gain in sync so volume changes apply immediately.
  if (_homeMasterGain) {
    _homeMasterGain.gain.value = _alertVolume;
  }
};

export const getAlertVolume = (): number => _alertVolume;

/** Play a short two-note chime to alert the manager. Skips when alert volume is 0. */
export const playDecisionChime = (): void => {
  if (_alertVolume === 0) return;
  try {
    const AudioCtxConstructor: typeof AudioContext =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
  } catch {
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
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t = ctx.currentTime;
    const n = (f: number, s: number, d: number) => makeFanfareNote(ctx, "square", f, t + s, d);

    n(261.63, 0.0, 0.12); // C4
    n(329.63, 0.13, 0.12); // E4
    n(392.0, 0.26, 0.12); // G4
    n(523.25, 0.39, 0.45); // C5  (held)
    n(659.25, 0.6, 0.09); // E5
    n(783.99, 0.7, 0.09); // G5
    n(1046.5, 0.8, 0.55); // C6  (high finish)
  } catch {}
};

// ---------------------------------------------------------------------------
// Home screen looping music
// ---------------------------------------------------------------------------

/** Quarter-note duration in seconds (~120 BPM). */
const HOME_BEAT = 0.5;

/** Melody phrases: [frequency Hz, beat offset, duration in beats]. Triangle wave. */
const HOME_MELODY_NOTES: ReadonlyArray<readonly [number, number, number]> = [
  // Bar 1 – ascending C-major arpeggio
  [523.25, 0.0, 0.9], // C5
  [659.25, 1.0, 0.9], // E5
  [784.0, 2.0, 0.9], // G5
  [880.0, 3.0, 0.9], // A5
  // Bar 2 – descent and rest
  [784.0, 4.0, 0.45], // G5
  [659.25, 4.5, 0.45], // E5
  [587.33, 5.0, 0.9], // D5
  [523.25, 6.0, 1.8], // C5 (held)
  // Bar 3 – bridge phrase
  [659.25, 8.0, 0.9], // E5
  [659.25, 9.0, 0.45], // E5
  [784.0, 9.5, 0.45], // G5
  [880.0, 10.0, 0.9], // A5
  [784.0, 11.0, 0.9], // G5
  // Bar 4 – resolution
  [659.25, 12.0, 0.9], // E5
  [587.33, 13.0, 0.45], // D5
  [523.25, 13.5, 0.45], // C5
  [392.0, 14.0, 1.8], // G4 (held low – leads back into next loop)
];

/** Inner harmony notes: [frequency Hz, beat offset, duration in beats]. Sine wave. */
const HOME_HARMONY_NOTES: ReadonlyArray<readonly [number, number, number]> = [
  [329.63, 1.0, 0.9], // E4 – C chord fill
  [392.0, 3.0, 0.9], // G4
  [293.66, 5.0, 0.9], // D4 – G chord fill
  [246.94, 7.0, 0.9], // B3
  [261.63, 9.0, 0.9], // C4 – A-minor chord fill
  [329.63, 11.0, 0.9], // E4
  [293.66, 13.0, 0.9], // D4 – G chord fill
  [246.94, 15.0, 0.9], // B3
];

/** Bass notes: [frequency Hz, beat offset, duration in beats]. Sine wave. */
const HOME_BASS_NOTES: ReadonlyArray<readonly [number, number, number]> = [
  [130.81, 0.0, 3.8], // C3
  [98.0, 4.0, 3.8], // G2
  [110.0, 8.0, 3.8], // A2
  [98.0, 12.0, 3.8], // G2
];

/** Total loop length in seconds (16 beats × 0.5 s/beat = 8 s). */
export const HOME_LOOP_DURATION = 16 * HOME_BEAT;

let _homeCtx: AudioContext | null = null;
let _homeMasterGain: GainNode | null = null;
let _homeLoopId: ReturnType<typeof setTimeout> | null = null;
/** Removes document interaction listeners added for autoplay-policy recovery. */
let _homeCleanup: (() => void) | null = null;

const scheduleHomePass = (ctx: AudioContext, masterGain: GainNode, loopStart: number): void => {
  const makeNote = (
    type: OscillatorType,
    freq: number,
    t: number,
    dur: number,
    gain: number,
  ): void => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(masterGain);
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.linearRampToValueAtTime(0, t + dur * HOME_BEAT);
    osc.start(t);
    osc.stop(t + dur * HOME_BEAT + 0.02);
  };

  for (const [freq, beat, dur] of HOME_MELODY_NOTES) {
    makeNote("triangle", freq, loopStart + beat * HOME_BEAT, dur, 0.18);
  }
  for (const [freq, beat, dur] of HOME_HARMONY_NOTES) {
    makeNote("sine", freq, loopStart + beat * HOME_BEAT, dur, 0.08);
  }
  for (const [freq, beat, dur] of HOME_BASS_NOTES) {
    makeNote("sine", freq, loopStart + beat * HOME_BEAT, dur, 0.12);
  }
};

/** Start looping home-screen music. Volume is controlled by alert volume via master gain. */
export const startHomeScreenMusic = (): void => {
  if (_alertVolume === 0) return;
  stopHomeScreenMusic();
  try {
    const Ctx: typeof AudioContext =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    _homeCtx = new Ctx();
    _homeMasterGain = _homeCtx.createGain();
    _homeMasterGain.gain.value = _alertVolume;
    _homeMasterGain.connect(_homeCtx.destination);

    const loopFrom = (loopStart: number): void => {
      if (!_homeCtx || !_homeMasterGain) return;
      scheduleHomePass(_homeCtx, _homeMasterGain, loopStart);
      const loopEnd = loopStart + HOME_LOOP_DURATION;
      const msUntilPreschedule = (loopEnd - _homeCtx.currentTime - 0.15) * 1000;
      _homeLoopId = setTimeout(
        () => {
          if (_homeCtx) loopFrom(loopEnd);
        },
        Math.max(0, msUntilPreschedule),
      );
    };

    // Attempt to start immediately. Browsers may keep the AudioContext suspended
    // until the first user gesture (autoplay policy). If so, we install one-shot
    // listeners so the loop begins on the very next interaction.
    const tryBegin = () => {
      if (!_homeCtx || _homeLoopId !== null) return;
      _homeCtx
        .resume()
        .then(() => {
          if (_homeCtx && _homeLoopId === null) loopFrom(_homeCtx.currentTime);
        })
        .catch(() => {});
    };

    tryBegin();

    if (_homeCtx.state !== "running") {
      const onInteraction = () => {
        _homeCleanup?.();
        _homeCleanup = null;
        tryBegin();
      };
      const cleanup = () => {
        document.removeEventListener("click", onInteraction);
        document.removeEventListener("keydown", onInteraction);
        document.removeEventListener("touchstart", onInteraction);
      };
      _homeCleanup = cleanup;
      document.addEventListener("click", onInteraction);
      document.addEventListener("keydown", onInteraction);
      document.addEventListener("touchstart", onInteraction);
    }
  } catch {
    // AudioContext unavailable — silently ignore
  }
};

/** Stop and tear down the home-screen music immediately. */
export const stopHomeScreenMusic = (): void => {
  _homeCleanup?.();
  _homeCleanup = null;
  if (_homeLoopId !== null) {
    clearTimeout(_homeLoopId);
    _homeLoopId = null;
  }
  if (_homeCtx) {
    _homeCtx.close().catch(() => {});
    _homeCtx = null;
  }
  _homeMasterGain = null;
};

/** Plays the opening bars of "Take Me Out to the Ball Game" for the 7th-inning stretch.
 *  Skips when alert volume is 0. */
export const play7thInningStretch = (): void => {
  if (_alertVolume === 0) return;
  try {
    const Ctx: typeof AudioContext =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t = ctx.currentTime;
    const n = (f: number, s: number, d: number) => makeFanfareNote(ctx, "sine", f, t + s, d, 0.22);

    const q = 0.32;

    n(392.0, 0 * q, q);
    n(329.63, 1 * q, q);
    n(261.63, 2 * q, q * 1.5);
    n(261.63, 3.5 * q, q * 0.5);
    n(329.63, 4 * q, q);
    n(392.0, 5 * q, q);
    n(392.0, 6 * q, q * 2);

    n(440.0, 8 * q, q);
    n(440.0, 9 * q, q);
    n(440.0, 10 * q, q * 1.5);
    n(349.23, 11.5 * q, q * 0.5);
    n(440.0, 12 * q, q);
    n(523.25, 13 * q, q * 2);
  } catch {}
};

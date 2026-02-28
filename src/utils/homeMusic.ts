import { _alertVolume, setHomeMasterGain } from "./audio";

// ---------------------------------------------------------------------------
// Home screen looping background music
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
/** Seconds to ramp the master gain from 0 → target on start. */
export const HOME_FADE_IN_SEC = 1.5;
/** Seconds to ramp the master gain from current → 0 on stop. */
export const HOME_FADE_OUT_SEC = 0.8;
/** Extra ms to wait after the fade-out ramp ends before closing the AudioContext. */
const FADE_OUT_BUFFER_MS = 50;

let _homeCtx: AudioContext | null = null;
let _localMasterGain: GainNode | null = null;
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
    _localMasterGain = _homeCtx.createGain();
    // Start silent; fade-in applied once the context is running (inside tryBegin).
    _localMasterGain.gain.value = 0;
    _localMasterGain.connect(_homeCtx.destination);
    setHomeMasterGain(_localMasterGain);

    const loopFrom = (loopStart: number): void => {
      if (!_homeCtx || !_localMasterGain) return;
      scheduleHomePass(_homeCtx, _localMasterGain, loopStart);
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
      if (!_homeCtx || !_localMasterGain || _homeLoopId !== null) return;
      _homeCtx
        .resume()
        .then(() => {
          // If the context is still suspended (browser blocked autoplay even though the
          // promise resolved), leave the interaction listeners alive so the next user
          // gesture retries — do NOT start the loop on a silent suspended context.
          if (!_homeCtx || _homeCtx.state !== "running") return;
          _homeCleanup?.();
          _homeCleanup = null;
          if (!_localMasterGain || _homeLoopId !== null) return;
          // Fade in from silence to the target alert volume.
          const now = _homeCtx.currentTime;
          _localMasterGain.gain.setValueAtTime(0, now);
          _localMasterGain.gain.linearRampToValueAtTime(_alertVolume, now + HOME_FADE_IN_SEC);
          loopFrom(now);
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

/** Stop and tear down the home-screen music with a short fade-out. */
export const stopHomeScreenMusic = (): void => {
  _homeCleanup?.();
  _homeCleanup = null;
  setHomeMasterGain(null);
  if (_homeLoopId !== null) {
    clearTimeout(_homeLoopId);
    _homeLoopId = null;
  }
  if (_homeCtx && _localMasterGain) {
    // Capture in local variables so the setTimeout closure uses them after nulling the module refs.
    const ctx = _homeCtx;
    const gain = _localMasterGain;
    _homeCtx = null;
    _localMasterGain = null;
    // cancelAndHoldAtTime freezes the gain at the actual computed value at `now` (correctly
    // handles mid-fade-in ramps) then we ramp from that value down to silence.
    const now = ctx.currentTime;
    gain.gain.cancelAndHoldAtTime(now);
    gain.gain.linearRampToValueAtTime(0, now + HOME_FADE_OUT_SEC);
    setTimeout(() => ctx.close().catch(() => {}), HOME_FADE_OUT_SEC * 1000 + FADE_OUT_BUFFER_MS);
  } else {
    if (_homeCtx) {
      _homeCtx.close().catch(() => {});
    }
    _homeCtx = null;
    _localMasterGain = null;
  }
};

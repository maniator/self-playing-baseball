// ---------------------------------------------------------------------------
// Home screen music: note tables
// Extracted into a companion module to keep homeMusic.ts within the 200-line
// guideline. Import from homeMusic.ts (or announce.ts) for public APIs.
// ---------------------------------------------------------------------------

/** Quarter-note duration in seconds (~120 BPM). */
export const HOME_BEAT = 0.5;

/** Melody phrases: [frequency Hz, beat offset, duration in beats]. Triangle wave. */
export const HOME_MELODY_NOTES: ReadonlyArray<readonly [number, number, number]> = [
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
export const HOME_HARMONY_NOTES: ReadonlyArray<readonly [number, number, number]> = [
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
export const HOME_BASS_NOTES: ReadonlyArray<readonly [number, number, number]> = [
  [130.81, 0.0, 3.8], // C3
  [98.0, 4.0, 3.8], // G2
  [110.0, 8.0, 3.8], // A2
  [98.0, 12.0, 3.8], // G2
];

/** Schedule a single loop pass of home-screen music starting at `loopStart` seconds. */
export const scheduleHomePass = (
  ctx: AudioContext,
  masterGain: GainNode,
  loopStart: number,
): void => {
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
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
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

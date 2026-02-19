const synth = window.speechSynthesis;
let _muted = false;

// --- Best-voice selection --------------------------------------------------
// We pick the best available English voice once (or when the voice list loads).
let _bestVoice: SpeechSynthesisVoice | null = null;

const pickVoice = (): void => {
  if (typeof synth.getVoices !== "function") return;
  const voices = synth.getVoices();
  const en = voices.filter(v => v.lang.startsWith("en"));
  if (en.length === 0) return;
  // Prefer voices that sound natural / deep for sports commentary.
  _bestVoice =
    en.find(v => /daniel|david|james|fred|ralph|alex|google\s+us\s+english/i.test(v.name)) ??
    en.find(v => v.default) ??
    en[0];
};

// Some browsers populate voices synchronously; others fire voiceschanged later.
pickVoice();
if (typeof synth.addEventListener === "function") {
  synth.addEventListener("voiceschanged", pickVoice);
}

// --- Message batching -------------------------------------------------------
// All log messages that arrive within BATCH_DELAY ms of each other are joined
// into one utterance so the announcer speaks a full sentence rather than many
// choppy fragments.
const BATCH_DELAY = 50;
let _pendingMessages: string[] = [];
let _batchTimer: ReturnType<typeof setTimeout> | null = null;

/** Strip visual-only decoration so the TTS doesn't read "equals equals equals". */
const toSpeechText = (msg: string): string => {
  const cleaned = msg
    .replace(/={2,}/g, "")         // strip === markers
    .replace(/^[\s\-|]+$/, "")     // skip lines that are only dashes/pipes
    .trim();
  return cleaned;
};

const flushBatch = (): void => {
  _batchTimer = null;
  const parts = _pendingMessages
    .map(toSpeechText)
    .filter(Boolean);
  _pendingMessages = [];
  if (parts.length === 0) return;

  const utterThis = new SpeechSynthesisUtterance(parts.join(". "));
  utterThis.rate = 1.15;   // slightly faster — sounds like a live commentator
  utterThis.pitch = 1.05;  // fractionally higher — adds energy without sounding unnatural
  utterThis.volume = 1;
  if (_bestVoice) utterThis.voice = _bestVoice;
  synth.speak(utterThis);
};

// ---------------------------------------------------------------------------

export const setMuted = (m: boolean): void => {
  _muted = m;
  if (m) {
    if (_batchTimer !== null) { clearTimeout(_batchTimer); _batchTimer = null; }
    _pendingMessages = [];
    synth.cancel();
  }
};

export const isMuted = (): boolean => _muted;

export const announce = (message: string): void => {
  if (_muted) return;
  _pendingMessages.push(message);
  if (_batchTimer !== null) clearTimeout(_batchTimer);
  _batchTimer = setTimeout(flushBatch, BATCH_DELAY);
};

export const cancelAnnouncements = (): void => {
  if (_batchTimer !== null) { clearTimeout(_batchTimer); _batchTimer = null; }
  _pendingMessages = [];
  synth.cancel();
};

export const canAnnounce = () => !(synth.speaking || synth.pending);

/** True while a batch is pending or the synth is actively speaking. */
export const isSpeechPending = (): boolean =>
  _batchTimer !== null || synth.speaking || synth.pending;

/** Play a short two-note chime to alert the manager. Respects the mute flag. */
export const playDecisionChime = (): void => {
  if (_muted) return;
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

// ---------------------------------------------------------------------------
// Shared helper used by the fanfares below.
// ---------------------------------------------------------------------------
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
  gain.gain.linearRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.start(start);
  osc.stop(start + dur + 0.02);
};

/** Triumphant rising fanfare played when the game ends. Ignores mute (it's the grand finale). */
export const playVictoryFanfare = (): void => {
  try {
    const Ctx: typeof AudioContext =
      window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t = ctx.currentTime;
    const n = (f: number, s: number, d: number) => makeFanfareNote(ctx, "square", f, t + s, d);

    // C  E  G  C5 — classic bugle-call rising fourth
    n(261.63, 0.00, 0.12); // C4
    n(329.63, 0.13, 0.12); // E4
    n(392.00, 0.26, 0.12); // G4
    n(523.25, 0.39, 0.45); // C5  (held)
    // Short flourish
    n(659.25, 0.60, 0.09); // E5
    n(783.99, 0.70, 0.09); // G5
    n(1046.5, 0.80, 0.55); // C6  (high finish)
  } catch (_e) {}
};

/** Plays the opening bars of "Take Me Out to the Ball Game" for the 7th-inning stretch.
 *  Respects the mute flag. */
export const play7thInningStretch = (): void => {
  if (_muted) return;
  try {
    const Ctx: typeof AudioContext =
      window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t = ctx.currentTime;
    // Use sine for a warm organ-like tone.
    const n = (f: number, s: number, d: number) => makeFanfareNote(ctx, "sine", f, t + s, d, 0.22);

    const q = 0.32; // quarter-note duration (seconds), ~ 94 BPM

    // "Take  me   out  to  the  ball   game" (G major)
    //  G4    E4   C4       E4   G4    G4
    n(392.00, 0 * q, q);          // "Take"
    n(329.63, 1 * q, q);          // "me"
    n(261.63, 2 * q, q * 1.5);    // "out"   (dotted quarter)
    n(261.63, 3.5 * q, q * 0.5);  // "to"    (eighth)
    n(329.63, 4 * q, q);          // "the"
    n(392.00, 5 * q, q);          // "ball"
    n(392.00, 6 * q, q * 2);      // "game"  (half)

    // "take  me   out  with the  crowd"
    //  A4    A4   A4   F4   A4   C5
    n(440.00, 8  * q, q);         // "take"
    n(440.00, 9  * q, q);         // "me"
    n(440.00, 10 * q, q * 1.5);   // "out"
    n(349.23, 11.5 * q, q * 0.5); // "with"
    n(440.00, 12 * q, q);         // "the"
    n(523.25, 13 * q, q * 2);     // "crowd"
  } catch (_e) {}
};

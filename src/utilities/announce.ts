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

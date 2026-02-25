const synth = window.speechSynthesis;

let _speechVolume = 1.0;

let _bestVoice: SpeechSynthesisVoice | null = null;

const pickVoice = (): void => {
  if (typeof synth.getVoices !== "function") return;
  const voices = synth.getVoices();
  const en = voices.filter((v) => v.lang.startsWith("en") && !/female/i.test(v.name));
  if (en.length === 0) {
    const fallback = voices.filter((v) => v.lang.startsWith("en"));
    _bestVoice = fallback.find((v) => v.default) ?? fallback[0] ?? null;
    return;
  }
  _bestVoice =
    en.find((v) => /daniel|david|james|fred|ralph|alex|google\s+us\s+english/i.test(v.name)) ??
    en.find((v) => /\bmale\b/i.test(v.name)) ??
    en.find((v) => v.default) ??
    en[0];
};

pickVoice();
if (typeof synth.addEventListener === "function") {
  synth.addEventListener("voiceschanged", pickVoice);
}

const BATCH_DELAY = 50;
let _pendingMessages: string[] = [];
let _batchTimer: ReturnType<typeof setTimeout> | null = null;

/** Strip visual-only decoration so the TTS doesn't read "equals equals equals". */
const toSpeechText = (msg: string): string => {
  const cleaned = msg
    .replace(/={2,}/g, "")
    .replace(/^[\s\-|]+$/, "")
    .trim();
  return cleaned;
};

// Default corresponds to SPEED_NORMAL (700 ms) → 1.15.
let _speechRate = 1.15;

let _preprocessor: ((text: string) => string) | null = null;

/**
 * Registers a text preprocessor that is applied to every announcement before
 * it is queued for TTS.  Pass `null` to clear.  Used to resolve
 * `custom:<id>` fragments to human-readable team names before speech.
 */
export const setAnnouncePreprocessor = (fn: ((text: string) => string) | null): void => {
  _preprocessor = fn;
};

const flushBatch = (): void => {
  _batchTimer = null;
  const parts = _pendingMessages.map(toSpeechText).filter(Boolean);
  _pendingMessages = [];
  if (parts.length === 0) return;

  const utterThis = new SpeechSynthesisUtterance(parts.join(". "));
  utterThis.rate = _speechRate;
  utterThis.pitch = 1.05;
  utterThis.volume = _speechVolume;
  if (_bestVoice) utterThis.voice = _bestVoice;
  synth.speak(utterThis);
};

export const setAnnouncementVolume = (v: number): void => {
  _speechVolume = Math.max(0, Math.min(1, v));
  if (_speechVolume === 0) {
    if (_batchTimer !== null) {
      clearTimeout(_batchTimer);
      _batchTimer = null;
    }
    _pendingMessages = [];
    synth.cancel();
  }
};

export const getAnnouncementVolume = (): number => _speechVolume;

export const announce = (message: string): void => {
  if (_speechVolume === 0) return;
  const processed = _preprocessor ? _preprocessor(message) : message;
  _pendingMessages.push(processed);
  if (_batchTimer !== null) clearTimeout(_batchTimer);
  _batchTimer = setTimeout(flushBatch, BATCH_DELAY);
};

export const cancelAnnouncements = (): void => {
  if (_batchTimer !== null) {
    clearTimeout(_batchTimer);
    _batchTimer = null;
  }
  _pendingMessages = [];
  synth.cancel();
};

/** Set the TTS speech rate. Call this when the autoplay speed changes.
 *  Maps the autoplay interval (ms) to a comfortable speech rate:
 *    1200ms (slow)   → 1.0  — clear, relaxed
 *     700ms (normal) → 1.15 — brisk commentator
 *     350ms (fast)   → 1.6  — excited rapid-fire
 */
export const setSpeechRate = (intervalMs: number): void => {
  const MIN_MS = 350;
  const MAX_MS = 1200;
  const MIN_RATE = 1.0;
  const MAX_RATE = 1.6;
  const clamped = Math.max(MIN_MS, Math.min(MAX_MS, intervalMs));
  const t = (MAX_MS - clamped) / (MAX_MS - MIN_MS);
  _speechRate = MIN_RATE + t * (MAX_RATE - MIN_RATE);
};

export const canAnnounce = () => !(synth.speaking || synth.pending);
export const isSpeechPending = (): boolean =>
  _batchTimer !== null || synth.speaking || synth.pending;

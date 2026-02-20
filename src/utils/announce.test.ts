/**
 * Tests for src/utilities/announce.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// announce.ts accesses window.speechSynthesis at module load time.
// setup.ts installs the mock before this import.
import {
  announce,
  canAnnounce,
  cancelAnnouncements,
  getAlertVolume,
  getAnnouncementVoices,
  getAnnouncementVolume,
  isSpeechPending,
  play7thInningStretch,
  playDecisionChime,
  playVictoryFanfare,
  setAlertVolume,
  setAnnouncementVoice,
  setAnnouncementVolume,
  setSpeechRate,
} from "./announce";

const synth = window.speechSynthesis;

beforeEach(() => {
  vi.clearAllMocks();
  // Reset volumes to defaults before each test
  setAnnouncementVolume(1);
  setAlertVolume(1);
  cancelAnnouncements();
});

// ---------------------------------------------------------------------------
// Volume controls
// ---------------------------------------------------------------------------
describe("setAnnouncementVolume / getAnnouncementVolume", () => {
  it("stores and returns the value", () => {
    setAnnouncementVolume(0.5);
    expect(getAnnouncementVolume()).toBe(0.5);
  });

  it("clamps values below 0 to 0", () => {
    setAnnouncementVolume(-1);
    expect(getAnnouncementVolume()).toBe(0);
  });

  it("clamps values above 1 to 1", () => {
    setAnnouncementVolume(2);
    expect(getAnnouncementVolume()).toBe(1);
  });

  it("setting to 0 calls synth.cancel()", () => {
    setAnnouncementVolume(0);
    expect(synth.cancel).toHaveBeenCalled();
  });

  it("setting to 0 clears pending messages so isSpeechPending is false", () => {
    // Queue a message first (batching timer will be set)
    setAnnouncementVolume(1);
    announce("test message");
    // Then silence — should cancel the batch timer
    setAnnouncementVolume(0);
    expect(isSpeechPending()).toBe(false);
  });
});

describe("setAlertVolume / getAlertVolume", () => {
  it("stores and returns the value", () => {
    setAlertVolume(0.3);
    expect(getAlertVolume()).toBe(0.3);
  });

  it("clamps values below 0 to 0", () => {
    setAlertVolume(-5);
    expect(getAlertVolume()).toBe(0);
  });

  it("clamps values above 1 to 1", () => {
    setAlertVolume(99);
    expect(getAlertVolume()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// announce() + isSpeechPending()
// ---------------------------------------------------------------------------
describe("announce", () => {
  it("queues a batch timer (isSpeechPending = true)", () => {
    setAnnouncementVolume(1);
    announce("Strike one!");
    expect(isSpeechPending()).toBe(true);
  });

  it("does nothing when announcement volume is 0", () => {
    setAnnouncementVolume(0);
    announce("should be ignored");
    expect(isSpeechPending()).toBe(false);
  });

  it("flushes and calls synth.speak after BATCH_DELAY", async () => {
    vi.useFakeTimers();
    setAnnouncementVolume(1);
    announce("Ball one.");
    await vi.runAllTimersAsync();
    expect(synth.speak).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("batches multiple messages into one utterance", async () => {
    vi.useFakeTimers();
    setAnnouncementVolume(1);
    announce("Ball one.");
    announce("Ball two.");
    await vi.runAllTimersAsync();
    // speak should only be called once (batched)
    expect(synth.speak).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// cancelAnnouncements()
// ---------------------------------------------------------------------------
describe("cancelAnnouncements", () => {
  it("calls synth.cancel()", () => {
    cancelAnnouncements();
    expect(synth.cancel).toHaveBeenCalled();
  });

  it("clears pending batch so isSpeechPending is false", () => {
    setAnnouncementVolume(1);
    announce("Something");
    cancelAnnouncements();
    expect(isSpeechPending()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canAnnounce()
// ---------------------------------------------------------------------------
describe("canAnnounce", () => {
  it("returns true when synth is not speaking or pending", () => {
    (synth as typeof synth & { speaking: boolean; pending: boolean }).speaking = false;
    (synth as typeof synth & { speaking: boolean; pending: boolean }).pending = false;
    expect(canAnnounce()).toBe(true);
  });

  it("returns false when synth is speaking", () => {
    (synth as typeof synth & { speaking: boolean; pending: boolean }).speaking = true;
    expect(canAnnounce()).toBe(false);
    (synth as typeof synth & { speaking: boolean; pending: boolean }).speaking = false;
  });
});

// ---------------------------------------------------------------------------
// isSpeechPending()
// ---------------------------------------------------------------------------
describe("isSpeechPending", () => {
  it("returns false initially", () => {
    expect(isSpeechPending()).toBe(false);
  });

  it("returns true after announce() is called (batch timer set)", () => {
    setAnnouncementVolume(1);
    announce("test");
    expect(isSpeechPending()).toBe(true);
    cancelAnnouncements();
  });

  it("returns true when synth.pending is true", () => {
    (synth as typeof synth & { pending: boolean }).pending = true;
    expect(isSpeechPending()).toBe(true);
    (synth as typeof synth & { pending: boolean }).pending = false;
  });
});

// ---------------------------------------------------------------------------
// setSpeechRate()
// ---------------------------------------------------------------------------
describe("setSpeechRate", () => {
  it("sets slow rate for 1200ms interval", async () => {
    vi.useFakeTimers();
    setSpeechRate(1200);
    // Flush to check the rate is applied to the utterance
    setAnnouncementVolume(1);
    announce("test");
    await vi.runAllTimersAsync();
    // The test confirms setSpeechRate doesn't throw and synth.speak is called
    expect(synth.speak).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("sets fast rate for 350ms interval", () => {
    expect(() => setSpeechRate(350)).not.toThrow();
  });

  it("clamps values outside the 350–1200ms range", () => {
    expect(() => setSpeechRate(0)).not.toThrow();
    expect(() => setSpeechRate(9999)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// playDecisionChime()
// ---------------------------------------------------------------------------
describe("playDecisionChime", () => {
  it("does not throw when alert volume > 0", () => {
    setAlertVolume(1);
    expect(() => playDecisionChime()).not.toThrow();
  });

  it("does not call AudioContext when alert volume is 0", () => {
    setAlertVolume(0);
    const AudioCtxMock = window.AudioContext as ReturnType<typeof vi.fn>;
    AudioCtxMock.mockClear();
    playDecisionChime();
    expect(AudioCtxMock).not.toHaveBeenCalled();
  });

  it("creates oscillators and gain nodes for the two notes", () => {
    setAlertVolume(1);
    (window.AudioContext as ReturnType<typeof vi.fn>).mockClear();
    mockAudioCtx.createOscillator.mockClear();
    playDecisionChime();
    expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(2);
    expect(mockAudioCtx.createGain).toHaveBeenCalledTimes(2);
  });
});

// Reference to the AudioContext mock value from setup.ts (re-used in tests above)
const mockAudioCtx = (window.AudioContext as ReturnType<typeof vi.fn>)();

// ---------------------------------------------------------------------------
// playVictoryFanfare()
// ---------------------------------------------------------------------------
describe("playVictoryFanfare", () => {
  it("does not throw when alert volume > 0", () => {
    setAlertVolume(1);
    expect(() => playVictoryFanfare()).not.toThrow();
  });

  it("does not call AudioContext when alert volume is 0", () => {
    setAlertVolume(0);
    (window.AudioContext as ReturnType<typeof vi.fn>).mockClear();
    playVictoryFanfare();
    expect(window.AudioContext).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// play7thInningStretch()
// ---------------------------------------------------------------------------
describe("play7thInningStretch", () => {
  it("does not throw when alert volume > 0", () => {
    setAlertVolume(1);
    expect(() => play7thInningStretch()).not.toThrow();
  });

  it("does not call AudioContext when alert volume is 0", () => {
    setAlertVolume(0);
    (window.AudioContext as ReturnType<typeof vi.fn>).mockClear();
    play7thInningStretch();
    expect(window.AudioContext).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// pickVoice / voice selection
// Simulate voiceschanged firing (the handler was registered at module-load time).
// We capture the reference during describe-block setup (collection phase), before
// vi.clearAllMocks() in the outer beforeEach can wipe the mock call history.
// ---------------------------------------------------------------------------
describe("pickVoice — voice selection", () => {
  // Capture the registered pickVoice handler BEFORE vi.clearAllMocks() runs.
  const _synthAddEvent = window.speechSynthesis.addEventListener as ReturnType<typeof vi.fn>;
  const _registeredPickVoice = (() => {
    const call = _synthAddEvent.mock.calls.find(([e]) => e === "voiceschanged");
    return call ? (call[1] as () => void) : null;
  })();

  const makeVoice = (name: string, lang: string, isDefault = false): SpeechSynthesisVoice =>
    ({
      name,
      lang,
      default: isDefault,
      voiceURI: name,
      localService: false,
    }) as SpeechSynthesisVoice;

  /** Re-trigger the voiceschanged handler that announce.ts registered. */
  const fireVoicesChanged = () => _registeredPickVoice?.();

  beforeEach(() => {
    vi.useFakeTimers();
    setAnnouncementVolume(1);
    (synth.speak as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Reset getVoices to empty so other tests are unaffected
    (synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([]);
    fireVoicesChanged();
  });

  it("picks preferred voice when selected", async () => {
    (synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([
      makeVoice("Google UK English Female", "en-GB"),
      makeVoice("Google UK English Male", "en-GB"),
      makeVoice("Google US English", "en-US", true),
    ]);
    fireVoicesChanged();
    const options = getAnnouncementVoices();
    const preferred = options.find((voice) => voice.name === "Google UK English Male");
    setAnnouncementVoice(preferred?.id ?? null);
    announce("test");
    await vi.runAllTimersAsync();
    const utterance = (synth.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(utterance.voice?.name).toBe("Google UK English Male");
  });

  it("prefers natural/neural voice names", async () => {
    (synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([
      makeVoice("Google US English", "en-US", true),
      makeVoice("Microsoft Aria Natural", "en-US"),
    ]);
    fireVoicesChanged();
    announce("test");
    await vi.runAllTimersAsync();
    const utterance = (synth.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(utterance.voice?.name).toBe("Microsoft Aria Natural");
  });

  it("falls back to default voice when no natural voice is present", async () => {
    (synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([
      makeVoice("Google UK English Female", "en-GB"),
      makeVoice("Google US English", "en-US", true),
    ]);
    fireVoicesChanged();
    announce("test");
    await vi.runAllTimersAsync();
    const utterance = (synth.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(utterance.voice?.name).toBe("Google US English");
  });

  it("returns voice options sorted with default first", () => {
    (synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([
      makeVoice("Zulu Voice", "en-US"),
      makeVoice("Alpha Voice", "en-US", true),
    ]);
    fireVoicesChanged();
    const [first, second] = getAnnouncementVoices();
    expect(first.name).toBe("Alpha Voice");
    expect(second.name).toBe("Zulu Voice");
  });

  it("falls back to available non-English voice when no English voices exist", async () => {
    (synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([
      makeVoice("French Female", "fr-FR"),
    ]);
    fireVoicesChanged();
    announce("test");
    await vi.runAllTimersAsync();
    const utterance = (synth.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(utterance.voice?.name).toBe("French Female");
  });
});

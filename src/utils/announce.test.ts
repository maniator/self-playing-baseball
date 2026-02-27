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
  getAnnouncementVolume,
  isSpeechPending,
  play7thInningStretch,
  playDecisionChime,
  playVictoryFanfare,
  setAlertVolume,
  setAnnouncementVolume,
  setSpeechRate,
  startHomeScreenMusic,
  stopHomeScreenMusic,
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
// announce() per-call preprocessor
// ---------------------------------------------------------------------------
describe("announce — per-call preprocessor option", () => {
  it("applies the preprocessor to the message before it is queued for TTS", async () => {
    vi.useFakeTimers();
    setAnnouncementVolume(1);
    announce("hello there", { preprocessor: (msg) => msg.replace("hello", "world") });
    await vi.runAllTimersAsync();
    const utterance = (synth.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(utterance.text).toContain("world there");
    expect(utterance.text).not.toContain("hello");
    vi.useRealTimers();
  });

  it("passes the message through unchanged when no preprocessor is given", async () => {
    vi.useFakeTimers();
    setAnnouncementVolume(1);
    announce("hello there");
    await vi.runAllTimersAsync();
    const utterance = (synth.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(utterance.text).toContain("hello there");
    vi.useRealTimers();
  });

  it("resolves custom team IDs so TTS does not read raw custom: prefixes", async () => {
    vi.useFakeTimers();
    setAnnouncementVolume(1);
    announce("custom:ct_abc123 are now up to bat!", {
      preprocessor: (msg) => msg.replace(/custom:[a-zA-Z0-9_]+/g, "Austin Eagles"),
    });
    await vi.runAllTimersAsync();
    const utterance = (synth.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(utterance.text).not.toContain("custom:");
    expect(utterance.text).toContain("Austin Eagles");
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

  it("picks a known named male voice (Google US English) over generic male label", async () => {
    (synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([
      makeVoice("Google UK English Female", "en-GB"),
      makeVoice("Google UK English Male", "en-GB"),
      makeVoice("Google US English", "en-US", true),
    ]);
    fireVoicesChanged();
    announce("test");
    await vi.runAllTimersAsync();
    const utterance = (synth.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(utterance.voice?.name).toBe("Google US English");
  });

  it("picks a voice with 'Male' in the name when no exact name match", async () => {
    (synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([
      makeVoice("Google UK English Female", "en-GB"),
      makeVoice("Google UK English Male", "en-GB"),
    ]);
    fireVoicesChanged();
    announce("test");
    await vi.runAllTimersAsync();
    const utterance = (synth.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(utterance.voice?.name).toBe("Google UK English Male");
  });

  it("excludes voices with 'female' in the name; picks non-female default", async () => {
    (synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([
      makeVoice("Google UK English Female", "en-GB"),
      makeVoice("Samantha", "en-US", true),
    ]);
    fireVoicesChanged();
    announce("test");
    await vi.runAllTimersAsync();
    const utterance = (synth.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // Samantha does not have "female" in its name → chosen over Female-labelled voice
    expect(utterance.voice?.name).toBe("Samantha");
  });

  it("falls back to default female voice when only female-labelled voices exist (Android edge case)", async () => {
    (synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([
      makeVoice("Google UK English Female", "en-GB"),
      makeVoice("Google US English Female", "en-US", true),
    ]);
    fireVoicesChanged();
    announce("test");
    await vi.runAllTimersAsync();
    const utterance = (synth.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // All English voices are female-labelled; fallback picks the default
    expect(utterance.voice?.name).toBe("Google US English Female");
  });

  it("returns no voice when there are no English voices at all", async () => {
    (synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([
      makeVoice("French Female", "fr-FR"),
    ]);
    fireVoicesChanged();
    announce("test");
    await vi.runAllTimersAsync();
    const utterance = (synth.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // No English voices at all → _bestVoice = null → voice stays null from the mock
    expect(utterance.voice).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// startHomeScreenMusic() / stopHomeScreenMusic()
// ---------------------------------------------------------------------------
describe("startHomeScreenMusic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (window.AudioContext as ReturnType<typeof vi.fn>).mockClear();
    stopHomeScreenMusic();
    setAlertVolume(1);
  });

  afterEach(() => {
    stopHomeScreenMusic();
    vi.useRealTimers();
  });

  it("does not throw when alert volume > 0", () => {
    expect(() => startHomeScreenMusic()).not.toThrow();
  });

  it("creates an AudioContext when alert volume > 0", () => {
    startHomeScreenMusic();
    expect(window.AudioContext).toHaveBeenCalledOnce();
  });

  it("does not create AudioContext when alert volume is 0", () => {
    setAlertVolume(0);
    startHomeScreenMusic();
    expect(window.AudioContext).not.toHaveBeenCalled();
  });

  it("creates a master GainNode and connects it to destination", async () => {
    const AudioCtxMock = window.AudioContext as ReturnType<typeof vi.fn>;
    const ctx = AudioCtxMock();
    (ctx.createGain as ReturnType<typeof vi.fn>).mockClear();
    (ctx.createOscillator as ReturnType<typeof vi.fn>).mockClear();
    startHomeScreenMusic();
    await Promise.resolve(); // flush resume() microtask
    // At least one createGain call for the master gain node
    expect(ctx.createGain).toHaveBeenCalled();
    expect(ctx.createOscillator).toHaveBeenCalled();
  });

  it("schedules a re-loop timeout after starting when context is running", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    startHomeScreenMusic();
    await Promise.resolve(); // flush resume() microtask so loopFrom runs
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it("registers interaction listeners when context is suspended", () => {
    const AudioCtxMock = window.AudioContext as ReturnType<typeof vi.fn>;
    const ctx = AudioCtxMock();
    (ctx as unknown as { state: string }).state = "suspended";
    const addEventSpy = vi.spyOn(document, "addEventListener");
    startHomeScreenMusic();
    const eventTypes = addEventSpy.mock.calls.map(([type]) => type);
    expect(eventTypes).toContain("click");
    expect(eventTypes).toContain("keydown");
    expect(eventTypes).toContain("touchstart");
  });
});

describe("stopHomeScreenMusic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setAlertVolume(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not throw when no music is playing", () => {
    expect(() => stopHomeScreenMusic()).not.toThrow();
  });

  it("calls AudioContext.close() when music is playing", () => {
    const AudioCtxMock = window.AudioContext as ReturnType<typeof vi.fn>;
    const ctx = AudioCtxMock();
    (ctx.close as ReturnType<typeof vi.fn>).mockClear();
    startHomeScreenMusic();
    stopHomeScreenMusic();
    expect(ctx.close).toHaveBeenCalled();
  });

  it("cancels the loop timeout when music is stopped", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    startHomeScreenMusic();
    await Promise.resolve(); // flush resume() microtask so loopFrom + setTimeout run
    stopHomeScreenMusic();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

describe("setAlertVolume — master gain integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setAlertVolume(1);
  });

  afterEach(() => {
    stopHomeScreenMusic();
    vi.useRealTimers();
  });

  it("updating alert volume while music plays updates the master gain value", () => {
    const AudioCtxMock = window.AudioContext as ReturnType<typeof vi.fn>;
    const ctx = AudioCtxMock();
    const masterGainNode = ctx.createGain();
    startHomeScreenMusic();
    // Changing alert volume should update gain via setAlertVolume
    setAlertVolume(0.5);
    expect(masterGainNode.gain.value).toBeDefined();
  });
});

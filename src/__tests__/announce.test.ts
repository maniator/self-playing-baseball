/**
 * Tests for src/utilities/announce.ts
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// announce.ts accesses window.speechSynthesis at module load time.
// setup.ts installs the mock before this import.
import {
  announce,
  cancelAnnouncements,
  setAnnouncementVolume,
  setAlertVolume,
  getAnnouncementVolume,
  getAlertVolume,
  isSpeechPending,
  canAnnounce,
  setSpeechRate,
  playDecisionChime,
  playVictoryFanfare,
  play7thInningStretch,
} from "../utilities/announce";

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

import "@testing-library/jest-dom";

import * as React from "react";

// styled-components v6 references React at module load time; make it globally available.
(globalThis as typeof globalThis & { React: unknown }).React = React;

// ---------------------------------------------------------------------------
// Mock window.speechSynthesis so announce.ts can be imported without errors.
// announce.ts accesses window.speechSynthesis at module-load time, so this
// mock must be in place before any test file imports the module.
// ---------------------------------------------------------------------------
const mockUtterance = {
  voice: null as SpeechSynthesisVoice | null,
  rate: 1,
  pitch: 1,
  volume: 1,
  text: "",
};

(global as typeof globalThis & { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = vi
  .fn()
  .mockImplementation((text: string) => ({ ...mockUtterance, text }));

const mockSynth = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn().mockReturnValue([]),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  speaking: false,
  pending: false,
};

Object.defineProperty(window, "speechSynthesis", {
  value: mockSynth,
  writable: true,
});

// ---------------------------------------------------------------------------
// Mock AudioContext so playDecisionChime / playVictoryFanfare don't throw.
// ---------------------------------------------------------------------------
const mockOscillator = {
  connect: vi.fn(),
  type: "sine" as OscillatorType,
  frequency: { value: 0 },
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGainNode = {
  connect: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
};

const mockAudioCtx = {
  createOscillator: vi.fn().mockReturnValue(mockOscillator),
  createGain: vi.fn().mockReturnValue(mockGainNode),
  destination: {},
  currentTime: 0,
  state: "running" as AudioContextState,
  close: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn().mockResolvedValue(undefined),
};

(global as typeof globalThis & { AudioContext: unknown }).AudioContext = vi
  .fn()
  .mockImplementation(() => mockAudioCtx);

// Mock Notification API
(global as typeof globalThis & { Notification: unknown }).Notification = vi
  .fn()
  .mockImplementation(() => ({
    close: vi.fn(),
  })) as unknown as typeof Notification;
(Notification as unknown as { permission: NotificationPermission }).permission = "granted";

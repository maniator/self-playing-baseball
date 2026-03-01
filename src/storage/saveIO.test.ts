import { afterEach, describe, expect, it, vi } from "vitest";

import {
  downloadJson,
  formatSaveDate,
  playerFilename,
  readFileAsText,
  saveFilename,
  teamsFilename,
} from "./saveIO";

describe("formatSaveDate", () => {
  it("returns a non-empty string for a valid timestamp", () => {
    const result = formatSaveDate(Date.now());
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a string for timestamp 0 (epoch)", () => {
    expect(typeof formatSaveDate(0)).toBe("string");
  });
});

describe("saveFilename", () => {
  it("includes the slugified save name", () => {
    const name = saveFilename("My Save Game");
    expect(name).toMatch(/^ballgame-my-save-game-/);
    expect(name).toMatch(/\.json$/);
  });

  it("falls back to 'save' when name is empty", () => {
    const name = saveFilename("");
    expect(name).toMatch(/^ballgame-save-/);
  });

  it("strips leading/trailing hyphens and special characters", () => {
    const name = saveFilename("!!!Test!!!");
    expect(name).toMatch(/^ballgame-test-/);
  });

  it("includes a compact timestamp segment", () => {
    // Compact timestamp is 15 chars: YYYYMMDDTHHmmss
    const name = saveFilename("x");
    const ts = name.replace(/^ballgame-x-/, "").replace(/\.json$/, "");
    expect(ts).toMatch(/^\d{8}T\d{6}$/);
  });
});

describe("teamsFilename", () => {
  it("starts with ballgame-teams- and ends with .json", () => {
    const name = teamsFilename();
    expect(name).toMatch(/^ballgame-teams-\d{8}T\d{6}\.json$/);
  });
});

describe("downloadJson", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloadJson creates an anchor with the given filename and clicks it", () => {
    const mockUrl = "blob:test";
    const createObjectURL = vi.fn().mockReturnValue(mockUrl);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const clicks: string[] = [];
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === "a") {
        const anchor = el as HTMLAnchorElement;
        vi.spyOn(anchor, "click").mockImplementation(() => {
          clicks.push(anchor.download);
        });
      }
      return el;
    });

    downloadJson('{"test":1}', "test-file.json");
    expect(clicks).toContain("test-file.json");
    expect(createObjectURL).toHaveBeenCalledOnce();
  });
});

describe("readFileAsText", () => {
  it("resolves with the file content", async () => {
    const file = new File(["hello world"], "test.txt", { type: "text/plain" });
    const result = await readFileAsText(file);
    expect(result).toBe("hello world");
  });

  it("rejects when FileReader result is not a string", async () => {
    const file = new File(["data"], "test.txt");
    const origFileReader = globalThis.FileReader;
    class MockFileReader {
      onload: ((ev: ProgressEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        // Fire onload with a non-string result
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: null } } as unknown as ProgressEvent);
          }
        }, 0);
      }
    }
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
    await expect(readFileAsText(file)).rejects.toThrow("Failed to read file");
    globalThis.FileReader = origFileReader;
  });
});

describe("playerFilename", () => {
  it("formats a named player filename correctly", () => {
    const name = playerFilename("John Smith");
    expect(name).toMatch(/^ballgame-player-john-smith-\d{8}T\d{6}\.json$/);
  });

  it("falls back to 'player' slug when name is empty", () => {
    const name = playerFilename("");
    expect(name).toMatch(/^ballgame-player-player-\d{8}T\d{6}\.json$/);
  });

  it("slugifies names with special characters", () => {
    const name = playerFilename("O'Brien Jr.");
    expect(name).toMatch(/^ballgame-player-o-brien-jr-\d{8}T\d{6}\.json$/);
  });
});

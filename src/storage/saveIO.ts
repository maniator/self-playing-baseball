/**
 * Pure utility functions shared between SavesModal (in-game) and SavesPage (/saves route).
 * No React, no RxDB hooks — these can be called from any context.
 */

/** Formats a Unix-ms timestamp as a short human-readable date/time string. */
export const formatSaveDate = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Triggers a browser download of a JSON string with the given filename.
 * Creates a temporary object URL, clicks it, then revokes it.
 */
export const downloadJson = (json: string, filename: string): void => {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Reads a File as a UTF-8 text string, returning a Promise.
 * Rejects with an Error if the FileReader fails.
 */
export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });

/** Derives a safe download filename from a save's name field. */
export const saveFilename = (saveName: string): string =>
  `ballgame-${saveName
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()}.json`;

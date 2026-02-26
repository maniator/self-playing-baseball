/**
 * Pure utility functions shared between SavesModal (in-game) and SavesPage (/saves route).
 * No React, no RxDB hooks — these are browser-context only (use document, Blob, URL, FileReader).
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
 * Creates a temporary object URL, appends the anchor to the DOM, clicks it,
 * then removes it and revokes the URL on the next tick (deferred revoke avoids
 * intermittent download failures in some browsers).
 */
export const downloadJson = (json: string, filename: string): void => {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
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

/** Formats a Date as a compact ISO-like timestamp: `YYYYMMDDTHHmmss`. */
const compactTimestamp = (date: Date): string => {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

/**
 * Derives a safe download filename from a save's name field.
 * Appends a compact timestamp (YYYYMMDDTHHmmss) so repeated exports of the
 * same save don't overwrite each other on disk.
 */
export const saveFilename = (saveName: string): string => {
  const slug =
    saveName
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "save";
  return `ballgame-${slug}-${compactTimestamp(new Date())}.json`;
};

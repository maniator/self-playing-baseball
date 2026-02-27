import * as React from "react";

const GAME_LS_KEYS = [
  "speed",
  "announcementVolume",
  "alertVolume",
  "managerMode",
  "strategy",
  "managedTeam",
  "autoPlay",
];

const clearGameStorage = () => {
  try {
    GAME_LS_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
  try {
    indexedDB.deleteDatabase("ballgame");
  } catch {
    // ignore
  }
};

/** Returns true when the error is a dynamic-import / chunk-load failure. */
export function isChunkLoadError(err: unknown): boolean {
  if (err == null) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? (err.name ?? "") : "";
  return (
    name === "ChunkLoadError" ||
    /ChunkLoadError/.test(msg) ||
    /Loading chunk \d+ failed/.test(msg) ||
    /Failed to fetch dynamically imported module/.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Unable to preload CSS/.test(msg)
  );
}

interface State {
  hasError: boolean;
  message: string;
  isChunkLoad: boolean;
}

const BTN_STYLE: React.CSSProperties = {
  border: "none",
  padding: "12px 24px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 15,
  fontFamily: "inherit",
  fontWeight: "bold",
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, message: "", isChunkLoad: false };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : String(err),
      isChunkLoad: isChunkLoadError(err),
    };
  }

  handleReset = () => {
    clearGameStorage();
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleHardReload = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
    } catch {
      // ignore SW errors
    }
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignore cache errors
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { message, isChunkLoad } = this.state;

    return (
      <div
        style={{
          color: "#fff",
          padding: "40px 24px",
          fontFamily: "Lucida Console, monospace",
          background: "#000",
          minHeight: "100vh",
        }}
      >
        <h1 style={{ color: "aquamarine" }}>⚾ Something went wrong</h1>
        <p style={{ color: "#ff8080", fontSize: 13 }}>{message}</p>
        {isChunkLoad ? (
          <>
            <p style={{ color: "#cce0ff", fontSize: 14, maxWidth: 480 }}>
              This usually happens after an update. Reloading should fix it.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={this.handleReload}
                style={{ ...BTN_STYLE, background: "#22c55e", color: "#000" }}
              >
                🔄 Reload app
              </button>
              <button
                onClick={this.handleHardReload}
                style={{ ...BTN_STYLE, background: "#facc15", color: "#000" }}
              >
                ⚡ Hard reload (clear cache)
              </button>
            </div>
            <p style={{ color: "#888", fontSize: 12, maxWidth: 480, marginTop: 24 }}>
              Still broken after reloading?
            </p>
            <button
              onClick={this.handleReset}
              style={{ ...BTN_STYLE, background: "#374151", color: "#fff", fontSize: 13 }}
            >
              🗑️ Clear all app data &amp; reload
            </button>
          </>
        ) : (
          <>
            <p style={{ color: "#cce0ff", fontSize: 14, maxWidth: 480 }}>
              Your saved data may be corrupted. Resetting will clear local app data (including
              saves) and reload the page.
            </p>
            <button
              onClick={this.handleReset}
              style={{ ...BTN_STYLE, background: "#22c55e", color: "#000" }}
            >
              🔄 Reset &amp; Reload
            </button>
          </>
        )}
      </div>
    );
  }
}

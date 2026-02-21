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
};

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  handleReset = () => {
    clearGameStorage();
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

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
        <p style={{ color: "#ff8080", fontSize: 13 }}>{this.state.message}</p>
        <p style={{ color: "#cce0ff", fontSize: 14, maxWidth: 480 }}>
          Your saved data may be corrupted. Resetting will clear local app data and reload the page.
        </p>
        <button
          onClick={this.handleReset}
          style={{
            background: "#22c55e",
            color: "#000",
            border: "none",
            padding: "12px 24px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 15,
            fontFamily: "inherit",
            fontWeight: "bold",
          }}
        >
          🔄 Reset &amp; Reload
        </button>
      </div>
    );
  }
}

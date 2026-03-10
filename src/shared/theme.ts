export const theme = {
  colors: {
    // Backgrounds
    bgVoid: "#000000",
    bgSurface: "#0d1b2e",
    bgInput: "#1a2e4a",
    bgInputSm: "#1a2440",
    bgGame: "#0a1628",
    bgDeep: "#0a0a1a",

    // Borders
    borderPanel: "#2a3a5a",
    borderForm: "#4a6090",
    borderSubtle: "#2a2a3a",
    borderDark: "#1e3050",
    borderGreen: "#3a7a5a",
    borderDanger: "#883333",

    // Text
    textPrimary: "#ffffff",
    textBody: "#cce0ff",
    textDialog: "#e0f0ff",
    textMuted: "#aaaaaa",
    textDimmer: "#666666",
    textHint: "#6680aa",
    textLink: "#aaccff",
    textSecondaryLink: "#88bbee",
    textScore: "#e8d5a3",
    textScoreHeader: "#8abadf",

    // Accent
    accentPrimary: "aquamarine",
    accentGreen: "#6effc0",
    accentGold: "#f5c842",

    // Status / interactive
    greenBg: "#1a3a2a",
    greenHover: "#254f38",
    greenActive: "#0e2418",
    redDanger: "#ff7070",
    redBg: "#b30000",
    blueDark: "#0f4880",
    goldWarn: "#7a3200",

    // BSO indicators
    bsoBall: "#44cc88",
    bsoStrike: "#f5c842",
    bsoOut: "#ff7070",
  },
  fonts: {
    sans: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace',
    score: '"Courier New", Courier, monospace',
  },
  fontSizes: {
    xs: "10px",
    sm: "11px",
    base: "13px",
    md: "14px",
    lg: "15px",
    xl: "17px",
    xxl: "1.3rem",
    heading: "1.5rem",
    title: "2.2rem",
    logo: "3rem",
  },
  radii: {
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    full: "9999px",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    xxl: "24px",
  },
} as const;

export type AppTheme = typeof theme;

export const theme = {
  colors: {
    // Backgrounds
    bgVoid: "#000000",
    bgSurface: "#0d1b2e",
    bgInput: "#1a2e4a",
    bgInputSm: "#1a2440",
    bgGame: "#0a1628",
    bgDeep: "#0a0a1a",
    bgGameDeep: "#071020",
    bgSurfaceAlt: "#1a1a2e",
    bgPlayerDetail: "#0d1117",
    bgImport: "#0a1525",
    bgDropdown: "#111111",
    bgPaginationHover: "#25254a",
    successBg: "#0d2016",

    // Borders
    borderPanel: "#2a3a5a",
    borderCard: "#2a3f60",
    borderForm: "#4a6090",
    borderSubtle: "#2a2a3a",
    borderDark: "#1e3050",
    borderGreen: "#3a7a5a",
    borderDanger: "#883333",
    borderLog: "#333333",
    borderDarkest: "#222222",
    borderMid: "#444444",
    borderGameError: "#884e4e",
    borderGameSection: "#2a2a2a",
    borderLineScore: "#1e3a5f",
    borderLineScoreCell: "#0f2540",
    borderLineScoreOff: "#2e4a6f",
    borderTableRow: "#1a1a2a",
    borderWarn: "#886600",
    borderSavesDanger: "#7a3030",
    borderWhiteAlpha: "rgba(255, 255, 255, 0.4)",
    borderFormAlpha35: "rgba(74, 96, 144, 0.35)",
    borderFormAlpha40: "rgba(74, 96, 144, 0.4)",
    borderFormAlpha30: "rgba(74, 96, 144, 0.3)",

    // Text
    textPrimary: "#ffffff",
    textBody: "#cce0ff",
    textBodyAlt: "#cce8ff",
    textDialog: "#e0f0ff",
    textMuted: "#aaaaaa",
    textSemiLight: "#bbbbbb",
    textLight: "#cccccc",
    textDisabled: "#555555",
    textDimmer: "#666666",
    textDropdown: "#dddddd",
    textHint: "#6680aa",
    textLink: "#aaccff",
    textSecondaryLink: "#88bbee",
    textScore: "#e8d5a3",
    textScoreHeader: "#8abadf",
    textScoreDim: "#3d5a7a",
    textNavBlue: "#6ab0e0",
    textNavBlueDim: "#4a8abe",
    textDimBlue: "#3a5070",
    textFaint: "#a0b4d0",
    textModalLink: "#7a9abf",
    textReadOnly: "#8899bb",
    textBlueMid: "#5577aa",
    textGold: "#f0c040",
    textTeamInfo: "#ccaa66",

    // Accent
    accentPrimary: "aquamarine",
    accentGreen: "#6effc0",
    accentGreenBright: "#5fffbb",
    accentGold: "#f5c842",
    /** High-contrast dark text on aquamarine/green accent buttons */
    btnTextDark: "darkblue",

    // Status / interactive
    greenBg: "#1a3a2a",
    greenHover: "#254f38",
    greenActive: "#0e2418",
    redDanger: "#ff7070",
    redBg: "#b30000",
    blueDark: "#0f4880",
    goldWarn: "#7a3200",
    buttonNewBg: "#22c55e",
    buttonNewBgHover: "#16a34a",
    statusOkGreen: "#4ade80",
    statusWarnYellow: "#fbbf24",

    // BSO indicators
    bsoBall: "#44cc88",
    bsoStrike: "#f5c842",
    bsoOut: "#ff7070",

    // Countdown bar states
    countdownWarn: "#ffaa33",
    countdownDanger: "#ff4444",

    // Diamond / field indicators
    baseOccupied: "#3f4f7e",
    baseAway: "#ff21b1",
    fieldGrass: "#aac32b",
    fieldDirt: "#886c36",

    // Danger actions
    dangerText: "#ff7777",
    dangerHoverBg: "#2a0000",
    dangerHoverBorder: "#cc4444",

    // Error / Warning
    errorBg: "#1a0000",
    errorBgTransparent: "rgba(80, 0, 0, 0.3)",
    textError: "#ff8080",
    bgSavesDangerHover: "rgba(120, 48, 48, 0.4)",
    bgFormAlpha40: "rgba(74, 96, 144, 0.4)",
    warnText: "#ff8888",
    textWarnOrange: "#ff9977",
    textWarnGold: "#ffdd88",
    textWarnBright: "#ffcc44",
    bgWarnDeep: "#1a1a00",

    // Fatigue level indicators
    textFatigueHigh: "#ff6b6b",
    textFatigueMed: "#ffd06b",

    // Decision panel
    bgDecisionOverlay: "rgba(0, 30, 60, 0.92)",
    bgDecisionSection: "#1a2e1a",
    bgDecisionButton: "#3a4a6a",
    textDecisionActive: "#e0f8f0",
    textDecisionHighlight: "#aaffcc",

    // Overlays
    overlayDark: "rgba(0, 0, 0, 0.75)",
    overlayMedDark: "rgba(0, 0, 0, 0.65)",
    overlayLight: "rgba(0, 0, 0, 0.6)",
    shadowDark: "rgba(0, 0, 0, 0.9)",

    // Navigation / help button
    helpButtonBg: "rgba(47, 63, 105, 0.7)",
    helpButtonBgHover: "rgba(74, 96, 144, 0.9)",
    navGroupBg: "rgba(47, 63, 105, 0.5)",
    bgNavSection: "rgba(47, 63, 105, 0.35)",
    bgFormAlpha15: "rgba(74, 96, 144, 0.15)",
    bgFormAlpha60: "rgba(74, 96, 144, 0.6)",

    // Player selection highlights
    bgPlayerSelected: "rgba(106, 176, 224, 0.12)",
    bgPlayerHover: "rgba(106, 176, 224, 0.18)",
    bgSubtle: "rgba(255, 255, 255, 0.04)",

    // Exhibition error
    bgExhibitionError: "rgba(220, 40, 40, 0.15)",
    borderExhibitionError: "rgba(220, 40, 40, 0.4)",

    // Subdued text (between textMuted and textDimmer)
    textSubdued: "#888888",
  },
  fonts: {
    sans: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace',
    score: '"Courier New", Courier, monospace',
  },
  fontSizes: {
    // px-based — UI chrome (labels, badges, buttons)
    xs: "10px",
    sm: "11px",
    label: "12px",
    base: "13px",
    md: "14px",
    lg: "15px",
    display: "16px",
    xl: "17px",
    dialogTitle: "18px",
    f20: "20px",
    // rem-based — body text (scales with root font size)
    tiny: "0.7rem",
    sub: "0.85rem",
    subLg: "0.9rem",
    body: "0.95rem",
    bodyLg: "1rem",
    bodyXl: "1.05rem",
    // rem-based — headings
    h3: "1.2rem",
    xxl: "1.3rem",
    h2: "1.4rem",
    heading: "1.5rem",
    h1: "1.6rem",
    displaySm: "1.8rem",
    displayMd: "2.5rem",
    title: "2.2rem",
    logo: "3rem",
  },
  radii: {
    xxs: "2px",
    s3: "3px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    card: "10px",
    dialog: "14px",
    pill: "20px",
    full: "9999px",
  },
  spacing: {
    xxs: "2px",
    s3: "3px",
    xs: "4px",
    s5: "5px",
    s6: "6px",
    s7: "7px",
    sm: "8px",
    s10: "10px",
    md: "12px",
    s14: "14px",
    lg: "16px",
    s18: "18px",
    xl: "20px",
    s22: "22px",
    xxl: "24px",
    s28: "28px",
    xxxl: "32px",
    s40: "40px",
    s48: "48px",
  },
  letterSpacing: {
    tight: "0.04em",
    normal: "0.5px",
    wide: "0.6px",
    wider: "0.8px",
    widest: "1px",
  },
  sizes: {
    // minimum heights / fixed dimensions for interactive elements
    inputSm: "30px",
    inputMd: "32px",
    inputLg: "36px",
    btnMd: "36px",
    btnLg: "44px",
    btnXl: "48px",
    btnXxl: "52px",
    icon: "25px",
    iconSm: "14px",
    progressBar: "4px",
    countdownLabel: "52px",
    /** Bottom-safe-area offset used in page/home containers to clear the nav bar. */
    bottomBar: "80px",
    /** Minimum height for the import/export paste textarea. */
    pasteTextarea: "80px",
  },
} as const;

export type AppTheme = typeof theme;

export const brand = {
  name: "Sohoist",
  descriptor: "PRIVATE INTRODUCTIONS",
  shortDescriptor: "Private Introductions",
  positioning: "Low-stakes dating, matched by real-life vibe.",
} as const;

export const colors = {
  paper: "#F5EFE6",
  warmIvory: "#EFE7DC",
  fogBlue: "#DCE6EA",
  stone: "#5D5A57",
  ink: "#2B2A28",
  dustLavender: "#B8AFC9",
  mutedTeal: "#8FAFB3",
  warmAmber: "#D6B56D",
  borderSoft: "rgba(120, 100, 75, 0.14)",
  borderGraphite: "rgba(43, 42, 40, 0.18)",
} as const;

export const heroOverlay = {
  web: {
    scrim: [
      "linear-gradient(to top,",
      "  rgba(18,17,16,0.96) 0%,",
      "  rgba(18,17,16,0.74) 36%,",
      "  rgba(18,17,16,0.46) 68%,",
      "  rgba(18,17,16,0.26) 100%",
      ")",
    ].join(" "),
  },
  native: {
    scrim: "rgba(0, 0, 0, 0.48)",
    topScrim: "transparent",
  },
} as const;

export const logo = {
  nativeSize: 42,
  webSize: 40,
} as const;

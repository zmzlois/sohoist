import { colors as brandColors } from "@packages/ui";

/**
 * sohoist design tokens for expo / react native.
 * mirrors the css variables in apps/web/src/app/globals.css exactly.
 *
 * cormorant garamond is loaded in _layout.tsx via @expo-google-fonts/cormorant-garamond.
 * in react native, italic fonts must be registered as separate named families —
 * use fonts.displayItalic as fontFamily (not fontStyle: "italic" + fonts.display).
 */

export const colors = {
  ...brandColors,
} as const;

/** font family strings — use with StyleSheet fontFamily */
export const fonts = {
  /* cormorant — local files, loaded in _layout.tsx */
  display: "Cormorant-Regular",
  displayItalic: "Cormorant-Italic",
  displayMedium: "Cormorant-Medium",
  displayMediumItalic: "Cormorant-MediumItalic",
  displaySemiBold: "Cormorant-SemiBold",
  /* inter — registered in _layout.tsx as shorthand names */
  body: "Regular",
  bodyMedium: "Medium",
  bodySemiBold: "SemiBold",
  bodyBold: "Bold",
  /* system mono — IBM Plex Mono can be added via @expo-google-fonts/ibm-plex-mono */
  mono: "Courier New",
} as const;

export const radius = {
  sm: 10,
  md: 16,
  card: 20,
  pill: 999,
  phone: 36,
} as const;

export const shadow = {
  paper: { boxShadow: "0px 12px 40px rgba(70, 50, 30, 0.08)" },
  elevated: { boxShadow: "0px 24px 80px rgba(70, 50, 30, 0.14)" },
  subtle: { boxShadow: "0px 6px 20px rgba(70, 50, 30, 0.06)" },
} as const;

/** spacing rhythm — 4pt base grid */
export const spacing = {
  screenH: 20 /* horizontal screen padding */,
  cardPad: 18 /* card inner padding */,
  sectionGap: 24 /* between major sections */,
  titleTop: 56 /* top spacing under header */,
  ctaHeight: 52 /* bottom CTA button height */,
} as const;

export const typography = {
  /** hero / section headline */
  display: {
    fontFamily: fonts.display,
    fontWeight: "400" as const,
    letterSpacing: -0.5,
    lineHeight: 40,
    fontSize: 36,
    color: colors.ink,
  },
  /** editorial tagline / pull quote — uses the italic font family directly,
   *  not fontStyle: "italic", because rn requires a separately registered face */
  editorial: {
    fontFamily: fonts.displayItalic,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
  },
  /** profile name */
  profileName: {
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    color: colors.ink,
  },
  /** standard body copy */
  body: {
    fontFamily: fonts.body,
    fontWeight: "400" as const,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
  },
  /** small section label — uppercase */
  label: {
    fontFamily: fonts.bodyMedium,
    fontWeight: "500" as const,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    color: colors.stone,
  },
  /** data / trust metrics */
  mono: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.stone,
  },
} as const;

/** reusable StyleSheet fragments */
export const components = {
  /** paper card surface */
  paperCard: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.cardPad,
    ...shadow.paper,
  },
  /** page background */
  pageBg: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  /** primary CTA — dark pill */
  primaryButton: {
    height: spacing.ctaHeight,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 24,
    ...shadow.subtle,
  },
  primaryButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    fontWeight: "500" as const,
    color: colors.paper,
  },
  /** secondary ghost pill */
  secondaryButton: {
    height: spacing.ctaHeight,
    borderRadius: radius.pill,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderGraphite,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  /** stamped badge */
  badge: {
    borderRadius: radius.pill,
    backgroundColor: "rgba(220, 230, 234, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.ink,
  },
  /** thin graphite divider */
  divider: {
    height: 1,
    backgroundColor: "rgba(93, 90, 87, 0.18)",
    marginVertical: 12,
  },
} as const;

/** full token export, mirrors web sohoistTheme */
export const theme = {
  colors,
  fonts,
  radius,
  shadow,
  spacing,
  typography,
  components,
} as const;
export default theme;

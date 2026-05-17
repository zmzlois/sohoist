import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export const palette = {
  paper: "#F5EFE6",
  ivory: "#EFE7DC",
  fogBlue: "#DCE6EA",
  stone: "#5D5A57",
  ink: "#2B2A28",
  teal: "#8FAFB3",
  amber: "#D6B56D",
  lavender: "#B8AFC9",
  border: "rgba(93,90,87,0.16)",
  borderHard: "rgba(43,42,40,0.22)",
  display: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-inter), Inter, sans-serif",
  mono: "var(--font-mono), 'IBM Plex Mono', monospace",
};

export type StatusTone = "neutral" | "amber" | "teal" | "lavender" | "danger";

export function MemberScaffold({
  eyebrow,
  title,
  subtitle,
  children,
  right,
  narrow = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  right?: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link href="/dashboard" style={styles.wordmarkWrap}>
          <span style={styles.wordmark}>Sohoist</span>
          <span style={styles.wordmarkLabel}>Private Introductions</span>
        </Link>
        <nav style={styles.nav}>
          <Link href="/dashboard/brief" style={styles.navLink}>
            Brief
          </Link>
          <Link href="/dashboard/photo" style={styles.navLink}>
            Photo
          </Link>
          <Link href="/dashboard/referrals" style={styles.navLink}>
            Referrals
          </Link>
          <Link href="/dashboard/introductions" style={styles.navLink}>
            Intros
          </Link>
          <Link href="/dashboard/privacy" style={styles.navLink}>
            Privacy
          </Link>
          {right}
        </nav>
      </header>

      <main
        style={{
          ...styles.main,
          maxWidth: narrow ? 760 : 1040,
        }}
      >
        <section style={styles.hero}>
          {eyebrow ? <p style={styles.eyebrow}>{eyebrow}</p> : null}
          <h1 style={styles.title}>{title}</h1>
          {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
        </section>
        {children}
      </main>
    </div>
  );
}

export function PaperCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return <section style={{ ...styles.card, ...style }}>{children}</section>;
}

export function SectionHeading({
  label,
  detail,
}: {
  label: string;
  detail?: ReactNode;
}) {
  return (
    <div style={styles.sectionHeading}>
      <p style={styles.sectionLabel}>{label}</p>
      {detail ? <div style={styles.sectionDetail}>{detail}</div> : null}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  const colors = {
    neutral: { bg: "rgba(220,230,234,0.72)", color: palette.stone },
    amber: { bg: "rgba(214,181,109,0.18)", color: "#7A5C14" },
    teal: { bg: "rgba(143,175,179,0.22)", color: "#3D7277" },
    lavender: { bg: "rgba(184,175,201,0.22)", color: "#6B5F82" },
    danger: { bg: "rgba(192,57,43,0.10)", color: "#9B352B" },
  }[tone];

  return (
    <span
      style={{
        ...styles.badge,
        backgroundColor: colors.bg,
        color: colors.color,
        borderColor: `${colors.color}33`,
      }}
    >
      {children}
    </span>
  );
}

export const form = {
  grid: {
    display: "grid",
    gap: 18,
  } as CSSProperties,
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  } as CSSProperties,
  label: {
    display: "block",
    fontFamily: palette.body,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: palette.stone,
    marginBottom: 8,
  } as CSSProperties,
  hint: {
    fontFamily: palette.body,
    fontSize: 12,
    color: palette.stone,
    opacity: 0.72,
    margin: "-2px 0 10px",
    lineHeight: 1.55,
  } as CSSProperties,
  input: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 48,
    borderRadius: 16,
    border: `1px solid ${palette.border}`,
    backgroundColor: "rgba(245,239,230,0.72)",
    color: palette.ink,
    fontFamily: palette.body,
    fontSize: 14,
    padding: "0 16px",
    outline: "none",
  } as CSSProperties,
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 132,
    borderRadius: 16,
    border: `1px solid ${palette.border}`,
    backgroundColor: "rgba(245,239,230,0.72)",
    color: palette.ink,
    fontFamily: palette.body,
    fontSize: 14,
    lineHeight: 1.65,
    padding: 16,
    resize: "vertical",
    outline: "none",
  } as CSSProperties,
  primary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: 999,
    border: "none",
    backgroundColor: palette.ink,
    color: palette.paper,
    fontFamily: palette.body,
    fontSize: 14,
    fontWeight: 500,
    padding: "0 24px",
    cursor: "pointer",
    textDecoration: "none",
  } as CSSProperties,
  secondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: 999,
    border: `1px solid ${palette.borderHard}`,
    backgroundColor: "transparent",
    color: palette.ink,
    fontFamily: palette.body,
    fontSize: 14,
    fontWeight: 500,
    padding: "0 24px",
    cursor: "pointer",
    textDecoration: "none",
  } as CSSProperties,
  error: {
    margin: 0,
    fontFamily: palette.body,
    fontSize: 13,
    color: "#9B352B",
  } as CSSProperties,
};

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: palette.paper,
    color: palette.ink,
  } as CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    maxWidth: 1180,
    margin: "0 auto",
    padding: "20px 32px",
    borderBottom: `1px solid ${palette.border}`,
  } as CSSProperties,
  wordmarkWrap: {
    display: "grid",
    gap: 2,
    color: palette.ink,
    textDecoration: "none",
  } as CSSProperties,
  wordmark: {
    fontFamily: palette.display,
    fontSize: 24,
    lineHeight: 1,
    letterSpacing: "-0.02em",
  } as CSSProperties,
  wordmarkLabel: {
    fontFamily: palette.body,
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: palette.stone,
    opacity: 0.7,
  } as CSSProperties,
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 14,
  } as CSSProperties,
  navLink: {
    fontFamily: palette.body,
    fontSize: 12,
    color: palette.stone,
    textDecoration: "none",
  } as CSSProperties,
  main: {
    width: "100%",
    margin: "0 auto",
    padding: "42px 32px 84px",
    boxSizing: "border-box",
  } as CSSProperties,
  hero: {
    marginBottom: 28,
  } as CSSProperties,
  eyebrow: {
    margin: "0 0 10px",
    fontFamily: palette.body,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: palette.teal,
  } as CSSProperties,
  title: {
    margin: 0,
    maxWidth: 720,
    fontFamily: palette.display,
    fontSize: "clamp(2.2rem, 5vw, 4rem)",
    fontWeight: 400,
    letterSpacing: "-0.02em",
    lineHeight: 1.02,
    color: palette.ink,
  } as CSSProperties,
  subtitle: {
    maxWidth: 600,
    margin: "14px 0 0",
    fontFamily: palette.body,
    fontSize: 14,
    lineHeight: 1.72,
    color: palette.stone,
  } as CSSProperties,
  card: {
    background:
      "linear-gradient(180deg, rgba(255,252,244,0.94), rgba(250,243,232,0.9))",
    border: "1px solid rgba(120,100,75,0.14)",
    borderRadius: 20,
    boxShadow:
      "0 12px 40px rgba(70,50,30,0.08), inset 0 1px 0 rgba(255,255,255,0.72)",
    padding: 24,
  } as CSSProperties,
  sectionHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 14,
    marginBottom: 14,
  } as CSSProperties,
  sectionLabel: {
    margin: 0,
    fontFamily: palette.body,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: palette.stone,
  } as CSSProperties,
  sectionDetail: {
    fontFamily: palette.mono,
    fontSize: 12,
    color: palette.stone,
    opacity: 0.65,
  } as CSSProperties,
  badge: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    borderRadius: 999,
    border: "1px solid",
    fontFamily: palette.body,
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "4px 10px",
  } as CSSProperties,
} as const;

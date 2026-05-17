import Image from "next/image";
import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";

import heroImage from "../../public/images/friend-gather-hero.png";
import logoImage from "../../public/images/logo.png";

export default function Home() {
  return (
    <main
      style={{ position: "relative", height: "100svh", overflow: "hidden" }}
    >
      {/* ── hero image — full bleed ───────────────────────────────────────── */}
      <Image
        src={heroImage}
        alt="Friends gathered at a candlelit dinner"
        fill
        priority
        style={{ objectFit: "cover", objectPosition: "center 35%" }}
      />

      {/* ── gradient overlay — heavy at bottom where text lives ──────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "linear-gradient(to top,",
            "  rgba(27,25,23,0.92) 0%,",
            "  rgba(27,25,23,0.60) 38%,",
            "  rgba(27,25,23,0.18) 65%,",
            "  rgba(27,25,23,0.04) 100%",
            ")",
          ].join(" "),
        }}
      />

      {/* ── sign in link — top right ──────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 28, right: 28, zIndex: 20 }}>
        <Link
          href="/sign-in"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            fontWeight: 500,
            color: "#F5EFE6",
            textDecoration: "none",
            padding: "7px 16px",
            borderRadius: 999,
            backgroundColor: "rgba(43,42,40,0.45)",
            border: "1px solid rgba(245,239,230,0.18)",
            backdropFilter: "blur(8px)",
            display: "inline-block",
          }}
        >
          Sign in →
        </Link>
      </div>

      {/* ── brand mark — top left ─────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: "28px",
          left: "28px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            boxShadow: "0 2px 12px rgba(0,0,0,0.28)",
          }}
        >
          <Image
            src={logoImage}
            alt="Sohoist"
            width={40}
            height={40}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      {/* ── hero content — left-centered ─────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            padding: "0 28px",
            maxWidth: "1180px",
            width: "100%",
            marginInline: "auto",
          }}
        >
          <p
            className="text-label"
            style={{ color: "var(--color-muted-teal)", marginBottom: "18px" }}
          >
            By introduction only
          </p>

          <h1
            className="text-display"
            style={{
              fontSize: "clamp(2.8rem, 5.5vw, 5rem)",
              color: "#F5EFE6",
              lineHeight: 1.0,
              maxWidth: "680px",
              marginBottom: "20px",
            }}
          >
            Low-stakes dating, <em>match by vibe</em> in real life.
          </h1>

          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              color: "rgba(245,239,230,0.68)",
              maxWidth: "420px",
              lineHeight: 1.7,
              marginBottom: "28px",
            }}
          >
            A private introduction network where trusted people make thoughtful
            matches — not endless swiping.
          </p>

          <WaitlistForm />
        </div>
      </div>
    </main>
  );
}

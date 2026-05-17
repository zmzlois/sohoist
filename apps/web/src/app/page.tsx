import Image from "next/image";
import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";
import { HeroHeader, heroHeaderLinkStyle } from "@/components/common/heroChrome";
import { heroOverlay } from "@packages/ui";
import { webImages } from "@packages/ui/assets/web";

export default function Home() {
  return (
    <main
      style={{ position: "relative", height: "100svh", overflow: "hidden" }}
    >
      {/* ── hero image — full bleed ───────────────────────────────────────── */}
      <Image
        src={webImages.heroDinner}
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
          background: heroOverlay.web.scrim,
        }}
      />

      <HeroHeader
        right={
          <Link href="/sign-in" style={heroHeaderLinkStyle}>
            Sign in →
          </Link>
        }
      />

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

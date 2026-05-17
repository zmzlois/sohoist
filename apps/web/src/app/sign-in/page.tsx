"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import {
  HeroHeader,
  heroCtaTextStyle,
  heroHeaderLinkStyle,
} from "@/components/common/heroChrome";
import { heroOverlay } from "@packages/ui";
import { webImages } from "@packages/ui/assets/web";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const redirectTo =
        new URLSearchParams(window.location.search).get("callbackUrl") ??
        "/dashboard";
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        redirectTo,
      });

      if (result?.error) {
        setError("Those details did not match.");
        return;
      }

      router.push(result?.url ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Sign in failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{ position: "relative", height: "100svh", overflow: "hidden" }}
    >
      {/* hero image */}
      <Image
        src={webImages.heroDinner}
        alt="Friends at a candlelit dinner"
        fill
        priority
        style={{ objectFit: "cover", objectPosition: "center 35%" }}
      />

      {/* gradient — heaviest at bottom */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: heroOverlay.web.scrim,
        }}
      />

      <HeroHeader
        right={
          <Link href="/" style={heroHeaderLinkStyle}>
            ← Back
          </Link>
        }
      />

      {/* sign-in panel — bottom */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          transform: "translateY(-50%)",
          padding: "0 24px",
          maxWidth: 480,
          marginInline: "auto",
        }}
      >
        <p
          className="text-label"
          style={{ color: "var(--color-muted-teal)", marginBottom: 16 }}
        >
          Members only
        </p>

        <h1
          className="text-display"
          style={{
            fontSize: "clamp(2rem, 5vw, 3rem)",
            color: "#F5EFE6",
            lineHeight: 1.05,
            marginBottom: 10,
          }}
        >
          Sign in privately.
        </h1>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "rgba(245,239,230,0.6)",
            lineHeight: 1.65,
            marginBottom: 32,
          }}
        >
          Private introductions through people you trust.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            style={{
              height: 52,
              borderRadius: 999,
              border: "1px solid rgba(245,239,230,0.22)",
              backgroundColor: "rgba(245,239,230,0.12)",
              color: "#F5EFE6",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              padding: "0 20px",
              outline: "none",
              backdropFilter: "blur(8px)",
            }}
          />

          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            style={{
              height: 52,
              borderRadius: 999,
              border: "1px solid rgba(245,239,230,0.22)",
              backgroundColor: "rgba(245,239,230,0.12)",
              color: "#F5EFE6",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              padding: "0 20px",
              outline: "none",
              backdropFilter: "blur(8px)",
            }}
          />

          {error ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 12,
                color: "rgba(245,239,230,0.68)",
                margin: "2px 0 0",
              }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              height: 52,
              borderRadius: 999,
              backgroundColor: "#F5EFE6",
              border: "none",
              ...heroCtaTextStyle,
              color: "#2B2A28",
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
              transition: "opacity 0.15s",
            }}
          >
            {loading ? <Spinner /> : null}
            Continue privately
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "24px 0",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              backgroundColor: "rgba(245,239,230,0.14)",
            }}
          />
          <p
            className="text-label"
            style={{ color: "rgba(245,239,230,0.3)", fontSize: 9 }}
          >
            by invitation only
          </p>
          <div
            style={{
              flex: 1,
              height: 1,
              backgroundColor: "rgba(245,239,230,0.14)",
            }}
          />
        </div>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 12,
            color: "rgba(245,239,230,0.35)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Not a member?{" "}
          <Link
            href="/"
            style={{
              color: "rgba(245,239,230,0.55)",
              textDecoration: "underline",
            }}
          >
            Apply for an introduction
          </Link>
        </p>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: "2px solid rgba(43,42,40,0.2)",
        borderTopColor: "#2B2A28",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

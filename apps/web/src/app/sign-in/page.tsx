"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import heroImage from "../../../public/images/friend-gather-hero.png";
import logoImage from "../../../public/images/logo.png";

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
        src={heroImage}
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
          background: [
            "linear-gradient(to top,",
            "  rgba(27,25,23,0.96) 0%,",
            "  rgba(27,25,23,0.72) 42%,",
            "  rgba(27,25,23,0.22) 70%,",
            "  rgba(27,25,23,0.04) 100%",
            ")",
          ].join(" "),
        }}
      />

      {/* wordmark */}
      <div
        style={{
          position: "absolute",
          top: 28,
          left: 28,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
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
        <div>
          <p
            className="text-display"
            style={{
              fontSize: 22,
              color: "#F5EFE6",
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            Sohoist
          </p>
          <p
            className="text-label"
            style={{
              fontSize: 8,
              color: "rgba(245,239,230,0.5)",
              marginTop: 3,
              letterSpacing: "0.12em",
            }}
          >
            Private Introductions
          </p>
        </div>
      </div>

      {/* back to home — top right */}
      <div style={{ position: "absolute", top: 32, right: 28 }}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "rgba(245,239,230,0.55)",
            textDecoration: "none",
          }}
        >
          ← Back
        </Link>
      </div>

      {/* sign-in panel — bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "0 24px 52px",
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
            placeholder="Password (leave blank if you're Lois)"
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
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 500,
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

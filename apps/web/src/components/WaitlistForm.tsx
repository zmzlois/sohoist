"use client";

import { useState } from "react";
import { heroCtaTextStyle } from "@/components/common/heroChrome";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextEmail = email.trim();
    if (!nextEmail || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, source: "landing" }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not join the list.");
      }

      setSubmitted(true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not join the list.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "1.25rem",
            color: "#F5EFE6",
          }}
        >
          You&apos;re on the list.
        </p>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            color: "rgba(245,239,230,0.6)",
            marginTop: "8px",
          }}
        >
          We&apos;ll reach out when your city circle opens.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "14px",
          padding: "0 20px",
          height: "44px",
          borderRadius: "var(--radius-pill)",
          border: "1px solid rgba(245,239,230,0.25)",
          backgroundColor: "rgba(245,239,230,0.12)",
          color: "#F5EFE6",
          outline: "none",
          minWidth: "240px",
        }}
      />
      <button
        type="submit"
        className="primary-button"
        disabled={submitting}
        style={{
          background: "#F5EFE6",
          color: "#2B2A28",
          boxShadow: "none",
          ...heroCtaTextStyle,
          opacity: submitting ? 0.72 : 1,
          cursor: submitting ? "default" : "pointer",
        }}
      >
        {submitting ? "Joining..." : "Join now"}
      </button>
      {error ? (
        <p
          style={{
            flexBasis: "100%",
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            color: "rgba(245,239,230,0.72)",
            marginTop: "2px",
          }}
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}

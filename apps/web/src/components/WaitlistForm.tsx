"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
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
          You're on the list.
        </p>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            color: "rgba(245,239,230,0.6)",
            marginTop: "8px",
          }}
        >
          We'll reach out when your city circle opens.
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
        style={{ background: "#F5EFE6", color: "#2B2A28", boxShadow: "none" }}
      >
        Join privately now
      </button>
    </form>
  );
}

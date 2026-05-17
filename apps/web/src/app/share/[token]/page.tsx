"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { webImages } from "@packages/ui/assets/web";

const t = {
  paper: "#F5EFE6",
  ivory: "#EFE7DC",
  stone: "#5D5A57",
  ink: "#2B2A28",
  teal: "#8FAFB3",
  amber: "#D6B56D",
  border: "rgba(93,90,87,0.14)",
  display: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-inter), Inter, sans-serif",
};

export default function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;

  const data = useQuery(api.profile.getProfileByShareToken, { token });

  if (data === undefined) {
    return (
      <div style={loadingStyle}>
        <p style={{ fontFamily: t.body, fontSize: 13, color: t.stone }}>
          Loading…
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={loadingStyle}>
        <p style={{ fontFamily: t.body, fontSize: 13, color: t.stone }}>
          This profile is no longer available.
        </p>
      </div>
    );
  }

  const {
    displayName,
    city,
    aboutBullets,
    lookingForBullets,
    tags,
    sketchUrl,
    homePhotos,
  } = data;
  const firstName = displayName.split(" ")[0];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: t.paper }}>
      {/* minimal header */}
      <header
        style={{
          borderBottom: `1px solid ${t.border}`,
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 680,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Image
            src={webImages.logoMark}
            alt=""
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              objectFit: "cover",
            }}
            priority
          />
          <span
            style={{
              fontFamily: t.display,
              fontSize: 18,
              color: t.ink,
              letterSpacing: "-0.02em",
            }}
          >
            Sohoist
          </span>
        </div>
        {isSignedIn ? (
          <Link
            href="/dashboard"
            style={{
              fontFamily: t.body,
              fontSize: 12,
              color: t.stone,
              textDecoration: "none",
              opacity: 0.65,
            }}
          >
            My dashboard →
          </Link>
        ) : (
          <Link
            href={`/sign-in?next=/share/${token}`}
            style={{
              fontFamily: t.body,
              fontSize: 12,
              fontWeight: 500,
              color: t.paper,
              backgroundColor: t.ink,
              textDecoration: "none",
              borderRadius: 999,
              padding: "6px 16px",
            }}
          >
            Join Sohoist
          </Link>
        )}
      </header>

      <main
        style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}
      >
        {/* portrait */}
        {sketchUrl && (
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              marginBottom: 24,
              backgroundColor: t.ivory,
              border: `1px solid ${t.border}`,
              boxShadow: "0 12px 40px rgba(70,50,30,0.07)",
              maxHeight: 420,
              display: "flex",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sketchUrl}
              alt={`${firstName}'s pencil portrait`}
              style={{ width: "100%", maxHeight: 420, objectFit: "contain" }}
            />
          </div>
        )}

        {/* name + city */}
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              margin: "0 0 4px",
              fontFamily: t.display,
              fontSize: "clamp(2rem, 6vw, 3rem)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: t.ink,
              lineHeight: 1.05,
            }}
          >
            {displayName}
          </h1>
          {city && (
            <p
              style={{
                margin: 0,
                fontFamily: t.body,
                fontSize: 13,
                color: t.stone,
                opacity: 0.7,
              }}
            >
              {city}
            </p>
          )}
          {tags.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 10,
              }}
            >
              {tags.map((tag) => (
                <span key={tag} style={tagStyle}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          style={{ height: 1, backgroundColor: t.border, marginBottom: 24 }}
        />

        {/* who i am — first bullet always visible */}
        {aboutBullets.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <p style={sectionLabel}>Who I am</p>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <li style={bulletStyle}>– {aboutBullets[0]}</li>
              {isSignedIn
                ? aboutBullets.slice(1).map((b, i) => (
                    <li key={i} style={bulletStyle}>
                      – {b}
                    </li>
                  ))
                : aboutBullets.length > 1 && (
                    <BlurGate name={firstName} token={token} />
                  )}
            </ul>
          </section>
        )}

        {/* who i am looking for — all blurred for non-users */}
        {lookingForBullets.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <p style={sectionLabel}>Who I am looking for</p>
            {isSignedIn ? (
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {lookingForBullets.map((b, i) => (
                  <li key={i} style={bulletStyle}>
                    – {b}
                  </li>
                ))}
              </ul>
            ) : (
              <BlurGate name={firstName} token={token} />
            )}
          </section>
        )}

        {/* home photos — visible only to signed-in users */}
        {homePhotos.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <p style={sectionLabel}>At home</p>
            {isSignedIn ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
                  gap: 10,
                }}
              >
                {homePhotos.map((photo, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: 14,
                      overflow: "hidden",
                      aspectRatio: "4/3",
                      backgroundColor: t.ivory,
                      position: "relative",
                    }}
                  >
                    {photo.url && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.caption ?? `Home ${i + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        {photo.caption && (
                          <p
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              margin: 0,
                              padding: "6px 10px",
                              fontFamily: t.body,
                              fontSize: 10,
                              color: "#F5EFE6",
                              backgroundColor: "rgba(43,42,40,0.52)",
                            }}
                          >
                            {photo.caption}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <BlurGate name={firstName} token={token} />
            )}
          </section>
        )}

        {/* footer cta for non-users */}
        {!isSignedIn && (
          <div
            style={{
              borderRadius: 20,
              border: `1px solid ${t.border}`,
              backgroundColor: t.ivory,
              padding: "24px",
              textAlign: "center",
              marginTop: 32,
            }}
          >
            <p
              style={{
                margin: "0 0 6px",
                fontFamily: t.display,
                fontStyle: "italic",
                fontSize: 22,
                color: t.ink,
              }}
            >
              Know someone who&apos;d click?
            </p>
            <p
              style={{
                margin: "0 0 20px",
                fontFamily: t.body,
                fontSize: 13,
                color: t.stone,
                lineHeight: 1.6,
              }}
            >
              Sohoist is a private introduction network. Join to make thoughtful
              introductions.
            </p>
            <Link
              href={`/sign-in?next=/share/${token}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 48,
                borderRadius: 999,
                backgroundColor: t.ink,
                color: t.paper,
                fontFamily: t.body,
                fontSize: 14,
                fontWeight: 500,
                padding: "0 28px",
                textDecoration: "none",
              }}
            >
              Join to see more about {firstName}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function BlurGate({ name, token }: { name: string; token: string }) {
  return (
    <div style={{ position: "relative" }}>
      {/* blurred placeholder lines */}
      <div
        style={{
          filter: "blur(5px)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {[
          "I tend to gravitate toward people who are...",
          "Chemistry matters more than...",
          "Looking for someone who values...",
        ].map((line, i) => (
          <p
            key={i}
            style={{
              margin: "0 0 8px",
              fontFamily: t.body,
              fontSize: 14,
              color: t.ink,
              lineHeight: 1.7,
            }}
          >
            – {line}
          </p>
        ))}
      </div>
      {/* overlay cta */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(to bottom, rgba(245,239,230,0.1), rgba(245,239,230,0.85))",
          borderRadius: 8,
        }}
      >
        <Link
          href={`/sign-in?next=/share/${token}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 40,
            borderRadius: 999,
            backgroundColor: t.ink,
            color: t.paper,
            fontFamily: t.body,
            fontSize: 13,
            fontWeight: 500,
            padding: "0 20px",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Join to see more about {name}
        </Link>
      </div>
    </div>
  );
}

const loadingStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#F5EFE6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const sectionLabel: React.CSSProperties = {
  margin: "0 0 10px",
  fontFamily: t.body,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: t.teal,
};

const bulletStyle: React.CSSProperties = {
  fontFamily: t.body,
  fontSize: 14,
  color: t.ink,
  lineHeight: 1.7,
};

const tagStyle: React.CSSProperties = {
  fontFamily: t.body,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.05em",
  padding: "3px 10px",
  borderRadius: 999,
  backgroundColor: "rgba(220,230,234,0.72)",
  border: "1px solid rgba(93,90,87,0.10)",
  color: t.stone,
};

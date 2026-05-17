"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  form,
  MemberScaffold,
  PaperCard,
  palette,
  SectionHeading,
  StatusBadge,
} from "@/components/member/MemberScaffold";

type Visibility =
  | "hidden"
  | "referrers_only"
  | "trusted_circle"
  | "public_preview";

const VISIBILITY_OPTIONS: { value: Visibility; label: string; note: string }[] =
  [
    {
      value: "hidden",
      label: "Hidden",
      note: "Not visible to anyone. Referrers cannot view your brief.",
    },
    {
      value: "referrers_only",
      label: "Approved referrers only",
      note: "Only approved trusted referrers can view your brief.",
    },
    {
      value: "trusted_circle",
      label: "Trusted circle",
      note: "Visible to your trusted circle and approved referrers.",
    },
    {
      value: "public_preview",
      label: "Public preview",
      note: "A limited version can be shared with a private link.",
    },
  ];

export default function PrivacyPage() {
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? "";
  const profile = useQuery(
    api.profile.getMyProfile,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const updateProfile = useMutation(api.profile.updateProfile);

  const [seeded, setSeeded] = useState(false);
  const [ghostMode, setGhostMode] = useState(true);
  const [visibility, setVisibility] = useState<Visibility>("referrers_only");
  const [hideRewardAmount, setHideRewardAmount] = useState(false);
  const [hideCity, setHideCity] = useState(false);
  const [hideProfession, setHideProfession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile || seeded) return;
    setGhostMode(profile.ghostMode);
    setVisibility(profile.visibility as Visibility);
    setHideRewardAmount(profile.hideRewardAmount);
    setHideCity(profile.hideCity);
    setHideProfession(profile.hideProfession);
    setSeeded(true);
  }, [profile, seeded]);

  async function handleSave() {
    if (saving || !sessionEmail) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({
        email: sessionEmail,
        ghostMode,
        visibility,
        hideRewardAmount,
        hideCity,
        hideProfession,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <MemberScaffold
      eyebrow="Ghost Mode"
      title="Stay private until you choose to be introduced."
      subtitle="Control what referrers and candidates can see before a real introduction exists."
      narrow
    >
      <PaperCard>
        <SectionHeading
          label="Privacy controls"
          detail={
            profile?.ghostMode ? (
              <StatusBadge>Ghost Mode</StatusBadge>
            ) : (
              <StatusBadge tone="teal">Visible</StatusBadge>
            )
          }
        />

        {profile === undefined ? (
          <p style={{ margin: 0, color: palette.stone }}>Loading...</p>
        ) : !profile ? (
          <p style={{ margin: 0, color: palette.stone }}>
            Create your profile before editing privacy.
          </p>
        ) : (
          <div style={form.grid}>
            <ToggleRow
              label="Ghost Mode"
              note="When on, your profile is hidden from browsing surfaces and only appears where you explicitly allow it."
              value={ghostMode}
              onChange={setGhostMode}
            />

            <div>
              <span style={form.label}>Who can see your brief</span>
              <div style={{ display: "grid", gap: 10 }}>
                {VISIBILITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVisibility(option.value)}
                    style={{
                      ...visibilityStyle,
                      borderColor:
                        visibility === option.value
                          ? palette.teal
                          : palette.border,
                      backgroundColor:
                        visibility === option.value
                          ? "rgba(143,175,179,0.14)"
                          : "rgba(245,239,230,0.52)",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{option.label}</span>
                    <span style={{ color: palette.stone, fontSize: 12 }}>
                      {option.note}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <ToggleRow
              label="Hide reward amount"
              note='Show "reward funded" instead of the exact amount.'
              value={hideRewardAmount}
              onChange={setHideRewardAmount}
            />
            <ToggleRow
              label="Hide exact city"
              note="Show broader context without exposing your exact location."
              value={hideCity}
              onChange={setHideCity}
            />
            <ToggleRow
              label="Hide profession"
              note="Keep work context out of the intro brief."
              value={hideProfession}
              onChange={setHideProfession}
            />

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={form.primary}
            >
              {saving ? "Saving..." : saved ? "Saved" : "Save privacy settings"}
            </button>
          </div>
        )}
      </PaperCard>
    </MemberScaffold>
  );
}

function ToggleRow({
  label,
  note,
  value,
  onChange,
}: {
  label: string;
  note: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: "100%",
        border: `1px solid ${palette.border}`,
        borderRadius: 18,
        backgroundColor: "rgba(245,239,230,0.52)",
        padding: 16,
        display: "flex",
        justifyContent: "space-between",
        gap: 18,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span>
        <span
          style={{
            display: "block",
            fontFamily: palette.body,
            fontSize: 14,
            fontWeight: 500,
            color: palette.ink,
            marginBottom: 4,
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: "block",
            fontFamily: palette.body,
            fontSize: 12,
            lineHeight: 1.55,
            color: palette.stone,
          }}
        >
          {note}
        </span>
      </span>
      <span
        aria-hidden
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          backgroundColor: value ? palette.ink : "rgba(93,90,87,0.20)",
          padding: 3,
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            display: "block",
            width: 18,
            height: 18,
            borderRadius: "50%",
            backgroundColor: palette.paper,
            transform: value ? "translateX(20px)" : "translateX(0)",
            transition: "transform 0.15s ease",
          }}
        />
      </span>
    </button>
  );
}

const visibilityStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 70,
  borderRadius: 18,
  border: "1px solid",
  color: palette.ink,
  fontFamily: palette.body,
  padding: "14px 16px",
  display: "grid",
  gap: 4,
  textAlign: "left",
  cursor: "pointer",
};

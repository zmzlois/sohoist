"use client";

import Image from "next/image";
import { useState } from "react";
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
import { webImages } from "@packages/ui/assets/web";

type DepositTier = "minimum" | "half" | "full";

const AMOUNTS = [100, 250, 500];
const TERMS = [
  "Funds are held in trust once payment collection is connected.",
  "The reward releases only when the intro is accepted by both people.",
  "The relationship must be mutually confirmed and active for six months.",
  "Open disputes pause the payout review until resolved.",
];

export default function RewardPoolPage() {
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? "";
  const rewardPool = useQuery(
    api.rewardPools.getMyRewardPool,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const createRewardPool = useMutation(api.rewardPools.createRewardPool);

  const [draft, setDraft] = useState<{
    amount: number;
    customAmount: string;
    depositTier: DepositTier;
    hideAmount: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [termsAcceptedDraft, setTermsAccepted] = useState<boolean | null>(null);

  const termsAccepted =
    termsAcceptedDraft ?? Boolean(rewardPool?.termsAcceptedAt);

  const values =
    draft ??
    (rewardPool
      ? {
          amount: Math.round(rewardPool.amount / 100),
          customAmount: "",
          depositTier: rewardPool.depositTier as DepositTier,
          hideAmount: rewardPool.hideAmount,
        }
      : {
          amount: 250,
          customAmount: "",
          depositTier: "minimum" as DepositTier,
          hideAmount: false,
        });

  function updateDraft(patch: Partial<typeof values>) {
    setDraft({ ...values, ...patch });
  }

  const selectedAmount = values.customAmount
    ? Number(values.customAmount)
    : values.amount;
  const canSave =
    Number.isFinite(selectedAmount) &&
    selectedAmount >= 100 &&
    termsAccepted &&
    !saving;

  async function handleSave() {
    if (!canSave || !sessionEmail) return;
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      await createRewardPool({
        email: sessionEmail,
        amount: Math.round(selectedAmount * 100),
        depositTier: values.depositTier,
        hideAmount: values.hideAmount,
        termsAccepted,
      });
      setSaved(true);
    } catch {
      setError("Couldn't save your reward pool. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MemberScaffold
      eyebrow="Private reward"
      title="Set your private reward."
      subtitle="A thank-you signal for the person who makes a thoughtful introduction."
      narrow
    >
      <PaperCard>
        <SectionHeading
          label="Reward pool"
          detail={
            rewardPool ? (
              <StatusBadge tone="teal">{rewardPool.status}</StatusBadge>
            ) : (
              <StatusBadge tone="amber">Not created</StatusBadge>
            )
          }
        />

        <Image
          src={webImages.rewardCard}
          alt=""
          style={rewardImageStyle}
          priority
        />

        <div style={form.grid}>
          <div>
            <span style={form.label}>Amount</span>
            <div style={amountGridStyle}>
              {AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    updateDraft({ amount: value, customAmount: "" });
                  }}
                  style={{
                    ...amountStyle,
                    borderColor:
                      !values.customAmount && values.amount === value
                        ? palette.amber
                        : palette.border,
                    backgroundColor:
                      !values.customAmount && values.amount === value
                        ? "rgba(214,181,109,0.13)"
                        : "rgba(245,239,230,0.54)",
                  }}
                >
                  ${value}
                </button>
              ))}
            </div>
          </div>

          <label>
            <span style={form.label}>Custom amount</span>
            <input
              type="number"
              min={100}
              value={values.customAmount}
              onChange={(event) =>
                updateDraft({ customAmount: event.target.value })
              }
              placeholder="Minimum $100"
              style={form.input}
            />
          </label>

          <div>
            <span style={form.label}>Deposit tier</span>
            <div style={{ display: "grid", gap: 10 }}>
              {(
                [
                  ["minimum", "Test a small amount first"],
                  ["half", "Fund half now"],
                  ["full", "Fund the full reward"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateDraft({ depositTier: value })}
                  style={{
                    ...tierStyle,
                    borderColor:
                      values.depositTier === value
                        ? palette.teal
                        : palette.border,
                    backgroundColor:
                      values.depositTier === value
                        ? "rgba(143,175,179,0.14)"
                        : "rgba(245,239,230,0.54)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label style={checkStyle}>
            <input
              type="checkbox"
              checked={values.hideAmount}
              onChange={(event) =>
                updateDraft({ hideAmount: event.target.checked })
              }
            />
            <span>{'Hide exact amount and show "reward funded" instead.'}</span>
          </label>

          <div style={termsStyle}>
            <SectionHeading
              label="Terms"
              detail={
                rewardPool?.termsAcceptedAt ? (
                  <StatusBadge tone="teal">Accepted</StatusBadge>
                ) : (
                  "Required"
                )
              }
            />
            <ul style={termsListStyle}>
              {TERMS.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
            <label style={{ ...checkStyle, marginTop: 14 }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />
              <span>
                I understand these release conditions and the payment provider
                will complete the escrow-like collection step.
              </span>
            </label>
          </div>

          {error ? <p style={form.error}>{error}</p> : null}
          {saved ? (
            <p style={{ margin: 0, color: palette.teal }}>Reward pool saved.</p>
          ) : null}

          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            style={{
              ...form.primary,
              opacity: canSave ? 1 : 0.45,
              cursor: canSave ? "pointer" : "default",
            }}
          >
            {saving ? "Saving..." : "I trust you"}
          </button>
        </div>
      </PaperCard>
    </MemberScaffold>
  );
}

const rewardImageStyle: React.CSSProperties = {
  width: "100%",
  height: 190,
  objectFit: "cover",
  borderRadius: 16,
  border: `1px solid ${palette.border}`,
  display: "block",
  marginBottom: 24,
};

const amountGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10,
};

const amountStyle: React.CSSProperties = {
  minHeight: 72,
  borderRadius: 18,
  border: "1px solid",
  color: palette.ink,
  fontFamily: palette.mono,
  fontSize: 22,
  cursor: "pointer",
};

const tierStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  borderRadius: 16,
  border: "1px solid",
  color: palette.ink,
  fontFamily: palette.body,
  fontSize: 14,
  textAlign: "left",
  padding: "0 16px",
  cursor: "pointer",
};

const checkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontFamily: palette.body,
  fontSize: 13,
  color: palette.stone,
};

const termsStyle: React.CSSProperties = {
  borderRadius: 18,
  border: `1px solid ${palette.border}`,
  backgroundColor: "rgba(220,230,234,0.34)",
  padding: 16,
};

const termsListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  color: palette.ink,
  fontFamily: palette.body,
  fontSize: 13,
  lineHeight: 1.7,
};

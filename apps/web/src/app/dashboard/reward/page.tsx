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

type DepositTier = "minimum" | "half" | "full";

const AMOUNTS = [100, 250, 500];

export default function RewardPoolPage() {
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? "";
  const rewardPool = useQuery(
    api.rewardPools.getMyRewardPool,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const createRewardPool = useMutation(api.rewardPools.createRewardPool);

  const [amount, setAmount] = useState(250);
  const [customAmount, setCustomAmount] = useState("");
  const [depositTier, setDepositTier] = useState<DepositTier>("minimum");
  const [hideAmount, setHideAmount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!rewardPool) return;
    setAmount(Math.round(rewardPool.amount / 100));
    setDepositTier(rewardPool.depositTier as DepositTier);
    setHideAmount(rewardPool.hideAmount);
  }, [rewardPool]);

  const selectedAmount = customAmount ? Number(customAmount) : amount;
  const canSave =
    Number.isFinite(selectedAmount) && selectedAmount >= 100 && !saving;

  async function handleSave() {
    if (!canSave || !sessionEmail) return;
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      await createRewardPool({
        email: sessionEmail,
        amount: Math.round(selectedAmount * 100),
        depositTier,
        hideAmount,
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

        <div style={envelopeStyle} aria-hidden>
          <div style={flapStyle} />
          <div style={sealStyle}>S</div>
        </div>

        <div style={form.grid}>
          <div>
            <span style={form.label}>Amount</span>
            <div style={amountGridStyle}>
              {AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAmount(value);
                    setCustomAmount("");
                  }}
                  style={{
                    ...amountStyle,
                    borderColor:
                      !customAmount && amount === value
                        ? palette.amber
                        : palette.border,
                    backgroundColor:
                      !customAmount && amount === value
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
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
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
                  onClick={() => setDepositTier(value)}
                  style={{
                    ...tierStyle,
                    borderColor:
                      depositTier === value ? palette.teal : palette.border,
                    backgroundColor:
                      depositTier === value
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
              checked={hideAmount}
              onChange={(event) => setHideAmount(event.target.checked)}
            />
            <span>Hide exact amount and show "reward funded" instead.</span>
          </label>

          <p style={form.hint}>
            This saves reward intent only. Payment collection still depends on
            the escrow provider decision.
          </p>

          {error ? <p style={form.error}>{error}</p> : null}
          {saved ? (
            <p style={{ margin: 0, color: palette.teal }}>
              Reward pool saved.
            </p>
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

const envelopeStyle: React.CSSProperties = {
  height: 148,
  borderRadius: 12,
  border: `1px solid ${palette.border}`,
  background:
    "linear-gradient(180deg, rgba(245,239,230,0.2), rgba(214,181,109,0.12))",
  position: "relative",
  overflow: "hidden",
  marginBottom: 24,
};

const flapStyle: React.CSSProperties = {
  position: "absolute",
  inset: "0 0 auto",
  height: 92,
  clipPath: "polygon(0 0, 50% 100%, 100% 0)",
  borderBottom: `1px solid ${palette.border}`,
  backgroundColor: "rgba(239,231,220,0.64)",
};

const sealStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -20%)",
  width: 48,
  height: 48,
  borderRadius: "50%",
  backgroundColor: palette.amber,
  color: palette.ink,
  display: "grid",
  placeItems: "center",
  fontFamily: palette.display,
  fontSize: 26,
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

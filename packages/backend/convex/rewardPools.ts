import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { findCurrentUser, requireCurrentUser } from "./session";

export const REWARD_TERMS_VERSION = "private-reward-v0";

export const getMyRewardPool = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    const user = await findCurrentUser(ctx, email);
    if (!user) return null;
    return await ctx.db
      .query("rewardPools")
      .withIndex("by_memberId", (q) => q.eq("memberId", user._id))
      .unique();
  },
});

/** create or update the member's reward pool. amount is in USD cents. */
export const createRewardPool = mutation({
  args: {
    amount: v.number(),
    depositTier: v.union(
      v.literal("minimum"),
      v.literal("half"),
      v.literal("full"),
    ),
    hideAmount: v.optional(v.boolean()),
    termsAccepted: v.optional(v.boolean()),
    email: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { amount, depositTier, hideAmount = false, termsAccepted, email },
  ) => {
    const user = await requireCurrentUser(ctx, email);
    const now = Date.now();
    const amountInCents = amount < 10000 ? Math.round(amount * 100) : amount;

    if (amountInCents < 10000) {
      throw new Error("Reward amount must be at least $100");
    }

    const existing = await ctx.db
      .query("rewardPools")
      .withIndex("by_memberId", (q) => q.eq("memberId", user._id))
      .unique();

    if (termsAccepted === false && !existing?.termsAcceptedAt) {
      throw new Error("Reward terms must be accepted");
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        amount: amountInCents,
        depositTier,
        hideAmount,
        ...(termsAccepted
          ? { termsAcceptedAt: now, termsVersion: REWARD_TERMS_VERSION }
          : {}),
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("rewardPools", {
      memberId: user._id,
      amount: amountInCents,
      depositTier,
      hideAmount,
      status: "active",
      ...(termsAccepted
        ? { termsAcceptedAt: now, termsVersion: REWARD_TERMS_VERSION }
        : {}),
      createdAt: now,
      updatedAt: now,
    });
  },
});

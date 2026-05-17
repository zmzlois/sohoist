import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { findCurrentUser, requireCurrentUser } from "./session";

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
    email: v.optional(v.string()),
  },
  handler: async (ctx, { amount, depositTier, hideAmount = false, email }) => {
    const user = await requireCurrentUser(ctx, email);
    const now = Date.now();

    const existing = await ctx.db
      .query("rewardPools")
      .withIndex("by_memberId", (q) => q.eq("memberId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        amount,
        depositTier,
        hideAmount,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("rewardPools", {
      memberId: user._id,
      amount,
      depositTier,
      hideAmount,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { findCurrentUser, requireCurrentUser } from "./session";

/** all introductions where the current user is the member, enriched with referral + referrer */
export const getMyIntroductions = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    const user = await findCurrentUser(ctx, email);
    if (!user) return [];

    const intros = await ctx.db
      .query("introductions")
      .withIndex("by_memberId", (q) => q.eq("memberId", user._id))
      .collect();

    const enriched = await Promise.all(
      intros.map(async (intro) => {
        const referral = await ctx.db.get(intro.referralId);
        const referrer = await ctx.db.get(intro.referrerId);
        return {
          ...intro,
          referral,
          referrerName:
            referrer?.name ?? referrer?.email?.split("@")[0] ?? "Your friend",
        };
      }),
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** full details for one introduction — only the member can view it */
export const getIntroductionDetails = query({
  args: {
    introductionId: v.id("introductions"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { introductionId, email }) => {
    const user = await findCurrentUser(ctx, email);
    if (!user) return null;

    const intro = await ctx.db.get(introductionId);
    if (!intro || intro.memberId !== user._id) return null;

    const referral = await ctx.db.get(intro.referralId);
    const referrer = await ctx.db.get(intro.referrerId);

    return {
      ...intro,
      referral,
      referrerName:
        referrer?.name ?? referrer?.email?.split("@")[0] ?? "Your friend",
    };
  },
});

/** member updates the milestone status of their introduction */
export const updateIntroductionStatus = mutation({
  args: {
    introductionId: v.id("introductions"),
    status: v.union(
      v.literal("intro_active"),
      v.literal("first_date_logged"),
      v.literal("relationship_confirmed"),
      v.literal("closed"),
    ),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { introductionId, status, email }) => {
    const user = await requireCurrentUser(ctx, email);
    const intro = await ctx.db.get(introductionId);
    if (!intro || intro.memberId !== user._id)
      throw new Error("Not authorized");

    await ctx.db.patch(introductionId, { status, updatedAt: Date.now() });
    return { success: true };
  },
});

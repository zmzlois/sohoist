import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { findCurrentUser, requireCurrentUser } from "./session";

/** submit a referral for a member. caller must be an approved referrer for that member. */
export const submitReferral = mutation({
  args: {
    memberId: v.id("users"),
    candidateName: v.string(),
    candidateContact: v.string(),
    candidateCity: v.optional(v.string()),
    whyAFit: v.string(),
    howReferrerKnowsThem: v.string(),
    confidenceLevel: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    ),
    candidateKnowsAboutIntro: v.boolean(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.email);

    // verify caller is an approved referrer for this member
    const referrerRow = await ctx.db
      .query("trustedReferrers")
      .withIndex("by_memberId", (q: any) => q.eq("memberId", args.memberId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("referrerId"), user._id),
          q.eq(q.field("status"), "approved"),
        ),
      )
      .unique();

    if (!referrerRow) throw new Error("Not an approved referrer");

    const now = Date.now();
    return await ctx.db.insert("referrals", {
      referrerId: user._id,
      memberId: args.memberId,
      candidateName: args.candidateName,
      candidateContact: args.candidateContact,
      candidateCity: args.candidateCity,
      whyAFit: args.whyAFit,
      howReferrerKnowsThem: args.howReferrerKnowsThem,
      confidenceLevel: args.confidenceLevel,
      candidateKnowsAboutIntro: args.candidateKnowsAboutIntro,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** the member's referral inbox — all referrals submitted for them, newest first */
export const getMyReferrals = query({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, { email }) => {
    const user = await findCurrentUser(ctx, email);
    if (!user) return [];

    const rows = await ctx.db
      .query("referrals")
      .withIndex("by_memberId", (q: any) => q.eq("memberId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      rows.map(async (referral) => {
        const referrer = await ctx.db.get(referral.referrerId);
        return {
          ...referral,
          referrerName:
            referrer?.name ?? referrer?.email?.split("@")[0] ?? "A friend",
        };
      }),
    );
  },
});

/** all referrals the current user has submitted as a referrer, newest first */
export const getReferralsMadeByMe = query({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, { email }) => {
    const user = await findCurrentUser(ctx, email);
    if (!user) return [];

    return await ctx.db
      .query("referrals")
      .withIndex("by_referrerId", (q: any) => q.eq("referrerId", user._id))
      .order("desc")
      .collect();
  },
});

/** member accepts or declines a referral. accepting also creates an introductions row. */
export const respondToReferral = mutation({
  args: {
    referralId: v.id("referrals"),
    action: v.union(v.literal("accepted"), v.literal("declined")),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { referralId, action, email }) => {
    const user = await requireCurrentUser(ctx, email);

    const referral = await ctx.db.get(referralId);
    if (!referral || referral.memberId !== user._id)
      throw new Error("Not authorized");

    await ctx.db.patch(referralId, {
      status: action,
      updatedAt: Date.now(),
    });

    if (action === "accepted") {
      const now = Date.now();
      await ctx.db.insert("introductions", {
        referralId,
        memberId: referral.memberId,
        referrerId: referral.referrerId,
        status: "candidate_invited",
        inviteToken: Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, "0")).join(""),
        memberAcceptedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { findCurrentUser, requireCurrentUser } from "./session";

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 183;

/** all introductions where the current user is the member, enriched with referral + referrer */
export const getMyIntroductions = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    const user = await findCurrentUser(ctx, email);
    if (!user) return [];

    const intros = await ctx.db
      .query("introductions")
      .withIndex("by_memberId", (q) => q.eq("memberId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
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

/** candidate-facing intro details by private token. no account required for MVP. */
export const getCandidateIntroByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const intro = await ctx.db
      .query("introductions")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
      .unique();

    if (!intro) return null;

    const referral = await ctx.db.get(intro.referralId);
    const member = await ctx.db.get(intro.memberId);
    const referrer = await ctx.db.get(intro.referrerId);
    const profile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", intro.memberId))
      .unique();

    if (!referral || !member || !profile) return null;

    const sketch = profile.sketchAssetId
      ? await ctx.db.get(profile.sketchAssetId)
      : null;
    const sketchUrl = sketch?.storageId
      ? await ctx.storage.getUrl(sketch.storageId as any)
      : null;

    return {
      _id: intro._id,
      status: intro.status,
      candidateName: referral.candidateName,
      memberName: member.name ?? "A Sohoist member",
      referrerName:
        referrer?.name ?? referrer?.email?.split("@")[0] ?? "A trusted friend",
      whyAFit: referral.whyAFit,
      howReferrerKnowsThem: referral.howReferrerKnowsThem,
      memberHeadline: profile.headline ?? null,
      memberBio: profile.bio ?? null,
      openTo: profile.openTo ?? null,
      tags: profile.tags ?? [],
      city: profile.hideCity ? null : (profile.city ?? null),
      profession: profile.hideProfession ? null : (profile.profession ?? null),
      sketchUrl,
    };
  },
});

/** candidate accepts or declines through the private intro token. */
export const respondToCandidateIntro = mutation({
  args: {
    token: v.string(),
    action: v.union(v.literal("accepted"), v.literal("declined")),
  },
  handler: async (ctx, { token, action }) => {
    const intro = await ctx.db
      .query("introductions")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
      .unique();

    if (!intro) throw new Error("Introduction not found");

    const now = Date.now();
    await ctx.db.patch(intro._id, {
      status: action === "accepted" ? "candidate_accepted" : "candidate_declined",
      candidateAcceptedAt: action === "accepted" ? now : intro.candidateAcceptedAt,
      updatedAt: now,
    });

    if (action === "accepted") {
      const rewardPool = await ctx.db
        .query("rewardPools")
        .withIndex("by_memberId", (q) => q.eq("memberId", intro.memberId))
        .unique();
      if (rewardPool) {
        await ctx.db.patch(rewardPool._id, {
          status: "intro_accepted",
          updatedAt: now,
        });
      }
    }

    return { success: true };
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

    if (status === "relationship_confirmed") {
      const now = Date.now();
      const existingRelationship = await ctx.db
        .query("relationships")
        .withIndex("by_introductionId", (q) =>
          q.eq("introductionId", introductionId),
        )
        .unique();

      if (!existingRelationship) {
        await ctx.db.insert("relationships", {
          introductionId,
          memberId: intro.memberId,
          candidateId: intro.candidateId,
          candidateEmail: intro.candidateEmail,
          status: "relationship_confirmed",
          confirmedAt: now,
          sixMonthCheckAt: now + SIX_MONTHS_MS,
          createdAt: now,
        });
      }

      const rewardPool = await ctx.db
        .query("rewardPools")
        .withIndex("by_memberId", (q) => q.eq("memberId", intro.memberId))
        .unique();
      if (rewardPool) {
        await ctx.db.patch(rewardPool._id, {
          status: "relationship_pending",
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

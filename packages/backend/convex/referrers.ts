import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { findCurrentUser, requireCurrentUser } from "./session";

function makeToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * create a reusable shareable invite link (no specific email/phone target).
 * returns the raw token so the caller can build the share URL.
 */
export const createShareLink = mutation({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    const user = await requireCurrentUser(ctx, email);
    const token = makeToken();
    await ctx.db.insert("trustedReferrers", {
      memberId: user._id,
      inviteToken: token,
      status: "invited",
      createdAt: Date.now(),
    });
    return token;
  },
});

/** invite someone to be a trusted referrer via email or phone */
export const inviteReferrer = mutation({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    sessionEmail: v.optional(v.string()),
  },
  handler: async (ctx, { email, phone, sessionEmail }) => {
    const user = await requireCurrentUser(ctx, sessionEmail);

    return await ctx.db.insert("trustedReferrers", {
      memberId: user._id,
      email,
      phone,
      inviteToken: makeToken(),
      status: "invited",
      createdAt: Date.now(),
    });
  },
});

/** all trusted referrers for the current member, newest first */
export const getMyReferrers = query({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, { email }) => {
    const user = await findCurrentUser(ctx, email);
    if (!user) return [];

    const rows = await ctx.db
      .query("trustedReferrers")
      .withIndex("by_memberId", (q: any) => q.eq("memberId", user._id))
      .order("desc")
      .collect();

    return rows;
  },
});

/** all members where the current user has accepted or approved referrer access */
export const getReferrerInvitesForMe = query({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, { email }) => {
    const user = await findCurrentUser(ctx, email);
    if (!user) return [];

    const rows = await ctx.db
      .query("trustedReferrers")
      .withIndex("by_referrerId", (q: any) => q.eq("referrerId", user._id))
      .collect();

    return await Promise.all(
      rows
        .filter((row) => row.status !== "removed")
        .map(async (row) => {
          const member = await ctx.db.get(row.memberId);
          const profile = await ctx.db
            .query("memberProfiles")
            .withIndex("by_userId", (q: any) => q.eq("userId", row.memberId))
            .unique();
          const rewardPool = await ctx.db
            .query("rewardPools")
            .withIndex("by_memberId", (q: any) => q.eq("memberId", row.memberId))
            .unique();

          return {
            ...row,
            memberName: member?.name ?? member?.email?.split("@")[0] ?? "A member",
            memberBio: profile?.bio ?? null,
            openTo: profile?.openTo ?? null,
            city: profile?.hideCity ? null : (profile?.city ?? null),
            rewardLabel: rewardPool
              ? profile?.hideRewardAmount || rewardPool.hideAmount
                ? "Reward funded"
                : `$${Math.round(rewardPool.amount / 100)}`
              : null,
          };
        }),
    );
  },
});

/** accept a referrer invite by token — links the caller's user id to the invite row */
export const acceptReferrerInvite = mutation({
  args: { token: v.string(), email: v.optional(v.string()) },
  handler: async (ctx, { token, email }) => {
    const user = await requireCurrentUser(ctx, email);

    const row = await ctx.db
      .query("trustedReferrers")
      .withIndex("by_inviteToken", (q: any) => q.eq("inviteToken", token))
      .unique();

    if (!row) throw new Error("Invite not found");
    if (row.status !== "invited") throw new Error("Already accepted");

    await ctx.db.patch(row._id, {
      referrerId: user._id,
      status: "accepted",
    });

    return row.memberId;
  },
});

/** member approves a referrer who has accepted their invite */
export const approveReferrer = mutation({
  args: { referrerId: v.id("trustedReferrers"), email: v.optional(v.string()) },
  handler: async (ctx, { referrerId, email }) => {
    const user = await requireCurrentUser(ctx, email);

    const row = await ctx.db.get(referrerId);
    if (!row || row.memberId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(referrerId, { status: "approved" });
  },
});

/** member removes a referrer from their trusted circle */
export const removeReferrer = mutation({
  args: { referrerId: v.id("trustedReferrers"), email: v.optional(v.string()) },
  handler: async (ctx, { referrerId, email }) => {
    const user = await requireCurrentUser(ctx, email);

    const row = await ctx.db.get(referrerId);
    if (!row || row.memberId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(referrerId, { status: "removed" });
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { findCurrentUser, requireCurrentUser } from "./session";

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
      inviteToken: Math.random().toString(36).slice(2, 14),
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
      .collect();

    return rows.sort((a: any, b: any) => b.createdAt - a.createdAt);
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

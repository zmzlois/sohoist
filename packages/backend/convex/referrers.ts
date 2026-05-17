import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ADMIN_EMAIL, findCurrentUser, requireCurrentUser } from "./session";

function makeToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePhone(value?: string) {
  return value?.replace(/[^\d+]/g, "") ?? "";
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
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);

    const existingRows = await ctx.db
      .query("trustedReferrers")
      .withIndex("by_memberId", (q: any) => q.eq("memberId", user._id))
      .collect();
    const existing = existingRows.find((row) => {
      const rowEmail = row.email?.trim().toLowerCase();
      const rowPhone = normalizePhone(row.phone);
      return (
        (normalizedEmail && rowEmail === normalizedEmail) ||
        (normalizedPhone && rowPhone === normalizedPhone)
      );
    });

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: normalizedEmail ?? existing.email,
        phone: normalizedPhone || existing.phone,
        status: existing.status === "removed" ? "invited" : existing.status,
      });
      return existing._id;
    }

    return await ctx.db.insert("trustedReferrers", {
      memberId: user._id,
      email: normalizedEmail,
      phone: normalizedPhone || undefined,
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

    return await Promise.all(
      rows
        .filter((row) => row.referrerId || row.email || row.phone)
        .map(async (row) => {
          const referrer = row.referrerId ? await ctx.db.get(row.referrerId) : null;
          const memberReferrals = row.referrerId
            ? (
                await ctx.db
                  .query("referrals")
                  .withIndex("by_referrerId", (q: any) =>
                    q.eq("referrerId", row.referrerId),
                  )
                  .collect()
              )
                .filter((referral) => referral.memberId === user._id)
                .sort((a, b) => b.createdAt - a.createdAt)
            : [];
          const latestReferral = memberReferrals[0];

          return {
            ...row,
            referrerName:
              referrer?.name ??
              row.email ??
              row.phone ??
              (row.status === "invited"
                ? "Invited referrer"
                : "Trusted referrer"),
            introPreview:
              latestReferral?.whyAFit ??
              "No intro note yet. Invite them to add context when someone comes to mind.",
            voiceNoteUrl: latestReferral?.voiceNoteUrl ?? null,
            referralStatus: latestReferral?.status ?? null,
            referralCount: memberReferrals.length,
          };
        }),
    );
  },
});

/** match imported contacts against sohoist users and the member's trusted circle */
export const matchContacts = query({
  args: {
    email: v.optional(v.string()),
    contacts: v.array(
      v.object({
        name: v.string(),
        emails: v.array(v.string()),
        phones: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, { email, contacts }) => {
    const user = await findCurrentUser(ctx, email);
    if (!user) return [];

    const existingReferrers = await ctx.db
      .query("trustedReferrers")
      .withIndex("by_memberId", (q: any) => q.eq("memberId", user._id))
      .collect();
    const visibleReferrers = existingReferrers.filter(
      (row) => row.referrerId || row.email || row.phone,
    );

    const rows: Array<{
      name: string;
      email: string | null;
      phone: string | null;
      sohoistUserId: string | null;
      sohoistName: string | null;
      alreadyOnSohoist: boolean;
      accessStatus: string;
      referrerId: string | null;
    }> = [];
    for (const contact of contacts.slice(0, 80)) {
      const normalizedEmails = contact.emails
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value !== ADMIN_EMAIL)
        .filter(Boolean);
      const normalizedPhones = contact.phones.map(normalizePhone).filter(Boolean);
      const matchedUser = normalizedEmails.length
        ? await ctx.db
            .query("users")
            .withIndex("by_email", (q: any) => q.eq("email", normalizedEmails[0]))
            .unique()
        : null;
      const referrer = visibleReferrers.find((row) => {
        const rowEmail = row.email?.trim().toLowerCase();
        const rowPhone = normalizePhone(row.phone);
        return (
          (rowEmail && normalizedEmails.includes(rowEmail)) ||
          (rowPhone && normalizedPhones.includes(rowPhone)) ||
          (matchedUser && row.referrerId === matchedUser._id)
        );
      });

      rows.push({
        name: contact.name,
        email: normalizedEmails[0] ?? null,
        phone: normalizedPhones[0] ?? null,
        sohoistUserId: matchedUser?._id ?? null,
        sohoistName: matchedUser?.name ?? null,
        alreadyOnSohoist: Boolean(matchedUser),
        accessStatus: referrer?.status ?? "not_invited",
        referrerId: referrer?._id ?? null,
      });
    }

    return rows.sort((a, b) => {
      const rank = (row: (typeof rows)[number]) => {
        if (row.accessStatus === "approved") return 0;
        if (row.accessStatus === "accepted") return 1;
        if (row.alreadyOnSohoist) return 2;
        if (row.accessStatus === "invited") return 3;
        return 4;
      };
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });
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

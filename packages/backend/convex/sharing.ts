import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireCurrentUser } from "./session";

/**
 * public profile view for a share-link recipient.
 * respects the member's ghost mode and visibility settings.
 * never returns the original photo — only the sketch.
 */
export const getProfileByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("trustedReferrers")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
      .unique();

    if (!invite || invite.status === "removed") return null;

    const member = await ctx.db.get(invite.memberId);
    if (!member) return null;

    const profile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", member._id))
      .unique();

    if (!profile) return null;
    if (profile.visibility === "hidden") return null;

    // resolve sketch URL — referrers see sketch, never the raw photo.
    const sketch = profile.sketchAssetId
      ? await ctx.db.get(profile.sketchAssetId)
      : null;
    const sketchUrl = sketch?.storageId
      ? await ctx.storage.getUrl(sketch.storageId as Id<"_storage">)
      : null;

    return {
      inviteToken: token,
      inviteId: invite._id,
      memberId: member._id,
      memberName: member.name ?? "A Sohoist member",
      bio: profile.bio ?? null,
      openTo: profile.openTo ?? null,
      friendsShouldReferSomeoneWho: profile.friendsShouldReferSomeoneWho ?? null,
      doNotReferIf: profile.doNotReferIf ?? null,
      conversationStarters: profile.conversationStarters ?? [],
      privateNotesForReferrers: profile.privateNotesForReferrers ?? null,
      tags: profile.tags ?? [],
      city: profile.hideCity ? null : (profile.city ?? null),
      profession: profile.hideProfession ? null : (profile.profession ?? null),
      relationshipIntent: profile.relationshipIntent ?? null,
      sketchUrl,
      referrerStatus: invite.status,
    };
  },
});

/** revoke a previously shared invite link */
export const revokeShareLink = mutation({
  args: {
    inviteId: v.id("trustedReferrers"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { inviteId, email }) => {
    const user = await requireCurrentUser(ctx, email);
    const row = await ctx.db.get(inviteId);
    if (!row || row.memberId !== user._id) throw new Error("Not authorized");
    await ctx.db.patch(inviteId, { status: "removed" });
  },
});

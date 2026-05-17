import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { findCurrentUser, requireCurrentUser } from "./session";

function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

/** the member's own profile row, or null if not yet created */
export const getMyProfile = query({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, { email }) => {
    const user = await findCurrentUser(ctx, email);
    if (!user) return null;

    return await ctx.db
      .query("memberProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .unique();
  },
});

/** patch editable profile fields. profile row must already exist (created by admin on approval). */
export const updateProfile = mutation({
  args: {
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    openTo: v.optional(v.string()),
    aboutBullets: v.optional(v.array(v.string())),
    lookingForBullets: v.optional(v.array(v.string())),
    displayName: v.optional(v.string()),
    friendsShouldReferSomeoneWho: v.optional(v.string()),
    doNotReferIf: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    conversationStarters: v.optional(v.array(v.string())),
    privateNotesForReferrers: v.optional(v.string()),
    age: v.optional(v.number()),
    city: v.optional(v.string()),
    profession: v.optional(v.string()),
    relationshipIntent: v.optional(v.string()),
    ghostMode: v.optional(v.boolean()),
    visibility: v.optional(
      v.union(
        v.literal("hidden"),
        v.literal("referrers_only"),
        v.literal("trusted_circle"),
        v.literal("public_preview"),
      ),
    ),
    hideRewardAmount: v.optional(v.boolean()),
    hideCity: v.optional(v.boolean()),
    hideProfession: v.optional(v.boolean()),
    photoVisibility: v.optional(
      v.union(
        v.literal("sketch_only"),
        v.literal("photo_only"),
        v.literal("both"),
        v.literal("photo_after_approval"),
      ),
    ),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { email, ...profileFields } = args;
    const user = await requireCurrentUser(ctx, email);

    const profile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .unique();

    if (!profile) throw new Error("Profile not found");

    // only patch keys that were explicitly provided
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(profileFields)) {
      if (value !== undefined) patch[key] = value;
    }

    await ctx.db.patch(profile._id, patch);
  },
});

/** upsert voice interview answers and link them to the member's profile */
export const saveVoiceAnswers = mutation({
  args: {
    answers: v.array(v.object({ question: v.string(), answer: v.string() })),
    rawTranscript: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { answers, rawTranscript, tags, email }) => {
    const user = await requireCurrentUser(ctx, email);

    // map question text to profile fields
    const byQ: Record<string, string> = {};
    for (const { question, answer } of answers) {
      byQ[question.toLowerCase()] = answer;
    }
    const bio = [
      byQ["who are you?"],
      byQ["what are you like in real life?"],
    ]
      .filter(Boolean)
      .join(" ");
    const openTo =
      byQ["what are you looking for?"] ??
      byQ["what kind of person do you enjoy being around?"] ??
      "";
    const friendsShouldReferSomeoneWho =
      byQ["what should friends know before referring someone to you?"] ?? "";
    const doNotReferIf = byQ["what are your dealbreakers?"] ?? "";

    // prefer raw transcript text; fall back to JSON of structured answers
    const transcriptToStore = rawTranscript ?? JSON.stringify(answers);

    const existing = await ctx.db
      .query("voiceInterviews")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .unique();

    let interviewId;
    if (existing) {
      await ctx.db.patch(existing._id, {
        transcript: transcriptToStore,
        status: "complete",
      });
      interviewId = existing._id;
    } else {
      interviewId = await ctx.db.insert("voiceInterviews", {
        userId: user._id,
        transcript: transcriptToStore,
        status: "complete",
        createdAt: Date.now(),
      });
    }

    const profile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .unique();

    if (profile) {
      const patch: Record<string, unknown> = {
        voiceInterviewId: interviewId,
        updatedAt: Date.now(),
      };
      if (bio) patch.bio = bio;
      if (openTo) patch.openTo = openTo;
      if (friendsShouldReferSomeoneWho)
        patch.friendsShouldReferSomeoneWho = friendsShouldReferSomeoneWho;
      if (doNotReferIf) patch.doNotReferIf = doNotReferIf;
      if (tags?.length) patch.tags = tags;
      await ctx.db.patch(profile._id, patch);
    }

    return interviewId;
  },
});

/** the current user's latest voice interview — includes raw transcript */
export const getMyVoiceInterview = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    const user = await requireCurrentUser(ctx, email);
    return await ctx.db
      .query("voiceInterviews")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .unique();
  },
});

/** save or update display name and city on the member's profile */
export const saveBasicProfile = mutation({
  args: {
    email: v.optional(v.string()),
    displayName: v.string(),
    city: v.string(),
  },
  handler: async (ctx, { email, displayName, city }) => {
    const user = await requireCurrentUser(ctx, email);

    // update the user's display name
    await ctx.db.patch(user._id, { name: displayName });

    const profile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .unique();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      displayName,
      city,
      updatedAt: Date.now(),
    });
  },
});

/** generate a unique share token for the member's profile, or return existing one */
export const generateShareToken = mutation({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    const user = await requireCurrentUser(ctx, email);

    const profile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .unique();

    if (!profile) throw new Error("Profile not found");
    if (profile.shareToken) return profile.shareToken;

    const token = randomToken();
    await ctx.db.patch(profile._id, { shareToken: token, updatedAt: Date.now() });
    return token;
  },
});

/** public — fetch a profile by share token, returns only safe public fields */
export const getProfileByShareToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const profile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_shareToken", (q: any) => q.eq("shareToken", token))
      .unique();

    if (!profile || profile.ghostMode) return null;

    const user = await ctx.db.get(profile.userId);
    if (!user) return null;

    // resolve sketch/photo URLs
    const sketch = profile.sketchAssetId
      ? await ctx.db.get(profile.sketchAssetId)
      : null;
    const photo =
      profile.photoAssetId ? await ctx.db.get(profile.photoAssetId) : null;

    // home photos
    const homePhotos = await ctx.db
      .query("homePhotos")
      .withIndex("by_userId", (q: any) => q.eq("userId", profile.userId))
      .collect();

    return {
      displayName: profile.displayName ?? user.name ?? "A member",
      city: profile.hideCity ? null : profile.city,
      aboutBullets: profile.aboutBullets ?? [],
      lookingForBullets: profile.lookingForBullets ?? [],
      tags: profile.tags ?? [],
      sketchUrl: sketch?.url ?? null,
      photoUrl:
        profile.photoVisibility !== "sketch_only" ? (photo?.url ?? null) : null,
      homePhotos: homePhotos
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((p) => ({ url: p.url, caption: p.caption })),
    };
  },
});

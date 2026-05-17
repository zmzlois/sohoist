import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.optional(v.string()),
    email: v.string(),
    name: v.optional(v.string()),
    pseudonym: v.optional(v.string()),
    role: v.union(v.literal("member"), v.literal("admin")),
    createdAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  membershipApplications: defineTable({
    userId: v.id("users"),
    name: v.string(),
    pseudonym: v.optional(v.string()),
    city: v.string(),
    profession: v.string(),
    relationshipIntent: v.string(),
    whySohoist: v.string(),
    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("waitlisted"),
      v.literal("rejected"),
    ),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    submittedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  memberProfiles: defineTable({
    userId: v.id("users"),
    voiceInterviewId: v.optional(v.id("voiceInterviews")),
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    openTo: v.optional(v.string()),
    friendsShouldReferSomeoneWho: v.optional(v.string()),
    doNotReferIf: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    conversationStarters: v.optional(v.array(v.string())),
    privateNotesForReferrers: v.optional(v.string()),
    age: v.optional(v.number()),
    city: v.optional(v.string()),
    profession: v.optional(v.string()),
    relationshipIntent: v.optional(v.string()),
    ghostMode: v.boolean(),
    visibility: v.union(
      v.literal("hidden"),
      v.literal("referrers_only"),
      v.literal("trusted_circle"),
      v.literal("public_preview"),
    ),
    hideRewardAmount: v.boolean(),
    hideCity: v.boolean(),
    hideProfession: v.boolean(),
    photoAssetId: v.optional(v.id("photoAssets")),
    sketchAssetId: v.optional(v.id("sketchAssets")),
    photoVisibility: v.union(
      v.literal("sketch_only"),
      v.literal("photo_only"),
      v.literal("both"),
      v.literal("photo_after_approval"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  voiceInterviews: defineTable({
    userId: v.id("users"),
    transcript: v.optional(v.string()),
    status: v.union(
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  photoAssets: defineTable({
    userId: v.id("users"),
    storageId: v.string(),
    url: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  sketchAssets: defineTable({
    userId: v.id("users"),
    sourcePhotoId: v.optional(v.id("photoAssets")),
    style: v.union(
      v.literal("soft_graphite"),
      v.literal("editorial_pencil"),
      v.literal("watercolor_portrait"),
      v.literal("minimal_line"),
    ),
    storageId: v.optional(v.string()),
    url: v.optional(v.string()),
    status: v.union(
      v.literal("generating"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  trustedReferrers: defineTable({
    memberId: v.id("users"),
    referrerId: v.optional(v.id("users")),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    inviteToken: v.string(),
    status: v.union(
      v.literal("invited"),
      v.literal("accepted"),
      v.literal("approved"),
      v.literal("removed"),
    ),
    createdAt: v.number(),
  })
    .index("by_memberId", ["memberId"])
    .index("by_referrerId", ["referrerId"])
    .index("by_inviteToken", ["inviteToken"]),

  rewardPools: defineTable({
    memberId: v.id("users"),
    amount: v.number(),
    depositTier: v.union(
      v.literal("minimum"),
      v.literal("half"),
      v.literal("full"),
    ),
    polarCheckoutId: v.optional(v.string()),
    polarOrderId: v.optional(v.string()),
    status: v.union(
      v.literal("not_created"),
      v.literal("active"),
      v.literal("partially_funded"),
      v.literal("fully_funded"),
      v.literal("intro_accepted"),
      v.literal("relationship_pending"),
      v.literal("eligible_for_payout"),
      v.literal("paid"),
      v.literal("refunded"),
      v.literal("disputed"),
      v.literal("expired"),
    ),
    hideAmount: v.boolean(),
    termsAcceptedAt: v.optional(v.number()),
    termsVersion: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_memberId", ["memberId"]),

  referrals: defineTable({
    referrerId: v.id("users"),
    memberId: v.id("users"),
    candidateName: v.string(),
    candidateContact: v.string(),
    candidateCity: v.optional(v.string()),
    whyAFit: v.string(),
    howReferrerKnowsThem: v.string(),
    voiceNoteUrl: v.optional(v.string()),
    profileLink: v.optional(v.string()),
    confidenceLevel: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    ),
    candidateKnowsAboutIntro: v.boolean(),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("viewed"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_referrerId", ["referrerId"])
    .index("by_memberId", ["memberId"]),

  introductions: defineTable({
    referralId: v.id("referrals"),
    memberId: v.id("users"),
    referrerId: v.id("users"),
    candidateId: v.optional(v.id("users")),
    candidateEmail: v.optional(v.string()),
    inviteToken: v.string(),
    status: v.union(
      v.literal("candidate_invited"),
      v.literal("candidate_accepted"),
      v.literal("candidate_declined"),
      v.literal("intro_active"),
      v.literal("first_date_logged"),
      v.literal("relationship_confirmed"),
      v.literal("payout_pending"),
      v.literal("paid"),
      v.literal("closed"),
    ),
    memberAcceptedAt: v.optional(v.number()),
    candidateAcceptedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_memberId", ["memberId"])
    .index("by_referralId", ["referralId"])
    .index("by_inviteToken", ["inviteToken"]),

  relationships: defineTable({
    introductionId: v.id("introductions"),
    memberId: v.id("users"),
    candidateId: v.optional(v.id("users")),
    candidateEmail: v.optional(v.string()),
    status: v.union(
      v.literal("intro_accepted"),
      v.literal("first_date_confirmed"),
      v.literal("dating_confirmed"),
      v.literal("relationship_confirmed"),
      v.literal("no_longer_seeing"),
    ),
    confirmedAt: v.optional(v.number()),
    sixMonthCheckAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_introductionId", ["introductionId"]),

  verifications: defineTable({
    relationshipId: v.id("relationships"),
    verifierId: v.id("users"),
    verifierRole: v.union(
      v.literal("member"),
      v.literal("candidate"),
      v.literal("friend"),
    ),
    confirmedStatus: v.string(),
    createdAt: v.number(),
  }).index("by_relationshipId", ["relationshipId"]),

  disputes: defineTable({
    rewardPoolId: v.id("rewardPools"),
    raisedBy: v.id("users"),
    reason: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("resolved"),
      v.literal("dismissed"),
    ),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_rewardPoolId", ["rewardPoolId"]),

  adminReviews: defineTable({
    applicationId: v.id("membershipApplications"),
    reviewedBy: v.id("users"),
    action: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("waitlisted"),
      v.literal("under_review"),
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_applicationId", ["applicationId"]),

  circles: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    adminId: v.id("users"),
    inviteCode: v.optional(v.string()),
    rules: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),
});

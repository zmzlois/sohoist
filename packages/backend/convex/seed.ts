import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ADMIN_EMAIL, roleForEmail } from "./session";

type SeedUser = {
  email: string;
  name: string;
  pseudonym?: string;
};

type SeedProfile = SeedUser & {
  headline: string;
  bio: string;
  openTo: string;
  city: string;
  profession: string;
  relationshipIntent: string;
  tags: string[];
  rewardAmount: number;
};

const seedMemberEmail = ADMIN_EMAIL.toLowerCase();

const memberProfiles: SeedProfile[] = [
  {
    email: seedMemberEmail,
    name: "Lois",
    headline: "A serious, warm introduction brief",
    bio: "Founder energy with a preference for thoughtful, low-pressure introductions. Enjoys directness, dinner-table wit, and people who are clear about what they want.",
    openTo: "A serious, committed relationship",
    city: "San Francisco / London",
    profession: "Founder",
    relationshipIntent: "A serious, committed relationship",
    tags: ["intentional", "founder", "warm"],
    rewardAmount: 50000,
  },
  {
    email: "elena.member@sohoist.demo",
    name: "Elena S.",
    headline: "Thoughtful, curious, values-led",
    bio: "Investor and reader with a soft spot for neighborhood dinners, long walks, and people who treat ambition with perspective.",
    openTo: "A grounded partner with integrity and emotional steadiness",
    city: "New York",
    profession: "Investor",
    relationshipIntent: "Long-term relationship",
    tags: ["values-led", "curious", "social"],
    rewardAmount: 100000,
  },
  {
    email: "maya.member@sohoist.demo",
    name: "Maya L.",
    headline: "Warm, precise, quietly adventurous",
    bio: "Physician who hosts thoughtful dinners and notices the small details. Looking for kindness, humor, and calm confidence.",
    openTo: "Someone emotionally generous and ready for real life",
    city: "Boston",
    profession: "Physician",
    relationshipIntent: "Committed relationship",
    tags: ["generous", "calm", "present"],
    rewardAmount: 75000,
  },
];

const trustedReferrers: SeedUser[] = [
  {
    email: "taylor.referrer@sohoist.demo",
    name: "Taylor R.",
  },
  {
    email: "jordan.referrer@sohoist.demo",
    name: "Jordan M.",
  },
  {
    email: "alex.referrer@sohoist.demo",
    name: "Alex P.",
  },
];

const referralNotes = [
  {
    referrerEmail: "taylor.referrer@sohoist.demo",
    candidateName: "Elena S.",
    candidateContact: "elena.member@sohoist.demo",
    candidateCity: "New York",
    whyAFit:
      "Elena has the exact mix of warmth, seriousness, and social ease Lois usually responds to. They would have a natural dinner-table rhythm.",
    howReferrerKnowsThem: "Worked together on a private founder dinner series.",
    voiceNoteUrl: "demo://voice-note/taylor-elena",
  },
  {
    referrerEmail: "jordan.referrer@sohoist.demo",
    candidateName: "Maya L.",
    candidateContact: "maya.member@sohoist.demo",
    candidateCity: "Boston",
    whyAFit:
      "Maya is low-drama, thoughtful, and genuinely ready. She would understand the pace Lois wants without making it feel intense.",
    howReferrerKnowsThem: "Known through a close friend circle for three years.",
    voiceNoteUrl: "demo://voice-note/jordan-maya",
  },
  {
    referrerEmail: "alex.referrer@sohoist.demo",
    candidateName: "Noah K.",
    candidateContact: "noah@example.com",
    candidateCity: "London",
    whyAFit:
      "Noah is principled, funny in a dry way, and serious without being heavy. Worth a first conversation.",
    howReferrerKnowsThem: "Met through a London supper club.",
  },
];

async function upsertUser(ctx: any, user: SeedUser) {
  const email = user.email.toLowerCase();
  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .unique();

  if (existing) {
    const patch: Record<string, unknown> = {
      name: user.name,
      role: roleForEmail(email),
    };
    if (user.pseudonym) patch.pseudonym = user.pseudonym;
    await ctx.db.patch(existing._id, patch);
    return existing._id;
  }

  const doc: Record<string, unknown> = {
    email,
    name: user.name,
    role: roleForEmail(email),
    createdAt: Date.now(),
  };
  if (user.pseudonym) doc.pseudonym = user.pseudonym;
  return await ctx.db.insert("users", doc);
}

async function upsertVoiceInterview(ctx: any, userId: string, profile: SeedProfile) {
  const existing = await ctx.db
    .query("voiceInterviews")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  const transcript = [
    `who are you? ${profile.bio}`,
    `what are you looking for? ${profile.openTo}`,
  ].join("\n\n");

  if (existing) {
    await ctx.db.patch(existing._id, { transcript, status: "complete" });
    return existing._id;
  }

  return await ctx.db.insert("voiceInterviews", {
    userId,
    transcript,
    status: "complete",
    createdAt: Date.now(),
  });
}

async function upsertMemberProfile(
  ctx: any,
  userId: string,
  profile: SeedProfile,
  voiceInterviewId: string,
) {
  const existing = await ctx.db
    .query("memberProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  const now = Date.now();
  const patch = {
    voiceInterviewId,
    headline: profile.headline,
    bio: profile.bio,
    openTo: profile.openTo,
    displayName: profile.name,
    friendsShouldReferSomeoneWho:
      "Refer someone emotionally available, socially generous, and clear about wanting a real relationship.",
    doNotReferIf:
      "Do not refer someone who is casually dating by default or still optimizing for endless options.",
    tags: profile.tags,
    conversationStarters: [
      "A dinner that changed how you think",
      "The kind of friend you are in a hard season",
      "Where you feel most like yourself",
    ],
    privateNotesForReferrers:
      "Keep introductions warm, specific, and low-pressure. Context matters more than credentials.",
    age: profile.email === seedMemberEmail ? 34 : 31,
    city: profile.city,
    profession: profile.profession,
    relationshipIntent: profile.relationshipIntent,
    ghostMode: true,
    visibility: "referrers_only" as const,
    hideRewardAmount: false,
    hideCity: false,
    hideProfession: false,
    photoVisibility: "sketch_only" as const,
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return existing._id;
  }

  return await ctx.db.insert("memberProfiles", {
    userId,
    ...patch,
    createdAt: now,
  });
}

async function upsertRewardPool(ctx: any, memberId: string, amount: number) {
  const existing = await ctx.db
    .query("rewardPools")
    .withIndex("by_memberId", (q: any) => q.eq("memberId", memberId))
    .unique();
  const now = Date.now();
  const patch = {
    amount,
    depositTier: amount >= 50000 ? ("full" as const) : ("minimum" as const),
    hideAmount: false,
    status: "active" as const,
    termsAcceptedAt: now,
    termsVersion: "private-reward-v0",
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return existing._id;
  }

  return await ctx.db.insert("rewardPools", {
    memberId,
    ...patch,
    createdAt: now,
  });
}

async function upsertTrustedReferrer(
  ctx: any,
  memberId: string,
  referrerId: string,
  referrerEmail: string,
) {
  const existingRows = await ctx.db
    .query("trustedReferrers")
    .withIndex("by_memberId", (q: any) => q.eq("memberId", memberId))
    .collect();
  const existing = existingRows.find(
    (row: any) => row.referrerId === referrerId || row.email === referrerEmail,
  );

  if (existing) {
    await ctx.db.patch(existing._id, {
      referrerId,
      email: referrerEmail,
      status: "approved",
    });
    return existing._id;
  }

  return await ctx.db.insert("trustedReferrers", {
    memberId,
    referrerId,
    email: referrerEmail,
    inviteToken: `seed-${referrerEmail.replace(/[^a-z0-9]/gi, "-")}`,
    status: "approved",
    createdAt: Date.now(),
  });
}

async function upsertReferral(
  ctx: any,
  memberId: string,
  referrerId: string,
  note: (typeof referralNotes)[number],
) {
  const existingRows = await ctx.db
    .query("referrals")
    .withIndex("by_memberId", (q: any) => q.eq("memberId", memberId))
    .collect();
  const existing = existingRows.find(
    (row: any) =>
      row.referrerId === referrerId && row.candidateContact === note.candidateContact,
  );
  const now = Date.now();
  const patch: Record<string, unknown> = {
    candidateName: note.candidateName,
    candidateContact: note.candidateContact,
    candidateCity: note.candidateCity,
    whyAFit: note.whyAFit,
    howReferrerKnowsThem: note.howReferrerKnowsThem,
    confidenceLevel: "high" as const,
    candidateKnowsAboutIntro: true,
    status: "submitted" as const,
    updatedAt: now,
  };
  if (note.voiceNoteUrl) patch.voiceNoteUrl = note.voiceNoteUrl;

  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return existing._id;
  }

  return await ctx.db.insert("referrals", {
    referrerId,
    memberId,
    ...patch,
    createdAt: now,
  });
}

/**
 * seed local/dev data for the native app.
 * run from packages/backend with: pnpm seed
 */
export const demoProfiles = internalMutation({
  args: {
    memberEmail: v.optional(v.string()),
  },
  handler: async (ctx, { memberEmail }) => {
    const primaryEmail = (memberEmail ?? seedMemberEmail).toLowerCase();
    const profileSeeds = memberProfiles.map((profile) =>
      profile.email === seedMemberEmail ? { ...profile, email: primaryEmail } : profile,
    );

    const userIdsByEmail = new Map<string, string>();
    for (const profile of profileSeeds) {
      const userId = await upsertUser(ctx, profile);
      userIdsByEmail.set(profile.email.toLowerCase(), userId);
      const interviewId = await upsertVoiceInterview(ctx, userId, profile);
      await upsertMemberProfile(ctx, userId, profile, interviewId);
      await upsertRewardPool(ctx, userId, profile.rewardAmount);
    }

    for (const referrer of trustedReferrers) {
      const userId = await upsertUser(ctx, referrer);
      userIdsByEmail.set(referrer.email.toLowerCase(), userId);
    }

    const memberId = userIdsByEmail.get(primaryEmail);
    if (!memberId) throw new Error("seed member was not created");

    for (const referrer of trustedReferrers) {
      const referrerId = userIdsByEmail.get(referrer.email.toLowerCase());
      if (!referrerId) continue;
      await upsertTrustedReferrer(ctx, memberId, referrerId, referrer.email);
    }

    for (const note of referralNotes) {
      const referrerId = userIdsByEmail.get(note.referrerEmail);
      if (!referrerId) continue;
      await upsertReferral(ctx, memberId, referrerId, note);
    }

    return {
      seededMembers: profileSeeds.length,
      seededReferrers: trustedReferrers.length,
      seededReferralNotes: referralNotes.length,
      primaryEmail,
    };
  },
});

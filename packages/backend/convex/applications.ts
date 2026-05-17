import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentAuthSubject, normalizeEmail, roleForEmail } from "./session";

/** submit a membership application. creates the user row if not yet present. */
export const submitApplication = mutation({
  args: {
    name: v.string(),
    pseudonym: v.optional(v.string()),
    email: v.string(),
    city: v.string(),
    profession: v.string(),
    relationshipIntent: v.string(),
    whySohoist: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!email) throw new Error("Email required");

    const clerkId = await currentAuthSubject(ctx);
    const role = roleForEmail(email);

    // ensure user row exists
    let user = clerkId
      ? await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
          .unique()
      : null;

    user ??= await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkId,
        email,
        name: args.name,
        pseudonym: args.pseudonym,
        role,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    }

    if (!user) throw new Error("Failed to resolve user");

    // prevent duplicate applications
    const existing = await ctx.db
      .query("membershipApplications")
      .withIndex("by_userId", (q) => q.eq("userId", user!._id))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("membershipApplications", {
      userId: user._id,
      name: args.name,
      pseudonym: args.pseudonym,
      city: args.city,
      profession: args.profession,
      relationshipIntent: args.relationshipIntent,
      whySohoist: args.whySohoist,
      status: "submitted",
      submittedAt: Date.now(),
    });
  },
});

/** the current user's application — null if none exists */
export const getMyApplication = query({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, { email }) => {
    const normalizedEmail = normalizeEmail(email);
    const clerkId = await currentAuthSubject(ctx);

    let user = clerkId
      ? await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
          .unique()
      : null;

    if (!user && normalizedEmail) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .unique();
    }

    if (!user) return null;

    return await ctx.db
      .query("membershipApplications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});

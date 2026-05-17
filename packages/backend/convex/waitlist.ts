import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { normalizeEmail } from "./session";

export const saveSignup = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, { email, source }) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) throw new Error("Email required");

    const now = Date.now();
    const existing = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        source: source ?? existing.source,
        updatedAt: now,
      });
      return { _id: existing._id, created: false };
    }

    const signupId = await ctx.db.insert("waitlistSignups", {
      email: normalizedEmail,
      source,
      createdAt: now,
      updatedAt: now,
    });

    return { _id: signupId, created: true };
  },
});

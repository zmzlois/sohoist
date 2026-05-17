import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentAuthSubject, normalizeEmail, roleForEmail } from "./session";

/** upsert user row on sign-in — idempotent, safe to call on every app load */
export const upsertUser = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.string(),
  },
  handler: async (ctx, { name, email }) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    const clerkId = await currentAuthSubject(ctx);
    const role = roleForEmail(normalizedEmail);

    const existingByClerkId = clerkId
      ? await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
          .unique()
      : null;
    const existing =
      existingByClerkId ??
      (await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .unique());

    if (existing) {
      const changed =
        existing.clerkId !== clerkId ||
        existing.name !== name ||
        existing.email !== normalizedEmail ||
        existing.role !== role;
      if (changed)
        await ctx.db.patch(existing._id, {
          clerkId: clerkId ?? existing.clerkId,
          name,
          email: normalizedEmail,
          role,
        });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId,
      email: normalizedEmail,
      name,
      role,
      createdAt: Date.now(),
    });
  },
});

/** current user's row — null if not in db yet */
export const getMe = query({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, { email }) => {
    const normalizedEmail = normalizeEmail(email);
    const clerkId = await currentAuthSubject(ctx);

    if (clerkId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
        .unique();
      if (user) return user;
    }

    if (!normalizedEmail) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();
  },
});

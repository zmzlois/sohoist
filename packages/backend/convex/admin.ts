import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  ADMIN_EMAIL,
  findCurrentUser,
  normalizeEmail,
  requireCurrentUser,
} from "./session";

const applicationStatus = v.union(
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("approved"),
  v.literal("waitlisted"),
  v.literal("rejected"),
);

/** verify caller is an admin — throws otherwise */
async function requireAdmin(ctx: { auth: any; db: any }, email?: string) {
  let user = await findCurrentUser(ctx, email);
  const normalizedEmail = normalizeEmail(email);

  if (!user && normalizedEmail === ADMIN_EMAIL) {
    const userId = await ctx.db.insert("users", {
      email: normalizedEmail,
      name: "Lois",
      role: "admin",
      createdAt: Date.now(),
    });
    user = await ctx.db.get(userId);
  }

  if (!user) user = await requireCurrentUser(ctx, email);
  if (!user || user.role !== "admin") throw new Error("Admin access required");
  return user;
}

/** list all membership applications, optionally filtered by status */
export const listApplications = query({
  args: {
    email: v.optional(v.string()),
    status: v.optional(applicationStatus),
  },
  handler: async (ctx, { email, status }) => {
    await requireAdmin(ctx, email);

    if (status) {
      return await ctx.db
        .query("membershipApplications")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .collect();
    }

    return await ctx.db.query("membershipApplications").order("desc").collect();
  },
});

/** approve, reject, waitlist, or mark an application under review */
export const reviewApplication = mutation({
  args: {
    applicationId: v.id("membershipApplications"),
    email: v.optional(v.string()),
    action: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("waitlisted"),
      v.literal("under_review"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { applicationId, email, action, notes }) => {
    const admin = await requireAdmin(ctx, email);

    const application = await ctx.db.get(applicationId);
    if (!application) throw new Error("Application not found");

    await ctx.db.patch(applicationId, {
      status: action,
      reviewedBy: admin._id,
      reviewedAt: Date.now(),
      reviewNotes: notes,
    });

    await ctx.db.insert("adminReviews", {
      applicationId,
      reviewedBy: admin._id,
      action,
      notes,
      createdAt: Date.now(),
    });

    // when approved, create an empty member profile shell
    if (action === "approved") {
      const existingProfile = await ctx.db
        .query("memberProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", application.userId))
        .unique();

      if (!existingProfile) {
        await ctx.db.insert("memberProfiles", {
          userId: application.userId,
          ghostMode: true,
          visibility: "hidden",
          hideRewardAmount: false,
          hideCity: false,
          hideProfession: false,
          photoVisibility: "sketch_only",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

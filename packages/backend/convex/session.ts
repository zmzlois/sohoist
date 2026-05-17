export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "lois@sf-voice.sh";

export function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? "";
}

export function roleForEmail(email: string) {
  return email === ADMIN_EMAIL ? "admin" : "member";
}

export async function findCurrentUser(
  ctx: { auth: any; db: any },
  email?: string,
) {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (user) return user;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", normalizedEmail))
    .unique();
}

export async function requireCurrentUser(
  ctx: { auth: any; db: any },
  email?: string,
) {
  const user = await findCurrentUser(ctx, email);
  if (!user) throw new Error("User not found");
  return user;
}

export async function currentAuthSubject(ctx: { auth: any }) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject as string | undefined;
}

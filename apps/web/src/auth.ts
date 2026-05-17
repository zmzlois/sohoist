import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "lois@sf-voice.sh";
const DEFAULT_PASSWORD = "sohoist";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function authorizedEmail(email: string) {
  const allowedEmails = process.env.SOHOIST_AUTH_EMAILS?.split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return !allowedEmails?.length || allowedEmails.includes(email);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/sign-in",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const email = normalizeEmail(credentials?.email);
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const expectedPassword =
          process.env.SOHOIST_AUTH_PASSWORD ?? DEFAULT_PASSWORD;

        if (!email) return null;
        if (!authorizedEmail(email)) return null;

        // admin bypasses password — email alone is sufficient
        if (email === ADMIN_EMAIL) {
          return { id: email, email, name: "Lois" };
        }

        if (!password || password !== expectedPassword) return null;

        return { id: email, email, name: email.split("@")[0] };
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const protectedRoute =
        path.startsWith("/dashboard") || path.startsWith("/admin");

      return protectedRoute ? !!auth?.user : true;
    },
    jwt({ token, user }) {
      if (user?.email) token.sub = user.email;
      return token;
    },
  },
});

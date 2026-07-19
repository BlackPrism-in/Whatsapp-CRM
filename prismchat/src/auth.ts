import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

// Phase 0: email/password (Credentials) with JWT sessions — fully compatible
// with our Prisma schema. Google OAuth is deferred until Auth.js adapter tables
// (Account/Session/VerificationToken) are added.
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        if (user.status === "suspended") return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.avatar };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.uid = user.id;
      return token;
    },
    session: ({ session, token }) => {
      if (token.uid && session.user) {
        session.user.id = token.uid as string;
      }
      return session;
    },
  },
});

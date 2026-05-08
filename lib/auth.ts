/**
 * auth.ts — NextAuth v5 (Auth.js) configuration
 *
 * Uses the MongoDB Adapter so user records are persisted in
 * the same database as the rest of the app.
 *
 * Providers shown: Google + GitHub.
 * CredentialsProvider added for email/password login (not yet used in UI)
 */

import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./db";
import { authConfig } from "./auth.config";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  providers: [
    ...authConfig.providers,
    CredentialsProvider({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const client = await clientPromise;
        const db = client.db();

        // Look for user in MongoDB
        const user = await db.collection("users").findOne({
          email: credentials.email,
        });

        if (!user || !user.password) {
          return null;
        }

        // Compare hashed password
        const isPasswordCorrect = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (isPasswordCorrect) {
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    // 1. Persist the user id to the token right after signin
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // 2. Pass the id from the token into the session object
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

// ─────────────────────────────────────────────────────────────
// Augment next-auth types so TypeScript knows about `id`
// ─────────────────────────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

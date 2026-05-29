import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { sendVerificationEmail } from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  emailVerification: {
  sendOnSignUp: true,
  sendOnSignIn: true,
  autoSignInAfterVerification: true,
  callbackURL: "/chat",
  sendVerificationEmail: async ({ user, url, token }) => {
    await sendVerificationEmail({
      to: user.email,
      userName: user.name,
      verificationUrl: url,
    });
  },
},
  user: {
    additionalFields: {
      tier: {
        type: "string",
        defaultValue: "free",
        input: false,
      },
    },
  },
  secret: import.meta.env.BETTER_AUTH_SECRET,
  baseURL: import.meta.env.BETTER_AUTH_URL || "http://localhost:4321",
  trustedOrigins: [
    "http://localhost:4321",
    "http://127.0.0.1:4321",
    "https://nexus-self-eight.vercel.app",
    "weboldal-konfigurator-v2.html",
  ],
});

export type Session = typeof auth.$Infer.Session;

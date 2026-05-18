import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
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
    "https://app.conendigital.hu",
  ],
});

export type Session = typeof auth.$Infer.Session;

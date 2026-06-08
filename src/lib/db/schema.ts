import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

// === BETTER-AUTH KÖTELEZŐ TÁBLÁK ===

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),

  // === NEXUS-SPECIFIKUS ===
  tier: text("tier", { enum: ["free", "pro", "premium"] }).notNull().default("free"),
  stripeCustomerId: text("stripeCustomerId"),
  stripeSubscriptionId: text("stripeSubscriptionId"),
  subscriptionStatus: text("subscriptionStatus"), // active, past_due, canceled, null
  subscriptionPeriodEnd: integer("subscriptionPeriodEnd", { mode: "timestamp" }),
  // Period-végi lemondás jelzése. A Stripe Customer Portal lemondási flow-ja
  // ezt állítja true-ra, miközben a subscriptionStatus MARAD "active" a
  // periódus végéig. A /fiok ebből tudja jelezni, hogy "eddig érvényes".
  cancelAtPeriodEnd: integer("cancelAtPeriodEnd", { mode: "boolean" }).notNull().default(false),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

// === NEXUS-SPECIFIKUS TÁBLÁK ===

export const usageDaily = sqliteTable("usageDaily", {
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD formátum
  messageCount: integer("messageCount").notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.date] }),
}));

export const conversation = sqliteTable("conversation", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Új beszélgetés"),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

// === SITE BUILDER TÁBLÁK ===

export const site = sqliteTable("site", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  templateId: text("templateId").notNull().default("starter"),
  data: text("data").notNull(), // JSON: SiteData
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  subdomain: text("subdomain").unique(), // pl. "fodrasz-mari" → fodrasz-mari.nexus.hu
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const usageMonthly = sqliteTable("usageMonthly", {
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  yearMonth: text("yearMonth").notNull(), // YYYY-MM
  siteGenerationCount: integer("siteGenerationCount").notNull().default(0),
  sectionRegenCount: integer("sectionRegenCount").notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.yearMonth] }),
}));

export const message = sqliteTable("message", {
  id: text("id").primaryKey(),
  conversationId: text("conversationId").notNull().references(() => conversation.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  modelUsed: text("modelUsed"), // 'qwen-local' | 'deepseek-v3' | 'claude-sonnet'
  tokensIn: integer("tokensIn"),
  tokensOut: integer("tokensOut"),
  costHuf: integer("costHuf"), // forintban, *100 (filér precízió)
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});
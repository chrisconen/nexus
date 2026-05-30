-- Baseline migration (applied via drizzle push originally)
-- Safe to run on existing databases: uses CREATE TABLE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer NOT NULL DEFAULT false,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`tier` text DEFAULT 'free' NOT NULL,
	`stripeCustomerId` text,
	`stripeSubscriptionId` text,
	`subscriptionStatus` text,
	`subscriptionPeriodEnd` integer,
	`cancelAtPeriodEnd` integer NOT NULL DEFAULT false
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_email_unique` ON `user` (`email`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `session_token_unique` ON `session` (`token`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `usageDaily` (
	`userId` text NOT NULL,
	`date` text NOT NULL,
	`messageCount` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`userId`, `date`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`title` text DEFAULT 'Új beszélgetés' NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `site` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`templateId` text DEFAULT 'starter' NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`subdomain` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `site_subdomain_unique` ON `site` (`subdomain`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `message` (
	`id` text PRIMARY KEY NOT NULL,
	`conversationId` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`modelUsed` text,
	`tokensIn` integer,
	`tokensOut` integer,
	`costHuf` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON UPDATE no action ON DELETE cascade
);

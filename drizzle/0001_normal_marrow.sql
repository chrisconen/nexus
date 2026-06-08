CREATE TABLE `usageMonthly` (
	`userId` text NOT NULL,
	`yearMonth` text NOT NULL,
	`siteGenerationCount` integer DEFAULT 0 NOT NULL,
	`sectionRegenCount` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`userId`, `yearMonth`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

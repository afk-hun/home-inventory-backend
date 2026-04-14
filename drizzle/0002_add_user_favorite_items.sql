CREATE TABLE `UserFavoriteItem` (
	`userId` text NOT NULL,
	`itemId` text NOT NULL,
	`householdId` text NOT NULL,
	PRIMARY KEY(`userId`, `itemId`),
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `HouseholdMember` (
	`householdId` text NOT NULL,
	`userId` text NOT NULL,
	PRIMARY KEY(`householdId`, `userId`),
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Household` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`ownerId` text NOT NULL,
	FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Ingredient` (
	`id` text PRIMARY KEY NOT NULL,
	`recipeId` text NOT NULL,
	`itemId` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`baseQuantity` real,
	`baseUnit` text,
	FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `InvoiceElement` (
	`id` text PRIMARY KEY NOT NULL,
	`invoiceId` text NOT NULL,
	`inStoreId` text NOT NULL,
	`inStoreName` text NOT NULL,
	`inStorePrice` real NOT NULL,
	`inStoreUnitPrice` real NOT NULL,
	`inStoreQuantity` text NOT NULL,
	`inStoreUnit` text NOT NULL,
	`inStoreTaxType` text NOT NULL,
	FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `InvoiceItem` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`storeId` text NOT NULL,
	`storeName` text NOT NULL,
	`inStoreId` text NOT NULL,
	`inStoreName` text NOT NULL,
	`inStorePrice` real NOT NULL,
	`inStoreUnitPrice` real NOT NULL,
	`inStoreQuantity` text NOT NULL,
	`inStoreUnit` text NOT NULL,
	`inStoreTaxType` text NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Invoice` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`storeId` text NOT NULL,
	`storeName` text NOT NULL,
	`storeAddress` text NOT NULL,
	`purchaseDate` integer NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ItemConnectedStore` (
	`id` text PRIMARY KEY NOT NULL,
	`itemId` text NOT NULL,
	`storeId` text NOT NULL,
	`storeName` text NOT NULL,
	`storeItemId` text DEFAULT '' NOT NULL,
	`storeItemName` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ItemType` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`householdId` text NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Item` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`householdId` text NOT NULL,
	`typeId` text,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`typeId`) REFERENCES `ItemType`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `MealType` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`householdId` text NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Meal` (
	`id` text PRIMARY KEY NOT NULL,
	`scheduleId` text NOT NULL,
	`recipeId` text NOT NULL,
	`mealType` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`portion` real NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`scheduleId`) REFERENCES `MonthlyCookingSchedule`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `MonthlyCookingSchedule` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`householdId` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `RecipeType` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`householdId` text NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Recipe` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`householdId` text NOT NULL,
	`type` text,
	`portion` real,
	`description` text,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ShelfItem` (
	`id` text PRIMARY KEY NOT NULL,
	`shelfId` text NOT NULL,
	`itemId` text NOT NULL,
	`itemName` text,
	`quantity` real NOT NULL,
	`unit` text,
	`baseQuantity` real,
	`baseUnit` text,
	FOREIGN KEY (`shelfId`) REFERENCES `Shelf`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ShelfPlaceType` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`householdId` text NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ShelfType` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`householdId` text NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Shelf` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`householdId` text NOT NULL,
	`place` text,
	`type` text,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ShoppingListItem` (
	`id` text PRIMARY KEY NOT NULL,
	`shoppingListId` text NOT NULL,
	`itemName` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`baseQuantity` real,
	`baseUnit` text,
	`checked` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`shoppingListId`) REFERENCES `ShoppingList`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ShoppingList` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`householdId` text NOT NULL,
	`storeId` text NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Store` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`householdId` text NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `UnitType` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`householdId` text NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_unique` ON `User` (`email`);
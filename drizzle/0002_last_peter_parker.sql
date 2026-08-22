CREATE TABLE `trip_checklist_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistItemId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_checklist_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`itemKey` varchar(64) NOT NULL,
	`groupKey` varchar(32) NOT NULL,
	`label` varchar(255) NOT NULL,
	`note` text NOT NULL DEFAULT (''),
	`isChecked` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trip_checklist_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `trip_checklist_user_item_key` UNIQUE(`userId`,`itemKey`)
);
--> statement-breakpoint
CREATE TABLE `trip_expense_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expenseId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_expense_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` varchar(32) NOT NULL,
	`title` varchar(160) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'KRW',
	`spentAt` timestamp NOT NULL,
	`note` text NOT NULL DEFAULT (''),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trip_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trip_checklist_evidence` ADD CONSTRAINT `trip_checklist_evidence_checklistItemId_trip_checklist_items_id_fk` FOREIGN KEY (`checklistItemId`) REFERENCES `trip_checklist_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trip_checklist_items` ADD CONSTRAINT `trip_checklist_items_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trip_expense_receipts` ADD CONSTRAINT `trip_expense_receipts_expenseId_trip_expenses_id_fk` FOREIGN KEY (`expenseId`) REFERENCES `trip_expenses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trip_expenses` ADD CONSTRAINT `trip_expenses_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
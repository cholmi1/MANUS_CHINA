CREATE TABLE `field_record_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `field_record_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `field_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recordKey` varchar(64) NOT NULL,
	`label` varchar(255) NOT NULL,
	`note` text NOT NULL,
	`isChecked` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `field_records_user_record_key` UNIQUE(`userId`,`recordKey`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `field_record_photos` ADD CONSTRAINT `field_record_photos_recordId_field_records_id_fk` FOREIGN KEY (`recordId`) REFERENCES `field_records`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_records` ADD CONSTRAINT `field_records_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
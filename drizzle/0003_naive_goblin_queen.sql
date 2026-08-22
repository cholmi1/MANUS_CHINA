CREATE TABLE `vendor_consultation_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consultationId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`caption` varchar(500) NOT NULL DEFAULT '',
	`mimeType` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_consultation_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_consultations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`recordKey` varchar(64) NOT NULL,
	`label` varchar(255) NOT NULL,
	`note` text NOT NULL DEFAULT (''),
	`isChecked` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_consultations_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendor_consultations_vendor_key` UNIQUE(`vendorId`,`recordKey`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`contactName` varchar(120) NOT NULL DEFAULT '',
	`booth` varchar(120) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendors_user_name` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `vendor_consultation_photos` ADD CONSTRAINT `vendor_consultation_photos_consultationId_vendor_consultations_id_fk` FOREIGN KEY (`consultationId`) REFERENCES `vendor_consultations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_consultations` ADD CONSTRAINT `vendor_consultations_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
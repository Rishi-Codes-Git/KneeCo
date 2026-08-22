CREATE TABLE `clinicianProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`clinicName` varchar(200) NOT NULL,
	`professionalEmail` varchar(320) NOT NULL,
	`licenceFileKey` varchar(1024),
	`licenceVerificationStatus` enum('not_submitted','pending','verified') NOT NULL DEFAULT 'not_submitted',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinicianProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `clinicianProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `clinicianProfiles` ADD CONSTRAINT `clinicianProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
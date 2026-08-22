ALTER TABLE `kneeCases` ADD `oaModelName` varchar(160);--> statement-breakpoint
ALTER TABLE `kneeCases` ADD `oaModelVersion` varchar(120);--> statement-breakpoint
ALTER TABLE `kneeCases` ADD `oaClassificationJson` text;--> statement-breakpoint
ALTER TABLE `kneeCases` ADD `oaClassifiedAt` timestamp;
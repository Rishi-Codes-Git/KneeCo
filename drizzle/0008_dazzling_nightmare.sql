CREATE TABLE `implantCatalogue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`datasetKey` varchar(80) NOT NULL,
	`age` int NOT NULL,
	`sex` enum('female','male') NOT NULL,
	`femoralApMm` double NOT NULL,
	`femoralWidthMm` double NOT NULL,
	`tibialApMm` double NOT NULL,
	`tibialWidthMm` double NOT NULL,
	`suggestedFemoralSize` varchar(30) NOT NULL,
	`suggestedTibialSize` varchar(30) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `implantCatalogue_id` PRIMARY KEY(`id`),
	CONSTRAINT `implantCatalogue_datasetKey_unique` UNIQUE(`datasetKey`)
);
--> statement-breakpoint
CREATE TABLE `implantPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseReference` varchar(40) NOT NULL,
	`dimensionJson` text NOT NULL,
	`rankingJson` text NOT NULL,
	`anonymousSummary` text,
	`planningStatus` enum('ready_for_review','confirmed','closed') NOT NULL DEFAULT 'ready_for_review',
	`confirmedAt` timestamp,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `implantPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `implantPlans_caseReference_unique` UNIQUE(`caseReference`)
);
--> statement-breakpoint
ALTER TABLE `kneeCases` ADD `caseLifecycle` enum('active','confirmed','closed') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `kneeCases` ADD `caseConfirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `kneeCases` ADD `caseClosedAt` timestamp;--> statement-breakpoint
ALTER TABLE `presentationTestCases` ADD `syntheticDimensionsJson` text;
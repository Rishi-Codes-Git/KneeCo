CREATE TABLE `presentationTestCases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`imageId` varchar(80) NOT NULL,
	`age` int NOT NULL,
	`sex` enum('female','male') NOT NULL,
	`weightKg` int NOT NULL,
	`syntheticOaStatus` enum('present','absent') NOT NULL,
	`syntheticClass` varchar(80) NOT NULL,
	`simulatedPlanJson` text NOT NULL,
	`simulationStatus` enum('simulated_not_clinical') NOT NULL DEFAULT 'simulated_not_clinical',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `presentationTestCases_id` PRIMARY KEY(`id`),
	CONSTRAINT `presentationTestCases_fileName_unique` UNIQUE(`fileName`),
	CONSTRAINT `presentationTestCases_imageId_unique` UNIQUE(`imageId`)
);

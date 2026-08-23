ALTER TABLE `kneeCases` ADD `geminiReportModel` varchar(120);--> statement-breakpoint
ALTER TABLE `kneeCases` ADD `geminiReportJson` text;--> statement-breakpoint
ALTER TABLE `kneeCases` ADD `geminiReportExtractedAt` timestamp;
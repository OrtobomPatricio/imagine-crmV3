-- Migration: Create onboarding_progress table
-- Version: 2026-02-24

CREATE TABLE `onboarding_progress` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenantId` INT NOT NULL UNIQUE,
  `companyCompleted` TINYINT(1) DEFAULT 0 NOT NULL,
  `teamCompleted` TINYINT(1) DEFAULT 0 NOT NULL,
  `whatsappCompleted` TINYINT(1) DEFAULT 0 NOT NULL,
  `importCompleted` TINYINT(1) DEFAULT 0 NOT NULL,
  `firstMessageCompleted` TINYINT(1) DEFAULT 0 NOT NULL,
  `startedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `completedAt` TIMESTAMP NULL DEFAULT NULL,
  `lastStep` VARCHAR(50) DEFAULT 'company' NOT NULL,
  `companyData` JSON DEFAULT NULL,
  `teamInvites` JSON DEFAULT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `onboarding_progress_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
);

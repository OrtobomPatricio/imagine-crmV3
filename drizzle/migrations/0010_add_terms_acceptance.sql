-- Migration: Add terms_acceptance table
-- Version: 2026-02-24

CREATE TABLE IF NOT EXISTS `terms_acceptance` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tenantId` INT NOT NULL,
  `userId` INT NOT NULL,
  `termsVersion` VARCHAR(20) NOT NULL,
  `acceptedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ipAddress` VARCHAR(45) DEFAULT NULL,
  `userAgent` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_terms_user_version` (`tenantId`, `userId`, `termsVersion`),
  CONSTRAINT `fk_terms_tenant` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_terms_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

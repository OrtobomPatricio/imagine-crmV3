-- Migration: Add GDPR compliance fields to users table
-- Version: 2026-02-24

ALTER TABLE `users` 
ADD COLUMN `gdprConsentAt` TIMESTAMP NULL DEFAULT NULL AFTER `lastSignedIn`,
ADD COLUMN `gdprConsentVersion` VARCHAR(20) DEFAULT NULL AFTER `gdprConsentAt`,
ADD COLUMN `marketingConsent` BOOLEAN NOT NULL DEFAULT 0 AFTER `gdprConsentVersion`,
ADD COLUMN `marketingConsentAt` TIMESTAMP NULL DEFAULT NULL AFTER `marketingConsent`,
ADD COLUMN `dataRetentionUntil` TIMESTAMP NULL DEFAULT NULL AFTER `marketingConsentAt`;

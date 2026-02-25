-- Migration: Add missing columns to tenants table
-- Version: 2026-02-24

ALTER TABLE `tenants` 
ADD COLUMN `slug` VARCHAR(100) NOT NULL AFTER `name`,
ADD COLUMN `plan` ENUM('free', 'starter', 'pro', 'enterprise') NOT NULL DEFAULT 'free' AFTER `slug`,
ADD COLUMN `stripeCustomerId` VARCHAR(255) DEFAULT NULL AFTER `plan`,
ADD UNIQUE KEY `idx_tenant_slug` (`slug`);

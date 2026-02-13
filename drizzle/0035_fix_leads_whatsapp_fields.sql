-- Migration: Add missing WhatsApp fields to leads table
-- These fields were added to conversations and chat_messages in 0033 but missing from leads
-- Date: 2026-02-13

ALTER TABLE `leads` 
ADD COLUMN `whatsappConnectionType` enum('api','qr') DEFAULT 'api',
ADD COLUMN `externalChatId` varchar(100);

-- Add index for external chat ID lookups
CREATE INDEX `idx_leads_external_chat` ON `leads`(`externalChatId`);

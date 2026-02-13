-- Add whatsappConnectionType column to leads table
-- This was missing from migration 0033 which added it to conversations and chat_messages

ALTER TABLE leads
  ADD COLUMN whatsappConnectionType ENUM('api','qr') NULL AFTER whatsappNumberId;

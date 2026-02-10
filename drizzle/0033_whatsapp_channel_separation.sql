-- Adds channel separation fields so Cloud API + QR sessions can coexist safely

ALTER TABLE conversations
  ADD COLUMN whatsappConnectionType ENUM('api','qr') NULL AFTER whatsappNumberId,
  ADD COLUMN externalChatId VARCHAR(100) NULL AFTER whatsappConnectionType;

ALTER TABLE chat_messages
  ADD COLUMN whatsappConnectionType ENUM('api','qr') NULL AFTER whatsappNumberId;

-- Optional helper index for faster filtering
CREATE INDEX idx_conversations_whatsapp_channel
  ON conversations (whatsappNumberId, whatsappConnectionType);

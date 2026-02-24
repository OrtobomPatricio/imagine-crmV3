-- Tags system
CREATE TABLE IF NOT EXISTS `tags` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `name` varchar(50) NOT NULL,
    `color` varchar(7) DEFAULT '#3b82f6' NOT NULL,
    `description` text,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE KEY `uniq_tag_name` (`name`)
);

CREATE TABLE IF NOT EXISTS `lead_tags` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `leadId` int NOT NULL,
    `tagId` int NOT NULL,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE KEY `uniq_lead_tag` (`leadId`, `tagId`),
    CONSTRAINT `lead_tags_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
    CONSTRAINT `lead_tags_tagId_tags_id_fk` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `conversation_tags` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `conversationId` int NOT NULL,
    `tagId` int NOT NULL,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE KEY `uniq_conv_tag` (`conversationId`, `tagId`),
    CONSTRAINT `conversation_tags_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
    CONSTRAINT `conversation_tags_tagId_tags_id_fk` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE CASCADE
);

-- Lead notes
CREATE TABLE IF NOT EXISTS `lead_notes` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `leadId` int NOT NULL,
    `content` text NOT NULL,
    `createdById` int,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT `lead_notes_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
    CONSTRAINT `lead_notes_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Lead tasks
CREATE TABLE IF NOT EXISTS `lead_tasks` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `leadId` int NOT NULL,
    `title` varchar(200) NOT NULL,
    `description` text,
    `dueDate` timestamp NULL,
    `status` ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending' NOT NULL,
    `priority` ENUM('low', 'medium', 'high') DEFAULT 'medium' NOT NULL,
    `assignedToId` int,
    `createdById` int,
    `completedAt` timestamp NULL,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT `lead_tasks_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
    CONSTRAINT `lead_tasks_assignedToId_users_id_fk` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    CONSTRAINT `lead_tasks_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- AI suggestions
CREATE TABLE IF NOT EXISTS `ai_suggestions` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `conversationId` int NOT NULL,
    `suggestion` text NOT NULL,
    `context` text,
    `used` boolean DEFAULT false NOT NULL,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT `ai_suggestions_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE
);

-- Chatbot flows
CREATE TABLE IF NOT EXISTS `chatbot_flows` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `name` varchar(100) NOT NULL,
    `trigger` ENUM('keyword', 'new_conversation', 'no_match', 'hours') NOT NULL,
    `triggerValue` varchar(200),
    `responses` json NOT NULL,
    `isActive` boolean DEFAULT true NOT NULL,
    `hoursOnly` boolean DEFAULT false NOT NULL,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Webhooks
CREATE TABLE IF NOT EXISTS `webhooks` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `name` varchar(100) NOT NULL,
    `url` varchar(500) NOT NULL,
    `secret` varchar(255) NOT NULL,
    `events` json NOT NULL,
    `active` boolean DEFAULT true NOT NULL,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `webhook_deliveries` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `webhookId` int NOT NULL,
    `event` varchar(100) NOT NULL,
    `payload` text NOT NULL,
    `responseStatus` int,
    `responseBody` text,
    `success` boolean DEFAULT false NOT NULL,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT `webhook_deliveries_webhookId_webhooks_id_fk` FOREIGN KEY (`webhookId`) REFERENCES `webhooks`(`id`) ON DELETE CASCADE
);

-- Quotations
CREATE TABLE IF NOT EXISTS `quotations` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `leadId` int NOT NULL,
    `conversationId` int,
    `quoteNumber` varchar(50) NOT NULL UNIQUE,
    `title` varchar(200) NOT NULL,
    `description` text,
    `items` json NOT NULL,
    `subtotal` decimal(12, 2) NOT NULL,
    `tax` decimal(12, 2) DEFAULT '0.00',
    `total` decimal(12, 2) NOT NULL,
    `currency` varchar(10) DEFAULT 'PYG' NOT NULL,
    `status` ENUM('draft', 'sent', 'approved', 'rejected', 'expired') DEFAULT 'draft' NOT NULL,
    `validUntil` timestamp NULL,
    `approvedAt` timestamp NULL,
    `rejectedAt` timestamp NULL,
    `rejectionReason` text,
    `pdfUrl` varchar(500),
    `createdById` int,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT `quotations_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
    CONSTRAINT `quotations_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE SET NULL,
    CONSTRAINT `quotations_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Forms
CREATE TABLE IF NOT EXISTS `forms` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `name` varchar(100) NOT NULL,
    `slug` varchar(100) NOT NULL UNIQUE,
    `title` varchar(200),
    `description` text,
    `fields` json NOT NULL,
    `whatsappNumberId` int,
    `welcomeMessage` text,
    `isActive` boolean DEFAULT true NOT NULL,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT `forms_whatsappNumberId_whatsapp_numbers_id_fk` FOREIGN KEY (`whatsappNumberId`) REFERENCES `whatsapp_numbers`(`id`) ON DELETE SET NULL
);

-- License
CREATE TABLE IF NOT EXISTS `license` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `key` varchar(255) NOT NULL UNIQUE,
    `status` ENUM('active', 'expired', 'canceled', 'trial') DEFAULT 'trial' NOT NULL,
    `plan` varchar(50) DEFAULT 'starter' NOT NULL,
    `expiresAt` timestamp NULL,
    `maxUsers` int DEFAULT 5,
    `maxWhatsappNumbers` int DEFAULT 3,
    `maxMessagesPerMonth` int DEFAULT 10000,
    `features` json,
    `metadata` json,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS `usage_tracking` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `year` int NOT NULL,
    `month` int NOT NULL,
    `messagesSent` int DEFAULT 0,
    `messagesReceived` int DEFAULT 0,
    `activeUsers` int DEFAULT 0,
    `activeWhatsappNumbers` int DEFAULT 0,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    UNIQUE KEY `uniq_usage_year_month` (`year`, `month`)
);

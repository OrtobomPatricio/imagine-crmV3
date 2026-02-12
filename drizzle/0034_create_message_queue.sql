CREATE TABLE IF NOT EXISTS `message_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`chatMessageId` int,
	`priority` int NOT NULL DEFAULT 0,
	`status` enum('queued','processing','sent','failed') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`nextAttemptAt` timestamp NOT NULL DEFAULT (now()),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `message_queue_id` PRIMARY KEY(`id`),
	CONSTRAINT `message_queue_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action,
	CONSTRAINT `message_queue_chatMessageId_chat_messages_id_fk` FOREIGN KEY (`chatMessageId`) REFERENCES `chat_messages`(`id`) ON DELETE cascade ON UPDATE no action
);

-- Helpdesk module: queues + quick answers + ticket status on conversations
CREATE TABLE IF NOT EXISTS support_queues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(32) NOT NULL,
  greetingMessage TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_support_queues_name (name)
);

CREATE TABLE IF NOT EXISTS support_user_queues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  queueId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_queue (userId, queueId),
  CONSTRAINT fk_suq_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_suq_queue FOREIGN KEY (queueId) REFERENCES support_queues(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quick_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shortcut TEXT NOT NULL,
  message TEXT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add columns on conversations if missing (compatible with MySQL 5.7+)
SET @col_ticket_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND COLUMN_NAME = 'ticketStatus'
);
SET @sql := IF(@col_ticket_exists = 0,
  "ALTER TABLE conversations ADD COLUMN ticketStatus ENUM('pending','open','closed') NOT NULL DEFAULT 'pending'",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_queue_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND COLUMN_NAME = 'queueId'
);
SET @sql := IF(@col_queue_exists = 0,
  "ALTER TABLE conversations ADD COLUMN queueId INT NULL",
  "SELECT 1"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key only if missing
SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'conversations'
    AND CONSTRAINT_NAME = 'fk_conversations_queue'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE conversations ADD CONSTRAINT fk_conversations_queue FOREIGN KEY (queueId) REFERENCES support_queues(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

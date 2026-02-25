-- Script para arreglar el esquema de base de datos
-- Ejecutar en MySQL después de iniciar Docker

-- Añadir columnas faltantes a users
ALTER TABLE users ADD COLUMN tenantId INT DEFAULT 1;
ALTER TABLE users ADD COLUMN openId VARCHAR(255);
ALTER TABLE users ADD COLUMN loginMethod VARCHAR(50) DEFAULT 'email';
ALTER TABLE users ADD COLUMN customRole VARCHAR(100);
ALTER TABLE users ADD COLUMN hasSeenTour BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN invitationToken VARCHAR(255);
ALTER TABLE users ADD COLUMN invitationExpires TIMESTAMP;
ALTER TABLE users ADD COLUMN gdprConsentAt TIMESTAMP;
ALTER TABLE users ADD COLUMN gdprConsentVersion VARCHAR(20);
ALTER TABLE users ADD COLUMN marketingConsent BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN marketingConsentAt TIMESTAMP;
ALTER TABLE users ADD COLUMN dataRetentionUntil TIMESTAMP;
ALTER TABLE users ADD COLUMN termsAcceptedAt TIMESTAMP;
ALTER TABLE users ADD COLUMN termsVersion VARCHAR(20);

-- Añadir columnas faltantes a campaigns
ALTER TABLE campaigns ADD COLUMN tenantId INT DEFAULT 1;

-- Añadir columnas faltantes a sessions
ALTER TABLE sessions ADD COLUMN tenantId INT DEFAULT 1;
ALTER TABLE sessions ADD COLUMN ipAddress VARCHAR(45);
ALTER TABLE sessions ADD COLUMN userAgent TEXT;
ALTER TABLE sessions ADD COLUMN lastActivityAt TIMESTAMP;
ALTER TABLE sessions ADD COLUMN expiresAt TIMESTAMP;

-- Crear tabla lead_reminders si no existe
CREATE TABLE IF NOT EXISTS lead_reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenantId INT NOT NULL DEFAULT 1,
    leadId INT NOT NULL,
    conversationId INT,
    createdById INT,
    scheduledAt TIMESTAMP NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/Asuncion',
    message TEXT NOT NULL,
    messageType VARCHAR(20) DEFAULT 'text',
    mediaUrl VARCHAR(500),
    mediaName VARCHAR(255),
    buttons JSON,
    status VARCHAR(20) DEFAULT 'scheduled',
    sentAt TIMESTAMP,
    errorMessage TEXT,
    response TEXT,
    respondedAt TIMESTAMP,
    isRecurring BOOLEAN DEFAULT FALSE,
    recurrencePattern VARCHAR(100),
    recurrenceEndDate TIMESTAMP,
    parentReminderId INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_lead_reminders_tenant_status (tenantId, status),
    INDEX idx_lead_reminders_scheduled (scheduledAt)
);

-- Crear tabla onboarding_progress si no existe
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenantId INT NOT NULL UNIQUE DEFAULT 1,
    companyCompleted BOOLEAN DEFAULT FALSE,
    teamCompleted BOOLEAN DEFAULT FALSE,
    whatsappCompleted BOOLEAN DEFAULT FALSE,
    importCompleted BOOLEAN DEFAULT FALSE,
    firstMessageCompleted BOOLEAN DEFAULT FALSE,
    lastStep VARCHAR(50) DEFAULT 'company',
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar registro de onboarding inicial
INSERT INTO onboarding_progress (tenantId) VALUES (1) ON DUPLICATE KEY UPDATE tenantId=tenantId;

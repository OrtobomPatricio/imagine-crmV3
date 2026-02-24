CREATE TABLE IF NOT EXISTS app_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  singleton INT NOT NULL DEFAULT 1,
  companyName VARCHAR(120) DEFAULT 'Imagine Lab CRM',
  logoUrl VARCHAR(500),
  timezone VARCHAR(60) DEFAULT 'America/Asuncion',
  language VARCHAR(10) DEFAULT 'es',
  currency VARCHAR(10) DEFAULT 'PYG',
  permissionsMatrix JSON,
  scheduling JSON,
  dashboardConfig JSON,
  salesConfig JSON,
  smtpConfig JSON,
  storageConfig JSON,
  aiConfig JSON,
  mapsConfig JSON,
  slaConfig JSON,
  securityConfig JSON,
  metaConfig JSON,
  chatDistributionConfig JSON,
  lastAssignedAgentId INT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_singleton (singleton)
);

INSERT INTO app_settings (id, singleton, companyName, permissionsMatrix, scheduling) 
VALUES (1, 1, 'Imagine Lab CRM', 
  '{"owner":["*"],"admin":["settings.*","dashboard.*","leads.*","chat.*"],"supervisor":["dashboard.view","leads.view","chat.*"],"agent":["dashboard.view","leads.*","chat.*"],"viewer":["dashboard.view"]}',
  '{"slotMinutes":15,"maxPerSlot":6,"allowCustomTime":true}'
) ON DUPLICATE KEY UPDATE id=id;

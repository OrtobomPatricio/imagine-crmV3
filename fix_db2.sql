ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS singleton INT NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS securityConfig JSON AFTER slaConfig;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS metaConfig JSON AFTER securityConfig;
ALTER TABLE app_settings ADD UNIQUE KEY IF NOT EXISTS uniq_singleton (singleton);

INSERT INTO app_settings (id, singleton, companyName, permissionsMatrix, scheduling) 
VALUES (1, 1, 'Imagine Lab CRM', 
  '{"owner":["*"],"admin":["settings.*","dashboard.*","leads.*","chat.*"],"supervisor":["dashboard.view","leads.view","chat.*"],"agent":["dashboard.view","leads.*","chat.*"],"viewer":["dashboard.view"]}',
  '{"slotMinutes":15,"maxPerSlot":6,"allowCustomTime":true}'
) ON DUPLICATE KEY UPDATE permissionsMatrix=VALUES(permissionsMatrix);

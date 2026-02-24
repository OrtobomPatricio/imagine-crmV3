# Server Services

## Directorio: `server/services/`

Contiene la lógica de negocio del CRM, organizada por dominio funcional.

### Core Services

| Archivo | Descripción | Dependencias |
|---------|-------------|-------------|
| `baileys.ts` | Gestión de conexiones WhatsApp vía Baileys (QR) | @whiskeysockets/baileys |
| `baileys-redis-store.ts` | Persistencia de sesiones Baileys en Redis | ioredis |
| `message-handler.ts` | Procesamiento de mensajes entrantes (WA/FB) | baileys, drizzle |
| `queue-worker.ts` | Cola de mensajes con retry y prioridades | — |
| `campaign-worker.ts` | Ejecución de campañas de marketing masivas | drizzle, baileys |
| `distribution.ts` | Distribución round-robin de leads entre agentes | drizzle |
| `websocket.ts` | Servidor WebSocket para actualizaciones en tiempo real | ws |

### Security Services

| Archivo | Descripción | Dependencias |
|---------|-------------|-------------|
| `totp.ts` | 2FA mediante TOTP (RFC 6238) | crypto (built-in) |
| `password-policy.ts` | Validación de complejidad de contraseñas | — |
| `pii-encryption.ts` | Encriptación AES-256-GCM para datos personales | crypto (built-in) |
| `pii-masking.ts` | Redacción de PII en logs | — |
| `magic-numbers.ts` | Validación de tipo de archivo por headers binarios | — |
| `antivirus.ts` | Escaneo ClamAV para uploads | clamdscan CLI |
| `security.ts` | Rate limiting y seguridad general | — |

### Performance Services

| Archivo | Descripción | Dependencias |
|---------|-------------|-------------|
| `app-cache.ts` | Cache Redis multinivel (settings, perms, listings) | ioredis |
| `materialized-views.ts` | Vistas materializadas para dashboards | drizzle |
| `apm.ts` | Sentry APM (traces, metrics) | @sentry/node |
| `image-compression.ts` | Compresión Sharp → WebP | sharp (opcional) |

### Database & Maintenance

| Archivo | Descripción | Dependencias |
|---------|-------------|-------------|
| `db-optimization.ts` | Covering indexes y CHECK constraints | drizzle |
| `fulltext-indexes.ts` | Índices FULLTEXT para búsquedas | drizzle |
| `archival-job.ts` | Limpieza periódica de datos antiguos | node-cron |
| `conflict-resolution.ts` | Optimistic locking con timestamps | drizzle |
| `auto-backup.ts` | Backups automáticos programados | node-cron |
| `backup.ts` | Lógica de backup/restore | drizzle |

### Integration Services

| Archivo | Descripción | Dependencias |
|---------|-------------|-------------|
| `circuit-breaker.ts` | Pattern Circuit Breaker para APIs externas | — |
| `email-queue.ts` | Cola de emails con retry | nodemailer |
| `wa-health-check.ts` | Health check periódico de conexiones WA | node-cron |
| `whatsapp-restorer.ts` | Restauración de sesiones WA al iniciar | baileys |

### Scheduled Jobs

| Archivo | Descripción | Frecuencia |
|---------|-------------|-----------|
| `archival-job.ts` | Limpieza de mensajes/logs antiguos | Diario 3AM |
| `auto-backup.ts` | Backup automático de BD | Configurable |
| `wa-health-check.ts` | Verificación de conexiones WA | Cada 5 min |
| `materialized-views.ts` | Refresh de vistas materializadas | Cada 15 min |
| `cleanup-logs.ts` | Limpieza de logs del sistema | Periódico |
| `cleanup-sessions.ts` | Limpieza de sesiones expiradas | Periódico |

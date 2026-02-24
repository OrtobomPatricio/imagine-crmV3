# Server Routers

## Directorio: `server/routers/`

Contiene los routers tRPC del CRM, organizados por dominio funcional.
Cada router exporta procedimientos protegidos por autenticación y permisos via `permissionProcedure`.

### Routers Principales

| Archivo | Prefijo tRPC | Descripción |
|---------|-------------|-------------|
| `auth.ts` | `auth.*` | Login, registro, OAuth, tokens |
| `leads.ts` | `leads.*` | CRUD de leads, búsqueda, asignación |
| `chat.ts` | `chat.*` | Mensajes, conversaciones, envío WA/FB |
| `settings.ts` | `settings.*` | Configuración de tenant y preferencias |
| `pipelines.ts` | `pipelines.*` | Pipelines de ventas y stages |
| `dashboard.ts` | `dashboard.*` | Stats y métricas del dashboard |

### Routers de Módulos

| Archivo | Prefijo tRPC | Descripción |
|---------|-------------|-------------|
| `helpdesk.ts` | `helpdesk.*` | Tickets, colas, SLA |
| `campaigns.ts` | `campaigns.*` | Campañas de marketing |
| `automations.ts` | `automations.*` | Flujos de automatización |
| `templates.ts` | `templates.*` | Plantillas de mensajes |
| `custom-fields.ts` | `customFields.*` | Campos personalizados por entidad |
| `gamification.ts` | `gamification.*` | Puntos, niveles, logros |

### Routers de Seguridad y Admin

| Archivo | Prefijo tRPC | Descripción |
|---------|-------------|-------------|
| `security.ts` | `security.*` | Sesiones, GDPR, access logs |
| `backup.ts` | `backup.*` | Backup, restore, CSV import/export |
| `facebook.ts` | `facebook.*` | Integración Facebook Messenger |
| `whatsapp.ts` | `whatsapp.*` | Gestión de números WA |

### Convenciones

- **Autenticación**: Todos los routers usan `protectedProcedure` o `permissionProcedure`
- **Tenant Isolation**: Cada query filtra por `ctx.tenantId`
- **Validación**: Inputs validados con `zod` schemas
- **Errores**: Usa `TRPCError` con códigos estándar (`NOT_FOUND`, `FORBIDDEN`, etc.)

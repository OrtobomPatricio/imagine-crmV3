# Política de Privacidad — CRM PRO

*Última actualización: Febrero 2026*

## 1. Responsable del Tratamiento

CRM PRO actúa como **encargado del tratamiento** de los datos personales que nuestros clientes (los "responsables del tratamiento") almacenan en la plataforma. Esta política describe cómo recopilamos, usamos y protegemos la información.

## 2. Datos que Recopilamos

### 2.1 Datos de la Cuenta
- Nombre y apellido
- Dirección de correo electrónico
- Contraseña (hasheada con bcrypt)
- Rol y permisos

### 2.2 Datos de Uso
- Dirección IP (anonimizada en logs)
- Navegador y dispositivo
- Páginas visitadas y funciones utilizadas
- Timestamps de actividad

### 2.3 Datos de Clientes (procesados por cuenta del usuario)
- Nombres y teléfonos de contactos/leads
- Historial de conversaciones
- Archivos adjuntos enviados/recibidos

## 3. Base Legal del Tratamiento (RGPD Art. 6)

| Finalidad | Base Legal |
|-----------|-----------|
| Prestación del servicio | Ejecución contractual |
| Seguridad y prevención de fraude | Interés legítimo |
| Comunicaciones sobre el servicio | Interés legítimo |
| Marketing directo | Consentimiento |
| Analítica de uso | Consentimiento (cookies) |
| Cumplimiento legal | Obligación legal |

## 4. Derechos del Usuario (RGPD Art. 15-22)

Usted tiene derecho a:

- **Acceso**: Solicitar una copia de sus datos personales.
- **Rectificación**: Corregir datos inexactos o incompletos.
- **Supresión**: Solicitar la eliminación de sus datos ("derecho al olvido").
- **Portabilidad**: Recibir sus datos en formato estructurado (JSON).
- **Oposición**: Oponerse al tratamiento basado en interés legítimo.
- **Limitación**: Restringir el tratamiento en determinadas circunstancias.

### Cómo ejercer sus derechos:
1. Desde la aplicación: **Ajustes → Seguridad → Mis Datos (GDPR)**
2. Por email: **privacy@crmpro.com**
3. Tiempo de respuesta: máximo 30 días.

## 5. Seguridad de los Datos

Implementamos las siguientes medidas de seguridad:

- **Encriptación en tránsito**: TLS 1.3 en todas las conexiones
- **Encriptación en reposo**: AES-256-GCM para datos PII
- **Control de acceso**: RBAC con permisos granulares
- **Autenticación**: 2FA/TOTP disponible
- **Auditoría**: Registro completo de accesos y modificaciones
- **Aislamiento**: Arquitectura multi-tenant con separación por tenantId
- **Backups**: Copias de seguridad diarias con retención de 30 días

## 6. Transferencias Internacionales

Los datos pueden ser almacenados en servidores ubicados en diferentes jurisdicciones. En caso de transferencia fuera del EEE, aplicamos:
- Cláusulas contractuales tipo (SCCs)
- Evaluación de impacto de transferencia (TIA)

## 7. Retención de Datos

| Tipo de Dato | Período de Retención |
|-------------|---------------------|
| Datos de cuenta activa | Mientras la cuenta esté activa |
| Datos post-cancelación | 90 días (para recuperación) |
| Logs de auditoría | 1 año |
| Backups | 30 días |
| Datos anonimizados | Indefinido |

## 8. Cookies

Utilizamos cookies para:
- **Esenciales**: Autenticación y sesión (siempre activas)
- **Analíticas**: Google Analytics / Sentry (con consentimiento)
- **Marketing**: No utilizamos cookies de marketing propias

Puede gestionar sus preferencias de cookies en cualquier momento mediante el banner de consentimiento.

## 9. Menores

El Servicio no está dirigido a menores de 18 años. No recopilamos intencionadamente datos de menores.

## 10. Cambios en esta Política

Notificaremos cualquier cambio material por email y actualizaremos la fecha de "Última actualización" en este documento.

## 11. Contacto del Delegado de Protección de Datos

Para consultas sobre privacidad o protección de datos:
- **Email**: dpo@crmpro.com
- **Dirección**: [Dirección del responsable]

## 12. Autoridad de Control

Si considera que el tratamiento de sus datos vulnera la normativa, puede presentar una reclamación ante la autoridad de protección de datos de su país.

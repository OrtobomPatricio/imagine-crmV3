# 🚀 CRM PRO V4 - Guía de Configuración

## ✅ Estado del Proyecto

| Aspecto | Estado |
|---------|--------|
| TypeScript | ✅ Sin errores |
| Build | ✅ Funcionando |
| Storybook | ✅ Configurado |
| Tests E2E | ✅ 5 tests listos |
| Docker | ✅ Configurado |

## 🛠️ Requisitos

- **Node.js**: v20+
- **pnpm**: v10+
- **Docker** (opcional pero recomendado)
- **MySQL**: 8.0+ (o usar Docker)

## 📦 Instalación Rápida

### Opción 1: Windows (Script Automático)

```bash
# 1. Clonar o navegar al proyecto
cd crmpro_extract

# 2. Ejecutar script de inicio
.\start-dev.bat
```

### Opción 2: Linux/Mac (Script Automático)

```bash
# 1. Navegar al proyecto
cd crmpro_extract

# 2. Ejecutar script
./start-dev.sh
```

### Opción 3: Manual

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 3. Iniciar MySQL con Docker
docker run -d --name mysql-crm \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=chin_crm \
  -e MYSQL_USER=crm \
  -e MYSQL_PASSWORD=change_me \
  -p 3306:3306 \
  mysql:8.0 --default-authentication-plugin=mysql_native_password

# 4. Ejecutar migraciones
npm run db:push

# 5. Iniciar servidor de desarrollo
npm run dev
```

## 🌐 Acceso

Una vez iniciado, accede a:

- **Aplicación**: http://localhost:3000
- **Storybook**: http://localhost:6006
- **API Docs**: http://localhost:3000/api-docs (si implementaste OpenAPI)

## 🧪 Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Iniciar servidor de desarrollo
npm run check            # Verificar TypeScript
npm run build            # Build para producción

# Base de datos
npm run db:push          # Empujar schema a la base de datos
npm run db:generate      # Generar migraciones

# Tests
npm run test             # Tests unitarios
npm run e2e              # Tests E2E con Playwright
npm run e2e:ui           # Tests E2E con UI

# Storybook
npm run storybook        # Iniciar Storybook
npm run build-storybook  # Build de Storybook

# Utilidades
npm run format           # Formatear código con Prettier
npm run bootstrap:admin  # Crear usuario admin
```

## 🐳 Docker Compose (Producción)

```bash
# Configurar variables
cp .env.example .env
# Editar .env con valores seguros para producción

# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f app
```

## 📝 Configuración de .env

Variables importantes:

```env
# Base de datos
DATABASE_URL=mysql://crm:change_me@127.0.0.1:3306/chin_crm

# Seguridad (cambiar en producción!)
JWT_SECRET=tu_secreto_jwt_32_chars_minimo
DATA_ENCRYPTION_KEY=tu_clave_encriptacion_32_chars
COOKIE_SECRET=tu_cookie_secret_seguro

# OAuth (opcional)
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Stripe (opcional, para billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🐛 Solución de Problemas

### Error: "Cannot find module"
```bash
pnpm install
```

### Error: "Database connection failed"
```bash
# Verificar que MySQL está corriendo
docker ps | grep mysql

# Si no está corriendo, iniciarlo
docker start mysql-crm
```

### Error: "ECONNREFUSED 127.0.0.1:3306"
```bash
# Esperar unos segundos a que MySQL inicie completamente
# O verificar logs de MySQL
docker logs mysql-crm
```

### Error de TypeScript
```bash
# Verificar tipos
npm run check

# Si hay errores, probablemente falta alguna dependencia
pnpm install
```

## 🎨 Storybook

Para ver los componentes aislados:

```bash
npm run storybook
```

Componentes documentados:
- Button
- Card
- Dialog
- Input
- Badge

## ✅ Checklist Pre-Lanzamiento

- [ ] Cambiar todas las claves secretas en .env
- [ ] Configurar dominio y SSL
- [ ] Configurar OAuth (Google/Microsoft)
- [ ] Configurar Stripe (si usarás billing)
- [ ] Configurar S3 para storage
- [ ] Configurar Sentry para errores
- [ ] Probar flujo de onboarding
- [ ] Probar pagos con Stripe
- [ ] Verificar emails funcionan
- [ ] Backup de base de datos configurado

## 📊 Monitoreo

Endpoints de salud:
- `/health` - Health check básico
- `/api/health` - Health check de API

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs: `docker-compose logs`
2. Verificar `.env` esté configurado
3. Ejecutar `npm run check` para errores de TypeScript
4. Verificar base de datos esté accesible

---

**Versión**: 1.0.0  
**Última actualización**: Febrero 2026

@echo off
chcp 65001 >nul
echo 🚀 CRM PRO V4 - Inicio de Desarrollo
echo =====================================

:: Verificar si existe .env
if not exist .env (
    echo ⚠️  Archivo .env no encontrado
    echo 📝 Creando .env desde .env.example...
    copy .env.example .env
    echo ✅ .env creado. Por favor revisa la configuración.
)

:: Iniciar MySQL con Docker si no está corriendo
echo 🔍 Verificando MySQL...
docker ps | findstr mysql-crm >nul
if errorlevel 1 (
    echo 🐳 Iniciando MySQL con Docker...
    docker run -d --name mysql-crm ^
        -e MYSQL_ROOT_PASSWORD=root ^
        -e MYSQL_DATABASE=chin_crm ^
        -e MYSQL_USER=crm ^
        -e MYSQL_PASSWORD=change_me ^
        -p 3306:3306 ^
        mysql:8.0 --default-authentication-plugin=mysql_native_password
    
    echo ⏳ Esperando a que MySQL esté listo...
    timeout /t 10 /nobreak >nul
    echo ✅ MySQL iniciado
) else (
    echo ✅ MySQL ya está corriendo
)

:: Verificar dependencias
if not exist node_modules (
    echo 📦 Instalando dependencias...
    pnpm install
)

:: Ejecutar migraciones
echo 🔄 Ejecutando migraciones...
npm run db:push

:: Iniciar servidor de desarrollo
echo 🚀 Iniciando servidor de desarrollo...
npm run dev

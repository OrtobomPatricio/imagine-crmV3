@echo off
chcp 65001 >nul
title CRM PRO V4 - Inicio Rápido
cls

echo ==========================================
echo    CRM PRO V4 - INICIO RÁPIDO
echo ==========================================
echo.

REM Verificar si estamos en la carpeta correcta
if not exist package.json (
    echo ❌ Error: No estás en la carpeta del proyecto
    echo Por favor navega a: cd crmpro_extract
    pause
    exit /b 1
)

REM Verificar Docker
echo 🐳 Verificando Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker no está corriendo
    echo Por favor inicia Docker Desktop primero
    pause
    exit /b 1
)
echo ✅ Docker OK

REM Limpiar e iniciar MySQL
echo.
echo 🗄️  Iniciando MySQL...
docker stop mysql-crm >nul 2>&1
docker rm mysql-crm >nul 2>&1
docker run -d --name mysql-crm -v crm_data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=chin_crm -e MYSQL_USER=crm -e MYSQL_PASSWORD=change_me -p 3306:3306 mysql:8.0 --default-authentication-plugin=mysql_native_password >nul 2>&1

echo ⏳ Esperando MySQL (30 segundos)...
timeout /t 30 /nobreak >nul

REM Crear .env si no existe
REM Generar claves seguras aleatorias antes de crear el archivo
for /f "delims=" %%i in ('powershell -Command "[guid]::NewGuid().ToString().Replace('-', '') + [guid]::NewGuid().ToString().Replace('-', '')"') do set GEN_JWT=%%i
for /f "delims=" %%i in ('powershell -Command "[guid]::NewGuid().ToString().Replace('-', '')"') do set GEN_COOKIE=%%i

if not exist .env (
    echo.
    echo 📝 Creando configuración...
    (
        echo DATABASE_URL=mysql://crm:change_me@127.0.0.1:3306/chin_crm
        echo REDIS_URL=
        echo NODE_ENV=development
        echo PORT=3000
        echo JWT_SECRET=%GEN_JWT%
        echo DATA_ENCRYPTION_KEY=%GEN_JWT%
        echo COOKIE_SECRET=%GEN_COOKIE%
        echo VITE_OAUTH_PORTAL_URL=http://localhost:3000
        echo VITE_APP_ID=chin-crm
        echo OAUTH_SERVER_URL=http://localhost:3000
        echo VITE_DEV_BYPASS_AUTH=1
        echo ALLOW_DEV_LOGIN=1
        echo OWNER_OPEN_ID=dev@localhost
        echo OWNER_EMAIL=dev@localhost
        echo WHATSAPP_WEBHOOK_VERIFY_TOKEN=imagine_crm_verify_2024_secure_token
        echo WHATSAPP_APP_SECRET=
        echo WHATSAPP_GRAPH_VERSION=v19.0
        echo WHATSAPP_GRAPH_BASE_URL=https://graph.facebook.com
    ) > .env
    echo ✅ Configuración creada
)

REM Instalar dependencias si es necesario
if not exist node_modules (
    echo.
    echo 📦 Instalando dependencias...
    call pnpm install
    if errorlevel 1 (
        echo ❌ Error instalando dependencias
        pause
        exit /b 1
    )
)

REM Ejecutar migraciones
echo.
echo 🔄 Configurando base de datos...
call npm run db:push

REM Iniciar servidor
echo.
echo ==========================================
echo ✅ TODO LISTO - INICIANDO SERVIDOR
echo ==========================================
echo.
echo 🌐 Abre tu navegador en:
echo    http://localhost:3000
echo.
echo ⚠️  NO CIERRES ESTA VENTANA
echo Presiona Ctrl+C para detener
echo.

call npm run dev

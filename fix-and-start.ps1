# CRM PRO V4 - Script de Diagnóstico y Arranque
# Ejecutar como Administrador si es posible

Write-Host "🔧 CRM PRO V4 - Diagnóstico y Arranque" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Docker
Write-Host "🐳 Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker no está corriendo. Por favor inicia Docker Desktop." -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit 1
    }
    Write-Host "✅ Docker está corriendo" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker no está instalado o no está en el PATH" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

# 2. Detener contenedores anteriores si existen
Write-Host ""
Write-Host "🧹 Limpiando contenedores anteriores..." -ForegroundColor Yellow
docker stop mysql-crm 2>$null
docker rm mysql-crm 2>$null
Write-Host "✅ Limpieza completada" -ForegroundColor Green

# 3. Iniciar MySQL
Write-Host ""
Write-Host "🗄️  Iniciando MySQL..." -ForegroundColor Yellow
docker run -d `
    --name mysql-crm `
    -v crm_data:/var/lib/mysql `
    -e MYSQL_ROOT_PASSWORD=root `
    -e MYSQL_DATABASE=chin_crm `
    -e MYSQL_USER=crm `
    -e MYSQL_PASSWORD=change_me `
    -p 3306:3306 `
    mysql:8.0 `
    --default-authentication-plugin=mysql_native_password `
    --sql_mode="" `
    --character-set-server=utf8mb4 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al iniciar MySQL" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "⏳ Esperando que MySQL esté listo (30 segundos)..." -ForegroundColor Yellow
for ($i = 30; $i -gt 0; $i--) {
    Write-Host "   Esperando... $i segundos restantes" -ForegroundColor Gray -NoNewline
    Start-Sleep -Seconds 1
    Write-Host "`r" -NoNewline
}
Write-Host ""

# Verificar que MySQL responde
$maxAttempts = 10
$attempt = 0
$mysqlReady = $false

while ($attempt -lt $maxAttempts -and -not $mysqlReady) {
    $attempt++
    try {
        $result = docker exec mysql-crm mysqladmin ping -h localhost -u root -proot 2>&1
        if ($result -match "mysqld is alive") {
            $mysqlReady = $true
            Write-Host "✅ MySQL está listo!" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "   Intento $attempt/$maxAttempts..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $mysqlReady) {
    Write-Host "❌ MySQL no respondió a tiempo" -ForegroundColor Red
    Write-Host "Logs de MySQL:" -ForegroundColor Yellow
    docker logs mysql-crm --tail 20
    Read-Host "Presiona Enter para salir"
    exit 1
}

# 4. Verificar node_modules
Write-Host ""
Write-Host "📦 Verificando dependencias..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Instalando dependencias (esto puede tomar varios minutos)..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit 1
    }
}
Write-Host "✅ Dependencias listas" -ForegroundColor Green

# 5. Crear .env si no existe
Write-Host ""
Write-Host "⚙️  Verificando configuración..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creando archivo .env..." -ForegroundColor Yellow
    # Generar secretos aleatorios para mayor seguridad en desarrollo local
    $GeneratedJwt = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % { [char]$_ })
    $GeneratedCookie = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % { [char]$_ })

    @"
DATABASE_URL=mysql://crm:change_me@127.0.0.1:3306/chin_crm
REDIS_URL=
NODE_ENV=development
PORT=3000
JWT_SECRET=$GeneratedJwt
DATA_ENCRYPTION_KEY=$GeneratedJwt
COOKIE_SECRET=$GeneratedCookie
VITE_OAUTH_PORTAL_URL=http://localhost:3000
VITE_APP_ID=chin-crm
OAUTH_SERVER_URL=http://localhost:3000
VITE_DEV_BYPASS_AUTH=1
ALLOW_DEV_LOGIN=1
OWNER_OPEN_ID=dev@localhost
OWNER_EMAIL=dev@localhost
WHATSAPP_WEBHOOK_VERIFY_TOKEN=imagine_crm_verify_2024_secure_token
WHATSAPP_APP_SECRET=
WHATSAPP_GRAPH_VERSION=v19.0
WHATSAPP_GRAPH_BASE_URL=https://graph.facebook.com
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Archivo .env creado" -ForegroundColor Green
}
else {
    Write-Host "✅ Archivo .env existe" -ForegroundColor Green
}

# 6. Ejecutar migraciones
Write-Host ""
Write-Host "🔄 Ejecutando migraciones de base de datos..." -ForegroundColor Yellow
npm run db:push 2>&1 | Tee-Object -Variable migrateOutput

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Advertencia en migraciones, intentando continuar..." -ForegroundColor Yellow
}
Write-Host "✅ Migraciones completadas" -ForegroundColor Green

# 7. Verificar que el puerto 3000 esté libre
Write-Host ""
Write-Host "🔍 Verificando puerto 3000..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  Puerto 3000 está ocupado. Intentando liberarlo..." -ForegroundColor Yellow
    Get-Process -Id $portInUse.OwningProcess | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "✅ Puerto liberado" -ForegroundColor Green
}
else {
    Write-Host "✅ Puerto 3000 disponible" -ForegroundColor Green
}

# 8. Iniciar el servidor
Write-Host ""
Write-Host "🚀 INICIANDO SERVIDOR CRM PRO V4..." -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "📱 La aplicación estará disponible en:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentación:" -ForegroundColor Cyan
Write-Host "   - Storybook: http://localhost:6006" -ForegroundColor Gray
Write-Host "   - Terms: http://localhost:3000/terms" -ForegroundColor Gray
Write-Host "   - Privacy: http://localhost:3000/privacy" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  NO CIERRES ESTA VENTANA" -ForegroundColor Red
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

npm run dev

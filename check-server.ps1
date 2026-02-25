# Script de Diagnóstico del Servidor
Write-Host "🔍 DIAGNÓSTICO DEL SERVIDOR CRM PRO" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar si el servidor Node está corriendo
Write-Host "1. Verificando procesos Node..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   ✅ Encontrados $($nodeProcesses.Count) procesos Node" -ForegroundColor Green
    $nodeProcesses | ForEach-Object {
        Write-Host "      PID: $($_.Id) - Memoria: $([math]::Round($_.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ No hay procesos Node corriendo" -ForegroundColor Red
}

# 2. Verificar puerto 3000
Write-Host ""
Write-Host "2. Verificando puerto 3000..." -ForegroundColor Yellow
try {
    $tcpConnections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($tcpConnections) {
        Write-Host "   ✅ Puerto 3000 está en uso:" -ForegroundColor Green
        $tcpConnections | ForEach-Object {
            Write-Host "      Estado: $($_.State) - PID: $($_.OwningProcess)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ Puerto 3000 NO está en uso" -ForegroundColor Red
        Write-Host "      El servidor no está escuchando en este puerto" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  No se pudo verificar el puerto" -ForegroundColor Yellow
}

# 3. Verificar MySQL
Write-Host ""
Write-Host "3. Verificando MySQL..." -ForegroundColor Yellow
$mysqlContainer = docker ps | Select-String "mysql-crm"
if ($mysqlContainer) {
    Write-Host "   ✅ MySQL está corriendo" -ForegroundColor Green
    Write-Host "      $mysqlContainer" -ForegroundColor Gray
} else {
    Write-Host "   ❌ MySQL NO está corriendo" -ForegroundColor Red
}

# 4. Verificar últimas líneas del log (si existe)
Write-Host ""
Write-Host "4. Verificando logs recientes..." -ForegroundColor Yellow
$logPath = ".manus-logs/browserConsole.log"
if (Test-Path $logPath) {
    Write-Host "   Últimas 10 líneas del log:" -ForegroundColor Gray
    Get-Content $logPath -Tail 10 | ForEach-Object {
        Write-Host "      $_" -ForegroundColor DarkGray
    }
} else {
    Write-Host "   No hay archivo de log" -ForegroundColor Gray
}

# 5. Intentar conexión al servidor
Write-Host ""
Write-Host "5. Probando conexión al servidor..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Servidor responde! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ No se pudo conectar al servidor" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# 6. Verificar archivo .env
Write-Host ""
Write-Host "6. Verificando configuración (.env)..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "PORT=3000") {
        Write-Host "   ✅ Puerto 3000 configurado" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Puerto no está configurado como 3000" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Archivo .env no encontrado" -ForegroundColor Red
}

# Resumen
Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
if ($nodeProcesses -and $tcpConnections) {
    Write-Host "✅ EL SERVIDOR ESTÁ CORRIENDO" -ForegroundColor Green
    Write-Host "   Accede a: http://localhost:3000" -ForegroundColor White
} else {
    Write-Host "❌ EL SERVIDOR NO ESTÁ CORRIENDO" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para iniciar el servidor:" -ForegroundColor Yellow
    Write-Host "   npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "O usa el script automático:" -ForegroundColor Yellow
    Write-Host "   .\QUICK-START.bat" -ForegroundColor Cyan
}
Write-Host "===================================" -ForegroundColor Cyan

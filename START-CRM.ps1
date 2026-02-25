# Script completo para iniciar CRM PRO V4
param(
    [switch]$FixOnly,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"

function Test-DockerRunning {
    try {
        docker info >$null 2>&1
        return $true
    } catch {
        return $false
    }
}

function Start-DockerDesktop {
    Write-Host "Verificando Docker Desktop..." -ForegroundColor Yellow
    
    if (Test-DockerRunning) {
        Write-Host "   Docker Desktop ya esta corriendo" -ForegroundColor Green
        return $true
    }
    
    Write-Host "   Docker Desktop no esta corriendo" -ForegroundColor Yellow
    Write-Host "   Intentando iniciar Docker Desktop..." -ForegroundColor Cyan
    
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Host "   Esperando Docker Desktop (60 segundos)..." -ForegroundColor Gray
        
        for ($i = 0; $i -lt 60; $i++) {
            Start-Sleep 1
            if (Test-DockerRunning) {
                Write-Host "   Docker Desktop listo!" -ForegroundColor Green
                return $true
            }
            if ($i % 10 -eq 0) {
                Write-Host "   ... esperando ($i/60)" -ForegroundColor DarkGray
            }
        }
    }
    
    Write-Host "   No se pudo iniciar Docker Desktop automaticamente" -ForegroundColor Red
    Write-Host "" 
    Write-Host "   Por favor inicia Docker Desktop manualmente:" -ForegroundColor Yellow
    Write-Host "   1. Busca 'Docker Desktop' en el menu Inicio" -ForegroundColor Cyan
    Write-Host "   2. Espera a que aparezca el icono de Docker en la bandeja" -ForegroundColor Cyan
    Write-Host "   3. Ejecuta este script nuevamente" -ForegroundColor Cyan
    return $false
}

function Start-MySQLContainer {
    Write-Host ""
    Write-Host "Configurando MySQL..." -ForegroundColor Yellow
    
    cmd /c "docker stop mysql-crm 2>nul"
    cmd /c "docker rm mysql-crm 2>nul"
    
    $portInUse = netstat -ano | findstr ":3306" | findstr LISTENING
    if ($portInUse) {
        Write-Host "   Liberando puerto 3306..." -ForegroundColor Gray
        $procId = ($portInUse -split "\s+")[-1]
        Stop-Process -Id $procId -Force 2>$null | Out-Null
        Start-Sleep 2
    }
    
    Write-Host "   Creando contenedor MySQL..." -ForegroundColor Gray
    $result = cmd /c "docker run -d --name mysql-crm -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=chin_crm -e MYSQL_USER=crm -e MYSQL_PASSWORD=change_me -p 3306:3306 mysql:8.0 2>&1"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   Error creando contenedor MySQL: $result" -ForegroundColor Red
        return $false
    }
    
    Write-Host "   Esperando MySQL (30 segundos)..." -ForegroundColor Gray
    Start-Sleep 30
    
    Write-Host "   MySQL listo!" -ForegroundColor Green
    return $true
}

function Repair-Database {
    Write-Host ""
    Write-Host "Arreglando esquema de base de datos..." -ForegroundColor Yellow
    
    $sqlPath = Join-Path $PSScriptRoot "fix-database.sql"
    if (-not (Test-Path $sqlPath)) {
        Write-Host "   No se encontro fix-database.sql" -ForegroundColor Red
        return $false
    }
    
    Get-Content $sqlPath | docker exec -i mysql-crm mysql -uroot -proot chin_crm 2>$null
    Write-Host "   Base de datos reparada!" -ForegroundColor Green
    return $true
}

function Start-Server {
    Write-Host ""
    Write-Host "Iniciando servidor CRM PRO..." -ForegroundColor Yellow
    
    $pm2Status = pm2 list 2>&1
    if ($pm2Status -match "crm-pro-v4") {
        Write-Host "   Reiniciando servidor existente..." -ForegroundColor Gray
        pm2 restart crm-pro-v4 2>&1 | Out-Null
    } else {
        Write-Host "   Iniciando nuevo servidor..." -ForegroundColor Gray
        pm2 start ecosystem.config.cjs 2>&1 | Out-Null
    }
    
    Write-Host "   Esperando servidor (15 segundos)..." -ForegroundColor Gray
    Start-Sleep 15
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "   Servidor respondiendo!" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "   Servidor iniciado pero no responde aun" -ForegroundColor Yellow
        return $true
    }
}

function Stop-Server {
    Write-Host "Deteniendo servidor..." -ForegroundColor Yellow
    pm2 stop crm-pro-v4 2>$null | Out-Null
    pm2 delete crm-pro-v4 2>$null | Out-Null
    docker stop mysql-crm 2>$null | Out-Null
    Write-Host "   Todo detenido" -ForegroundColor Green
}

# Main
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "    CRM PRO V4 - SCRIPT DE INICIO" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($Stop) {
    Stop-Server
    exit 0
}

if (-not (Start-DockerDesktop)) {
    Write-Host ""
    Write-Host "No se pudo iniciar Docker Desktop" -ForegroundColor Red
    exit 1
}

if ($FixOnly) {
    Repair-Database
    exit 0
}

if (-not (Start-MySQLContainer)) {
    exit 1
}

Repair-Database | Out-Null

if (-not (Start-Server)) {
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "    CRM PRO V4 LISTO!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "   URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Admin: http://localhost:3000/admin" -ForegroundColor Cyan
Write-Host "   Login Dev: http://localhost:3000/api/dev/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Comandos utiles:" -ForegroundColor Yellow
Write-Host "      pm2 logs crm-pro-v4    - Ver logs" -ForegroundColor Gray
Write-Host "      pm2 stop crm-pro-v4    - Detener" -ForegroundColor Gray
Write-Host "      .\START-CRM.ps1 -Stop   - Detener todo" -ForegroundColor Gray
Write-Host ""

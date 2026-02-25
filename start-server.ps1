# Script para iniciar servidor CRM PRO de forma persistente
param(
    [switch]$Stop
)

$LOG_FILE = "server.log"
$PID_FILE = "server.pid"

function Stop-Server {
    if (Test-Path $PID_FILE) {
        $pid = Get-Content $PID_FILE
        Write-Host "🛑 Deteniendo servidor (PID: $pid)..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Servidor detenido" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No hay servidor corriendo" -ForegroundColor Yellow
    }
}

function Start-Server {
    # Verificar si ya está corriendo
    if (Test-Path $PID_FILE) {
        $oldPid = Get-Content $PID_FILE
        $proc = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "✅ El servidor ya está corriendo (PID: $oldPid)" -ForegroundColor Green
            Write-Host "   Accede a: http://localhost:3000" -ForegroundColor Cyan
            return
        }
    }

    # Limpiar logs anteriores
    if (Test-Path $LOG_FILE) {
        Remove-Item $LOG_FILE -Force
    }

    Write-Host "🚀 Iniciando servidor CRM PRO..." -ForegroundColor Cyan
    Write-Host "   - MySQL: Verificando..." -ForegroundColor Gray

    # Verificar MySQL
    $mysql = docker ps | Select-String "mysql-crm"
    if (-not $mysql) {
        Write-Host "   - MySQL: Iniciando contenedor..." -ForegroundColor Yellow
        docker start mysql-crm 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   - MySQL: Creando contenedor nuevo..." -ForegroundColor Yellow
            docker run -d --name mysql-crm -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=chin_crm -e MYSQL_USER=crm -e MYSQL_PASSWORD=change_me -p 3306:3306 mysql:8.0
        }
        Write-Host "   - MySQL: Esperando 20 segundos..." -ForegroundColor Gray
        Start-Sleep 20
    } else {
        Write-Host "   - MySQL: ✅ Ya está corriendo" -ForegroundColor Green
    }

    Write-Host "   - Node: Iniciando servidor..." -ForegroundColor Gray

    # Iniciar servidor con nohup equivalente en Windows
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "npm"
    $psi.Arguments = "run dev"
    $psi.WorkingDirectory = Get-Location
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi

    # Manejadores de salida
    $outHandler = {
        $data = $Event.SourceEventArgs.Data
        if ($data) { Add-Content -Path $LOG_FILE -Value $data }
    }
    $errHandler = {
        $data = $Event.SourceEventArgs.Data
        if ($data) { Add-Content -Path $LOG_FILE -Value "[ERR] $data" }
    }

    Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action $outHandler | Out-Null
    Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action $errHandler | Out-Null

    $process.Start() | Out-Null
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()

    # Guardar PID
    $process.Id | Out-File $PID_FILE

    Write-Host "   - Node: PID $($process.Id)" -ForegroundColor Gray
    Write-Host "   - Esperando inicialización (15s)..." -ForegroundColor Gray

    Start-Sleep 15

    # Verificar que está respondiendo
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "" -ForegroundColor Green
        Write-Host "✅ SERVIDOR LISTO!" -ForegroundColor Green
        Write-Host "   URL: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "   PID: $($process.Id)" -ForegroundColor Gray
        Write-Host "   Logs: server.log" -ForegroundColor Gray
        Write-Host "" -ForegroundColor Green
        Write-Host "Comandos útiles:" -ForegroundColor Yellow
        Write-Host "  Ver logs: Get-Content server.log -Tail 20 -Wait" -ForegroundColor Cyan
        Write-Host "  Detener: .\start-server.ps1 -Stop" -ForegroundColor Cyan
    } catch {
        Write-Host "⚠️  El servidor inició pero no responde aún. Espera unos segundos más..." -ForegroundColor Yellow
        Write-Host "   Revisa los logs: Get-Content server.log -Tail 20" -ForegroundColor Cyan
    }
}

# Main
if ($Stop) {
    Stop-Server
} else {
    Start-Server
}

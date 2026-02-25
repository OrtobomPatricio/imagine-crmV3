# Script de Verificación de Instalación
Write-Host "🔍 VERIFICACIÓN DE INSTALACIÓN CRM PRO V4" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

# 1. Verificar Docker
Write-Host "1. Verificando Docker..." -NoNewline
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅ OK" -ForegroundColor Green
    } else {
        Write-Host " ❌ FAIL" -ForegroundColor Red
        Write-Host "   → Docker no está corriendo. Inicia Docker Desktop." -ForegroundColor Yellow
        $allOk = $false
    }
} catch {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    Write-Host "   → Docker no está instalado" -ForegroundColor Yellow
    $allOk = $false
}

# 2. Verificar Node.js
Write-Host "2. Verificando Node.js..." -NoNewline
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion -match "v20\.|v21\.|v22\.") {
        Write-Host " ✅ OK ($nodeVersion)" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  WARNING ($nodeVersion)" -ForegroundColor Yellow
        Write-Host "   → Se recomienda Node.js v20+" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    Write-Host "   → Node.js no está instalado" -ForegroundColor Yellow
    $allOk = $false
}

# 3. Verificar pnpm
Write-Host "3. Verificando pnpm..." -NoNewline
try {
    $pnpmVersion = pnpm --version 2>$null
    Write-Host " ✅ OK ($pnpmVersion)" -ForegroundColor Green
} catch {
    Write-Host " ⚠️  WARNING" -ForegroundColor Yellow
    Write-Host "   → pnpm no instalado. Instalando..." -ForegroundColor Yellow
    npm install -g pnpm
}

# 4. Verificar MySQL
Write-Host "4. Verificando MySQL..." -NoNewline
$mysqlContainer = docker ps | Select-String "mysql-crm"
if ($mysqlContainer) {
    Write-Host " ✅ OK (corriendo)" -ForegroundColor Green
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    Write-Host "   → MySQL no está corriendo" -ForegroundColor Yellow
    $allOk = $false
}

# 5. Verificar archivos del proyecto
Write-Host "5. Verificando archivos del proyecto..." -NoNewline
$requiredFiles = @("package.json", ".env", "vite.config.ts")
$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}
if ($missingFiles.Count -eq 0) {
    Write-Host " ✅ OK" -ForegroundColor Green
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    Write-Host "   → Faltan archivos: $($missingFiles -join ', ')" -ForegroundColor Yellow
    $allOk = $false
}

# 6. Verificar node_modules
Write-Host "6. Verificando dependencias..." -NoNewline
if (Test-Path "node_modules") {
    Write-Host " ✅ OK" -ForegroundColor Green
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    Write-Host "   → Ejecuta: pnpm install" -ForegroundColor Yellow
    $allOk = $false
}

# 7. Verificar TypeScript
Write-Host "7. Verificando TypeScript..." -NoNewline
try {
    $tscOutput = npm run check 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅ OK" -ForegroundColor Green
    } else {
        Write-Host " ❌ FAIL" -ForegroundColor Red
        Write-Host "   → Hay errores de TypeScript" -ForegroundColor Yellow
        $allOk = $false
    }
} catch {
    Write-Host " ⚠️  WARNING" -ForegroundColor Yellow
}

# Resumen
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allOk) {
    Write-Host "✅ TODO ESTÁ CONFIGURADO CORRECTAMENTE" -ForegroundColor Green
    Write-Host ""
    Write-Host "Puedes iniciar el servidor con:" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "O usa el script automático:" -ForegroundColor White
    Write-Host "   .\QUICK-START.bat" -ForegroundColor Cyan
} else {
    Write-Host "❌ HAY PROBLEMAS QUE CORREGIR" -ForegroundColor Red
    Write-Host ""
    Write-Host "Ejecuta el script de corrección:" -ForegroundColor White
    Write-Host "   .\fix-and-start.ps1" -ForegroundColor Cyan
}
Write-Host "========================================" -ForegroundColor Cyan

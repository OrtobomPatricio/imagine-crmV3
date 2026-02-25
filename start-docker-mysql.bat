@echo off
echo ==========================================
echo    INICIANDO DOCKER Y MYSQL
echo ==========================================
echo.

REM Verificar si Docker Desktop está corriendo
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker Desktop no esta corriendo. Iniciando...
    start "Docker Desktop" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Esperando Docker Desktop (60 segundos)...
    timeout /t 60 /nobreak >nul
)

REM Verificar de nuevo
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: No se pudo iniciar Docker Desktop
    pause
    exit /b 1
)

echo Docker Desktop OK
echo.

REM Detener y eliminar contenedor anterior si existe
docker stop mysql-crm 2>nul
docker rm mysql-crm 2>nul

REM Crear nuevo contenedor MySQL
echo Creando contenedor MySQL...
docker run -d --name mysql-crm -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=chin_crm -e MYSQL_USER=crm -e MYSQL_PASSWORD=change_me -p 3306:3306 mysql:8.0

echo Esperando MySQL (30 segundos)...
timeout /t 30 /nobreak >nul

echo.
echo MySQL listo!
echo Host: localhost:3306
echo Database: chin_crm
echo User: crm / change_me
echo.
pause

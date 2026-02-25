@echo off
chcp 65001 >nul
echo ==========================================
echo    CRM PRO V4 - INICIO AUTOMATICO
echo ==========================================
echo.

REM Verificar Docker
echo [1/4] Verificando Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
    echo         Docker Desktop no esta corriendo.
    echo         Por favor inicia Docker Desktop manualmente:
    echo         1. Presiona Win y busca "Docker Desktop"
    echo         2. Haz clic y espera a que cargue completamente
    echo         3. Vuelve a ejecutar este script
    pause
    exit /b 1
)
echo         Docker Desktop OK
echo.

REM Configurar MySQL
echo [2/4] Configurando MySQL...
docker stop mysql-crm >nul 2>&1
docker rm mysql-crm >nul 2>&1

docker run -d --name mysql-crm -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=chin_crm -e MYSQL_USER=crm -e MYSQL_PASSWORD=change_me -p 3306:3306 mysql:8.0 >nul 2>&1
if errorlevel 1 (
    echo         Error creando MySQL
    pause
    exit /b 1
)
echo         MySQL contenedor creado
echo         Esperando 30 segundos para inicializar...
timeout /t 30 /nobreak >nul
echo         MySQL listo
echo.

REM Reparar base de datos
echo [3/4] Configurando base de datos...
docker exec -i mysql-crm mysql -uroot -proot chin_crm < fix-database.sql 2>nul
echo         Base de datos configurada
echo.

REM Iniciar servidor
echo [4/4] Iniciando servidor...
pm2 delete crm-pro-v4 >nul 2>&1
pm2 start ecosystem.config.cjs >nul 2>&1
echo         Servidor iniciado
echo         Esperando 10 segundos...
timeout /t 10 /nobreak >nul
echo.

echo ==========================================
echo    CRM PRO V4 LISTO!
echo ==========================================
echo.
echo    URL: http://localhost:3000
echo    Login Dev: http://localhost:3000/api/dev/login
echo.
echo    Comandos utiles:
echo       pm2 logs crm-pro-v4    - Ver logs
echo       pm2 stop crm-pro-v4    - Detener servidor
echo       docker stop mysql-crm  - Detener MySQL
echo.
pause

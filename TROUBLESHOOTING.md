# 🔧 Solución de Problemas - CRM PRO V4

## Error: "No se puede acceder a este sitio" / ERR_CONNECTION_REFUSED

Este error significa que el servidor no está corriendo. Sigue estos pasos:

### Solución Rápida (Windows)

1. **Abre PowerShell como Administrador**
   - Busca "PowerShell" en el menú inicio
   - Click derecho → "Ejecutar como administrador"

2. **Navega al proyecto**
   ```powershell
   cd "C:\Users\Hp\Desktop\CRM PRO V4 - copia\crmpro_extract"
   ```

3. **Ejecuta el script de inicio**
   ```powershell
   .\fix-and-start.ps1
   ```

   O si prefieres el script simple:
   ```powershell
   .\QUICK-START.bat
   ```

4. **Espera** a que aparezca:
   ```
   🚀 INICIANDO SERVIDOR CRM PRO V4...
   ```

5. **Abre tu navegador** en: http://localhost:3000

---

## Verificación Paso a Paso

### 1. ¿Está Docker corriendo?

Abre una terminal y ejecuta:
```bash
docker info
```

Si ves error, **inicia Docker Desktop** desde el menú inicio.

### 2. ¿Está MySQL corriendo?

```bash
docker ps | findstr mysql
```

Debería mostrar `mysql-crm`. Si no aparece:
```bash
docker run -d --name mysql-crm -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=chin_crm -e MYSQL_USER=crm -e MYSQL_PASSWORD=change_me -p 3306:3306 mysql:8.0 --default-authentication-plugin=mysql_native_password
```

### 3. ¿Está el servidor Node corriendo?

Abre el Administrador de Tareas → Pestaña "Detalles" → Busca `node.exe`

Si no aparece, inicia el servidor:
```bash
npm run dev
```

---

## Errores Comunes

### "Puerto 3000 ya está en uso"

**Solución:**
```powershell
# Ver qué proceso usa el puerto
netstat -ano | findstr :3000

# Matar el proceso (reemplaza #### con el PID)
taskkill /PID #### /F
```

### "Database connection failed"

**Solución:**
```bash
# Reiniciar MySQL
docker restart mysql-crm

# Verificar logs
docker logs mysql-crm
```

### "Cannot find module"

**Solución:**
```bash
pnpm install
```

### TypeScript errors

**Solución:**
```bash
npm run check
```

---

## Comandos Útiles

```powershell
# Ver logs de MySQL
docker logs mysql-crm --tail 50

# Reiniciar todo
docker stop mysql-crm
docker rm mysql-crm
.\QUICK-START.bat

# Verificar si el puerto está libre
netstat -ano | findstr :3000

# Matar todos los procesos node
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## Si Nada Funciona

1. **Reinicia Docker Desktop**
2. **Reinicia tu computadora**
3. **Elimina el contenedor y vuelve a crearlo:**
   ```powershell
   docker stop mysql-crm
   docker rm mysql-crm
   docker run -d --name mysql-crm -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=chin_crm -e MYSQL_USER=crm -e MYSQL_PASSWORD=change_me -p 3306:3306 mysql:8.0
   ```
4. **Vuelve a ejecutar** `.\QUICK-START.bat`

---

## Contacto

Si el problema persiste, revisa:
- Logs completos: `docker logs mysql-crm`
- Errores de build: `npm run check`
- Estado de contenedores: `docker ps -a`

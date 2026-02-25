# 🚀 INICIAR CRM PRO V4

## ⚠️ IMPORTANTE: Error "No se puede acceder"

Si ves este error en el navegador:
```
No se puede acceder a este sitio web
ERR_CONNECTION_REFUSED
```

**Esto es NORMAL** - Significa que el servidor aún no está corriendo.

---

## 🎯 Solución Rápida (3 Pasos)

### Paso 1: Abrir PowerShell como Administrador
1. Presiona `Win + X`
2. Selecciona **"Windows PowerShell (Admin)"** o **"Terminal (Admin)"**

### Paso 2: Navegar al Proyecto
```powershell
cd "C:\Users\Hp\Desktop\CRM PRO V4 - copia\crmpro_extract"
```

### Paso 3: Ejecutar Script de Inicio
```powershell
.\QUICK-START.bat
```

**O si prefieres más control:**
```powershell
.\fix-and-start.ps1
```

---

## ⏳ ¿Qué Hace el Script?

1. ✅ Verifica Docker está corriendo
2. ✅ Inicia MySQL en un contenedor
3. ✅ Espera 30 segundos a que MySQL esté listo
4. ✅ Crea archivo de configuración (.env)
5. ✅ Instala dependencias (si es necesario)
6. ✅ Configura la base de datos
7. ✅ Inicia el servidor

---

## 🌐 Acceder a la Aplicación

**Una vez que veas esto en la consola:**
```
🚀 INICIANDO SERVIDOR CRM PRO V4...
```

**Abre tu navegador en:**
- http://localhost:3000

---

## 🧪 Verificar que Todo Funciona

### Comando de verificación:
```powershell
.\verify-setup.ps1
```

Esto te dirá si todo está correctamente configurado.

---

## 📁 Archivos de Ayuda

| Archivo | Uso |
|---------|-----|
| `QUICK-START.bat` | Inicio rápido automático |
| `fix-and-start.ps1` | Inicio con diagnóstico completo |
| `verify-setup.ps1` | Verificar instalación |
| `TROUBLESHOOTING.md` | Solución de problemas |
| `SETUP.md` | Guía completa de configuración |

---

## ❌ Si hay Errores

### Error: "Docker no está corriendo"
**Solución:** Inicia Docker Desktop desde el menú inicio

### Error: "Puerto 3000 en uso"
**Solución:** 
```powershell
netstat -ano | findstr :3000
taskkill /PID [numero] /F
```

### Error: "Cannot find module"
**Solución:**
```powershell
pnpm install
```

### Más errores
Ver archivo: `TROUBLESHOOTING.md`

---

## ✅ Checklist de Inicio

- [ ] Docker Desktop está corriendo (icono en la bandeja)
- [ ] Estás en la carpeta `crmpro_extract`
- [ ] Ejecutaste `.\QUICK-START.bat`
- [ ] Esperaste a que aparezca "INICIANDO SERVIDOR"
- [ ] Abriste http://localhost:3000 en el navegador

---

## 📞 URLs del Sistema

| URL | Descripción |
|-----|-------------|
| http://localhost:3000 | Aplicación principal |
| http://localhost:3000/landing | Landing page |
| http://localhost:3000/pricing | Precios |
| http://localhost:3000/terms | Términos de servicio |
| http://localhost:3000/privacy | Política de privacidad |
| http://localhost:3000/onboarding | Wizard de inicio |
| http://localhost:6006 | Storybook (componentes) |

---

## 🛑 Para Detener

Presiona `Ctrl + C` en la ventana de PowerShell

Luego para detener MySQL:
```powershell
docker stop mysql-crm
```

---

**¿Problemas?** Revisa `TROUBLESHOOTING.md` o ejecuta `.\verify-setup.ps1`

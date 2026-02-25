#!/bin/bash

set -e

echo "🚀 CRM PRO V4 - Inicio de Desarrollo"
echo "====================================="

# Verificar si existe .env
if [ ! -f .env ]; then
    echo "⚠️  Archivo .env no encontrado"
    echo "📝 Creando .env desde .env.example..."
    cp .env.example .env
    echo "✅ .env creado. Por favor revisa la configuración."
fi

# Iniciar MySQL con Docker si no está corriendo
echo "🔍 Verificando MySQL..."
if ! docker ps | grep -q mysql-crm; then
    echo "🐳 Iniciando MySQL con Docker..."
    docker run -d --name mysql-crm \
        -e MYSQL_ROOT_PASSWORD=root \
        -e MYSQL_DATABASE=chin_crm \
        -e MYSQL_USER=crm \
        -e MYSQL_PASSWORD=change_me \
        -p 3306:3306 \
        mysql:8.0 --default-authentication-plugin=mysql_native_password 2>/dev/null || true
    
    echo "⏳ Esperando a que MySQL esté listo..."
    sleep 10
    echo "✅ MySQL iniciado"
else
    echo "✅ MySQL ya está corriendo"
fi

# Verificar dependencias
if [ ! -d node_modules ]; then
    echo "📦 Instalando dependencias..."
    pnpm install
fi

# Ejecutar migraciones
echo "🔄 Ejecutando migraciones..."
npm run db:push

# Iniciar servidor de desarrollo
echo "🚀 Iniciando servidor de desarrollo..."
npm run dev

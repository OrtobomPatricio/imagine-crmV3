#!/bin/bash
set -e

echo "🚀 Iniciando instalación LIMPIA del CRM desde GitHub..."

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker instalado."
else
    echo "✅ Docker ya instalado."
fi

# 2. Limpiar instalación anterior
if [ -d "/opt/imagine-crm" ]; then
    echo "🧹 Limpiando instalación anterior..."
    cd /opt/imagine-crm
    docker compose down -v 2>/dev/null || true
    cd /opt
    rm -rf imagine-crm
    echo "✅ Limpieza completada."
fi

# 3. Clonar repo desde GitHub
echo "📥 Clonando repositorio desde GitHub..."
cd /opt
git clone https://github.com/OrtobomPatricio/imagine-crmV3.git imagine-crm
cd imagine-crm

# Verificar que estamos en el commit correcto
echo "📌 Commit actual: $(git log -1 --oneline)"

# 4. Configurar .env
current_ip=$(curl -s ifconfig.me || echo "168.231.98.244")

# URLs
if [ -n "$1" ]; then
    USER_URL="$1"
else
    USER_URL="https://${current_ip}.nip.io"
fi

echo "🌍 Usando URL: ${USER_URL}"

# Generar secretos
JWT_SEC=$(openssl rand -hex 32)
ENC_KEY=$(openssl rand -hex 32)
DB_PASS=$(openssl rand -hex 16)

# OAuth (opcionales)
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"
MICROSOFT_CLIENT_ID="${MICROSOFT_CLIENT_ID:-}"
MICROSOFT_CLIENT_SECRET="${MICROSOFT_CLIENT_SECRET:-}"

echo "📝 Generando .env..."
cat <<EOF > .env
# ==========================================
# CONFIGURACIÓN PRODUCCIÓN
# ==========================================
NODE_ENV=production
DATABASE_URL=mysql://crm:${DB_PASS}@mysql:3306/chin_crm
JWT_SECRET=${JWT_SEC}
DATA_ENCRYPTION_KEY=${ENC_KEY}
OWNER_OPEN_ID=admin-temporal
ALLOW_DEV_LOGIN=0
VITE_DEV_BYPASS_AUTH=0
RUN_MIGRATIONS=1

# --- URLS ---
CLIENT_URL=${USER_URL}
VITE_API_URL=${USER_URL}/api
VITE_OAUTH_PORTAL_URL=${USER_URL}
OAUTH_SERVER_URL=${USER_URL}

# --- DB ---
DB_USER=crm
DB_PASS=${DB_PASS}
DB_NAME=chin_crm
MYSQL_ROOT_PASSWORD=${DB_PASS}
MYSQL_USER=crm
MYSQL_PASSWORD=${DB_PASS}

# --- OAUTH (Opcional) ---
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
MICROSOFT_CLIENT_ID=${MICROSOFT_CLIENT_ID}
MICROSOFT_CLIENT_SECRET=${MICROSOFT_CLIENT_SECRET}
EOF

echo "✅ .env configurado"

# 5. Build y Deploy
echo "🏗️  Construyendo aplicación..."
docker compose down --remove-orphans || true
docker compose build --no-cache
docker compose up -d

echo "⏳ Esperando inicialización (15s)..."
sleep 15

# 6. Verificar servicios
echo "📊 Estado de servicios:"
docker compose ps

# 7. Verificar migraciones WhatsApp
echo "🔍 Verificando fixes de WhatsApp..."
DB_PASS_VAL=$(grep DB_PASS .env | cut -d '=' -f2)

# Verificar que las columnas de WhatsApp existen en leads
COLS_CHECK=$(docker compose exec -T mysql mysql -u crm -p${DB_PASS_VAL} -D chin_crm -e "
SHOW COLUMNS FROM leads LIKE 'whatsappConnectionType';
SHOW COLUMNS FROM leads LIKE 'externalChatId';
" 2>/dev/null)

if echo "$COLS_CHECK" | grep -q "whatsappConnectionType"; then
    echo "✅ Campo whatsappConnectionType presente en tabla leads"
else
    echo "⚠️  Campo whatsappConnectionType NO encontrado - aplicando fix..."
    docker compose exec -T mysql mysql -u crm -p${DB_PASS_VAL} -D chin_crm -e "
    ALTER TABLE leads 
    ADD COLUMN whatsappConnectionType enum('api','qr') DEFAULT 'api',
    ADD COLUMN externalChatId varchar(100);
    CREATE INDEX idx_leads_external_chat ON leads(externalChatId);
    " 2>/dev/null
    echo "✅ Fix aplicado"
fi

# 8. Mostrar logs
echo "---------------------------------------------------"
echo "✅ ¡Instalación completada!"
echo "📡 URL: ${USER_URL}"
echo "📱 Chat: ${USER_URL}/chat"
echo "---------------------------------------------------"
echo "📝 Ver logs: docker compose logs -f app"
echo ""
echo "🎉 Todos los fixes de WhatsApp incluidos:"
echo "   - DB schema actualizado (migration 0035)"
echo "   - React Hooks fix (ChatList.tsx)"
echo "   - useInfiniteQuery fix (ChatThread.tsx)"
echo "---------------------------------------------------"

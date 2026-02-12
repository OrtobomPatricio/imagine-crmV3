#!/bin/bash
set -e

echo "🚀 Iniciando configuración del VPS para CRM PRO..."

# 1. Install Docker & Compose if missing
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker instalado."
else
    echo "✅ Docker ya estaba instalado."
fi

# 2. Check Repo
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: No se encuentra docker-compose.yml."
    echo "➡️  Asegúrate de estar DENTRO de la carpeta del proyecto (cd crm-pro)."
    exit 1
fi

echo "🔄 Descargando últimos cambios..."
git pull origin main

# 3. Setup Environment & URL
current_ip=$(curl -s ifconfig.me || echo "localhost")
echo "🌍 Configuración de Dominio/URL"
echo "---------------------------------------------------"
echo "Si usas un dominio como 'nip.io' o HTTPS, ingrésalo completo."
echo "Ejemplos: 'https://mi-empresa.nip.io', 'http://${current_ip}:3000'"
read -p "👉 Ingresa la URL PÚBLICA de tu CRM [http://${current_ip}:3000]: " USER_URL
USER_URL=${USER_URL:-http://${current_ip}:3000}

# Remove trailing slash
USER_URL=${USER_URL%/}

echo "✅ Usando URL: ${USER_URL}"

if [ ! -f ".env" ]; then
    echo "⚙️  Archivo .env no encontrado. Generando nuevo..."
    
    JWT_SEC=$(openssl rand -hex 32)
    ENC_KEY=$(openssl rand -hex 32)
    DB_PASS=$(openssl rand -hex 16)
    
    cat <<EOF > .env
# ==========================================
# CONFIGURACIÓN PRODUCCIÓN (AUTO)
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
EOF

else
    echo "🔄 Actualizando .env existente con la nueva URL..."
    sed -i "s|CLIENT_URL=.*|CLIENT_URL=${USER_URL}|" .env
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=${USER_URL}/api|" .env
    sed -i "s|VITE_OAUTH_PORTAL_URL=.*|VITE_OAUTH_PORTAL_URL=${USER_URL}|" .env
    sed -i "s|OAUTH_SERVER_URL=.*|OAUTH_SERVER_URL=${USER_URL}|" .env
fi

# 4. Build and Run
echo "🏗️  Construyendo la aplicación..."
docker compose down --remove-orphans || true
docker compose build --no-cache
docker compose up -d

echo "⏳ Esperando a que la base de datos inicie (10s)..."
sleep 10

# 5. Force Fixes (Database)
echo "🔧 Ejecutando reparaciones de base de datos..."

# Run Standard Migration
docker compose exec app node dist/migrate.js || echo "⚠️ Migración estándar falló (continuando con plan B)..."

# Force Create Table (Plan B) just in case
# Extract DB Pass safely
DB_PASS_VAL=$(grep DB_PASS .env | cut -d '=' -f2)

docker compose exec mysql mysql -u crm -p${DB_PASS_VAL} -D chin_crm -e "
CREATE TABLE IF NOT EXISTS message_queue (
    id int AUTO_INCREMENT NOT NULL PRIMARY KEY,
    conversationId int NOT NULL,
    chatMessageId int,
    priority int NOT NULL DEFAULT 0,
    status enum('queued','processing','sent','failed') NOT NULL DEFAULT 'queued',
    attempts int NOT NULL DEFAULT 0,
    nextAttemptAt timestamp NOT NULL DEFAULT (now()),
    errorMessage text,
    createdAt timestamp NOT NULL DEFAULT (now()),
    updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (chatMessageId) REFERENCES chat_messages(id) ON DELETE CASCADE
);" 2>/dev/null

echo "---------------------------------------------------"
echo "✅ ¡Despliegue finalizado!"
echo "📡 Accede a tu CRM en: ${USER_URL}"
echo "---------------------------------------------------"
echo "📝 Si algo falla, revisa los logs con: docker compose logs -f"

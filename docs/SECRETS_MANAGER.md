# Migración a Secrets Manager

## Problema Actual
Los secretos de la aplicación (API keys, tokens, DB passwords) están almacenados en archivos `.env`, lo cual presenta riesgos:
- Pueden ser versionados accidentalmente en Git
- Están en texto plano en el disco del servidor
- No hay registro de accesos ni rotación automática

## Estrategia de Migración

### Opción 1: AWS Secrets Manager (Recomendado para AWS)

```bash
# Instalar SDK
npm install @aws-sdk/client-secrets-manager
```

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });

async function getSecret(secretName: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  return response.SecretString!;
}

// En startup:
const dbUrl = await getSecret("crm/production/DATABASE_URL");
const jwtSecret = await getSecret("crm/production/JWT_SECRET");
```

### Opción 2: HashiCorp Vault (Self-Hosted)

```bash
# Instalar CLI
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt install vault
```

```typescript
const VAULT_ADDR = process.env.VAULT_ADDR;
const VAULT_TOKEN = process.env.VAULT_TOKEN;

async function getVaultSecret(path: string): Promise<Record<string, string>> {
  const res = await fetch(`${VAULT_ADDR}/v1/secret/data/${path}`, {
    headers: { "X-Vault-Token": VAULT_TOKEN! },
  });
  const json = await res.json();
  return json.data.data;
}
```

### Opción 3: Docker Secrets (Para Docker Swarm)

```yaml
# docker-compose.yml
services:
  crm:
    secrets:
      - db_password
      - jwt_secret

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
```

```typescript
import fs from "node:fs";

function readDockerSecret(name: string): string {
  return fs.readFileSync(`/run/secrets/${name}`, "utf-8").trim();
}
```

## Secretos a Migrar

| Variable | Criticidad | Rotación |
|----------|-----------|----------|
| `DATABASE_URL` | 🔴 Crítica | Trimestral |
| `JWT_SECRET` | 🔴 Crítica | Semestral |
| `SESSION_SECRET` | 🔴 Crítica | Semestral |
| `PII_ENCRYPTION_KEY` | 🔴 Crítica | Anual (con re-encriptación) |
| `META_APP_SECRET` | 🟡 Alta | Anual |
| `GOOGLE_CLIENT_SECRET` | 🟡 Alta | Anual |
| `SMTP_PASS` | 🟡 Alta | Trimestral |
| `S3_SECRET_KEY` | 🟡 Alta | Trimestral |
| `REDIS_URL` | 🟡 Alta | Trimestral |
| `SENTRY_DSN` | 🟢 Baja | Nunca |

## Checklist de Implementación

1. [ ] Elegir proveedor (AWS SM / Vault / Docker Secrets)
2. [ ] Crear los secretos en el proveedor
3. [ ] Implementar helper de lectura de secretos en `server/services/secrets.ts`
4. [ ] Reemplazar `process.env.X` por `await getSecret("X")` en archivos críticos
5. [ ] Configurar rotación automática para DB y JWT
6. [ ] Habilitar audit trail del proveedor
7. [ ] Eliminar `.env` del servidor de producción

# Guía de Despliegue: IP Específica o Dominio Personalizado

Esta guía explica cómo desplegar la plataforma completa (Frontend Next.js 16 + Backend Laravel 12 + Gateway Nginx) bajo una dirección IP fija (ej. `172.15.30.25`) o un nombre de dominio privado (ej. `planeclone.local`), operando ambos componentes bajo el mismo origen y el mismo puerto unificado.

---

## 1. Arquitectura de Despliegue Unificado

Tanto el Frontend como la API se sirven a través del **Gateway Nginx** en el puerto `80` (o puerto configurado):
- **`/`** → Aplicación Frontend (Next.js 16 SSR + Client)
- **`/api/*`** → Endpoints REST de la API (Laravel 12)
- **`/sanctum/*`** → Autenticación y cookies CSRF
- **`/storage/*`** → Archivos y adjuntos subidos
- **`/docs`** → Documentación interactiva de la API

Dado que el frontend utiliza rutas relativas `same-origin` (`/api/v1`), las peticiones del navegador se dirigen automáticamente al mismo host por el que se ingresa, evitando errores de CORS o fallos por IPs hardcodeadas.

---

## 2. Despliegue Rápido mediante Script

Se incluye un script automatizado para preparar el archivo `.env` y validar la configuración:

```bash
# Para desplegar en la IP 172.15.30.25:
./deploy/deploy.sh 172.15.30.25

# Para desplegar en el dominio planeclone.local:
./deploy/deploy.sh planeclone.local

# Para usar un puerto diferente (ej. 8080):
./deploy/deploy.sh 172.15.30.25 8080
```

Una vez configurado, inicia los contenedores:
```bash
docker compose -f docker-compose-prod.yml up -d --build
```

Y ejecuta las migraciones iniciales de Laravel:
```bash
docker compose -f docker-compose-prod.yml exec api_prod php artisan migrate --force
docker compose -f docker-compose-prod.yml exec api_prod php artisan storage:link
```

---

## 3. Configuración Manual Paso a Paso

Si prefieres editar el archivo `.env` manualmente:

### A. Para la IP `172.15.30.25`:
En el archivo `.env`:
```ini
PROD_GATEWAY_PORT=80
APP_URL=http://172.15.30.25
FRONTEND_URL=http://172.15.30.25
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_REPORT_API_URL=
RUSTFS_URL=http://172.15.30.25:9300/sail
AWS_URL=http://172.15.30.25:9300/sail
```

### B. Para el Dominio `planeclone.local`:
En el archivo `.env`:
```ini
PROD_GATEWAY_PORT=80
APP_URL=http://planeclone.local
FRONTEND_URL=http://planeclone.local
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_REPORT_API_URL=
RUSTFS_URL=http://planeclone.local:9300/sail
AWS_URL=http://planeclone.local:9300/sail
```

---

## 4. Resolución de Dominio para `planeclone.local`

Para que los equipos de la red reconozcan el nombre `planeclone.local`:

### Opción 1: Servidor DNS Local (Recomendado para toda la oficina / red)
En el servidor DNS (Pi-hole, AdGuard Home, Windows Server DNS, router MikroTik/OpenWrt), agregar un registro tipo **A**:
```
planeclone.local.   IN  A   172.15.30.25
```

### Opción 2: Archivo `hosts` (Para pruebas individuales)
En cada equipo cliente:
- **Linux / macOS:** Editar `/etc/hosts`:
  ```
  172.15.30.25    planeclone.local
  ```
- **Windows:** Editar como Administrador `C:\Windows\System32\drivers\etc\hosts`:
  ```
  172.15.30.25    planeclone.local
  ```

---

## 5. Reglas de Firewall en el Servidor Host

Asegúrate de que los puertos requeridos estén abiertos en el firewall del sistema operativo (ej. UFW en Ubuntu/Debian):
```bash
# Puerto principal de acceso web y API
sudo ufw allow 80/tcp

# Puerto RustFS (solo si se descargan adjuntos de S3 directamente)
sudo ufw allow 9300/tcp
```

---

## 6. Verificación del Despliegue (Smoke Testing)

Una vez iniciado el servicio, verifica la conectividad:
```bash
# Verificar Frontend Next.js (debe responder HTTP 200)
curl -I http://172.15.30.25/

# Verificar Backend Laravel (debe responder HTTP 401 Unauthorized en JSON)
curl -I http://172.15.30.25/api/v1/auth/me

# Verificar Documentación interactiva (debe responder HTTP 200)
curl -I http://172.15.30.25/docs
```

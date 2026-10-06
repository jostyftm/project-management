# Guía de Despliegue Multi-Entorno: IP Específica o Dominio Personalizado

Esta guía explica cómo desplegar la plataforma completa (Frontend Next.js 16 + Backend Laravel + Gateway Nginx o Sail) bajo una dirección IP fija (ej. `172.15.30.25`), localhost o un nombre de dominio privado (ej. `planeclone.local`), en cualquiera de los entornos: **Producción (`prod`)**, **Desarrollo / QA (`dev`)** o **Local (`local`)**.

---

## 1. Arquitectura de Despliegue y Puerta de Entrada

### Entornos `prod` y `dev` (Nginx Gateway Unificado)
Tanto el Frontend como la API se sirven a través del contenedor **Gateway Nginx** en el puerto configurado (ej. `80`, `8080`, `9500`):
- **`/`** → Aplicación Frontend (Next.js 16 SSR + Client)
- **`/api/*`** → Endpoints REST de la API (Laravel)
- **`/sanctum/*`** → Autenticación y cookies CSRF
- **`/storage/*`** → Archivos y adjuntos subidos
- **`/docs`** → Documentación interactiva de la API

Dado que el frontend utiliza rutas relativas `same-origin` (`/api/v1`), las peticiones del navegador se dirigen automáticamente al mismo host por el que se ingresa, evitando errores de CORS o fallos por IPs hardcodeadas.

### Entorno `local` (Laravel Sail)
- El backend y los servicios corren en Docker vía Sail en el puerto asignado (`APP_PORT`, por defecto `8000`).
- El frontend corre nativamente en el host vía `pnpm dev` en `WEB_PORT` (por defecto `3000`), apuntando `NEXT_PUBLIC_API_URL` a la API local.

---

## 2. Despliegue Rápido mediante `deploy/deploy.sh`

El script [`deploy/deploy.sh`](deploy/deploy.sh) reescribe y sincroniza automáticamente los archivos `.env` respectivos y valida la composición de Docker Compose correspondiente.

### A. Modo Interactivo (Asistente en Terminal)
Simplemente ejecuta:
```bash
./deploy/deploy.sh
```
El asistente te preguntará:
1. **Entorno a desplegar:** `prod` (1), `dev` (2) o `local` (3).
2. **URL, IP o Dominio:** (ej. `172.15.30.25`, `planeclone.local`, `localhost`).
3. **Puerto de entrada:** (ej. `80` para Gateway Nginx o `8000` para Local).

---

### B. Modo No Interactivo / Automatizado

Puedes pasar los parámetros directamente en línea de comandos:

```bash
# 1. Producción (Docker Compose Prod + Nginx Gateway en puerto 80)
./deploy/deploy.sh prod 172.15.30.25 80

# 2. Producción con dominio personalizado y puerto alternativo
./deploy/deploy.sh prod planeclone.local 8080

# 3. Desarrollo / QA (Docker Compose Dev + Nginx Gateway en puerto 9500)
./deploy/deploy.sh dev 192.168.1.100 9500

# 4. Local (Laravel Sail en puerto 8000)
./deploy/deploy.sh local localhost 8000
```

> [!NOTE]
> **Retrocompatibilidad:** Si ejecutas `./deploy/deploy.sh 172.15.30.25 [puerto]`, el script asume automáticamente el entorno `prod`.

---

## 3. Iniciar Servicios según el Entorno

Al finalizar la ejecución, el script mostrará las instrucciones exactas:

### Para Producción (`prod`):
```bash
docker compose --env-file .env -f docker-compose-prod.yml up -d --build
docker compose -f docker-compose-prod.yml exec api_prod php artisan migrate --force
docker compose -f docker-compose-prod.yml exec api_prod php artisan storage:link
```

### Para Desarrollo / QA (`dev`):
```bash
docker compose --env-file .env.dev -f docker-compose-dev.yml up -d --build
docker compose -f docker-compose-dev.yml exec api_dev php artisan migrate --force
docker compose -f docker-compose-dev.yml exec api_dev php artisan storage:link
```

### Para Local (`local`):
```bash
docker compose --env-file .env -f docker-compose.yml up -d
./sail artisan migrate
./sail artisan storage:link
cd apps/web && pnpm dev
```

---

## 4. Resolución de Dominio para Red Local (ej. `planeclone.local`)

Para que los equipos de la red reconozcan el nombre `planeclone.local`:

### Opción 1: Servidor DNS Local (Recomendado para toda la red)
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
# Puerto principal de acceso web y API (ej. 80 o el puerto configurado)
sudo ufw allow 80/tcp

# Puerto RustFS (para descargas directas de adjuntos S3)
sudo ufw allow 9300/tcp
```

---

## 6. Verificación del Despliegue (Smoke Testing)

Una vez iniciado el servicio, verifica la conectividad:
```bash
# Verificar Frontend Next.js (debe responder HTTP 200)
curl -I http://172.15.30.25/

# Verificar Backend Laravel (debe responder JSON o HTTP 401 Unauthorized para rutas protegidas)
curl -I http://172.15.30.25/api/v1/auth/me

# Verificar Documentación interactiva (debe responder HTTP 200)
curl -I http://172.15.30.25/docs
```

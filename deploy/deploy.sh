#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue Multi-Entorno (Local, Dev, Prod)
# Configura variables de entorno para IP o Dominio personalizado y Puerto Gateway
# ==============================================================================
#
# Uso no interactivo:
#   ./deploy/deploy.sh <local|dev|prod> <IP_O_DOMINIO> [PUERTO]
#
# Uso retrocompatible (asume prod):
#   ./deploy/deploy.sh <IP_O_DOMINIO> [PUERTO]
#
# Uso interactivo:
#   ./deploy/deploy.sh
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ------------------------------------------------------------------------------
# 1. Funciones auxiliares
# ------------------------------------------------------------------------------

set_env_var() {
    local file="$1"
    local key="$2"
    local value="$3"
    
    if [ ! -f "$file" ]; then
        touch "$file"
    fi

    local escaped_value
    escaped_value=$(printf '%s\n' "$value" | sed -e 's/[\\|&]/\\&/g')

    if grep -q "^${key}=" "$file"; then
        sed -i "s|^${key}=.*|${key}=${escaped_value}|" "$file"
    else
        echo "${key}=${value}" >> "$file"
    fi
}

get_env_var() {
    local file="$1"
    local key="$2"
    local default_val="${3:-}"

    if [ -f "$file" ] && grep -q "^${key}=" "$file"; then
        grep "^${key}=" "$file" | head -n 1 | cut -d '=' -f2- | tr -d '\r"'
    else
        echo "$default_val"
    fi
}

ensure_app_key() {
    local file="$1"
    local current_key
    current_key=$(get_env_var "$file" "APP_KEY" "")
    current_key=$(echo "$current_key" | xargs)
    if [ -z "$current_key" ]; then
        local new_key
        new_key="base64:$(openssl rand -base64 32)"
        set_env_var "$file" "APP_KEY" "$new_key"
    fi
}

remove_env_var() {
    local file="$1"
    local key="$2"
    if [ -f "$file" ]; then
        sed -i "/^${key}=/d" "$file"
    fi
}

ensure_common_vars() {
    local file="$1"
    set_env_var "$file" "APP_LOCALE" "es"
    set_env_var "$file" "APP_FALLBACK_LOCALE" "en"
    set_env_var "$file" "APP_FAKER_LOCALE" "en_US"
    set_env_var "$file" "APP_TIMEZONE" "America/Bogota"
    set_env_var "$file" "APP_MAINTENANCE_DRIVER" "file"
    set_env_var "$file" "PHP_CLI_SERVER_WORKERS" "4"
    set_env_var "$file" "BCRYPT_ROUNDS" "12"
    set_env_var "$file" "LOG_CHANNEL" "stack"
    set_env_var "$file" "LOG_STACK" "single"
    set_env_var "$file" "LOG_DEPRECATIONS_CHANNEL" "null"
    set_env_var "$file" "SESSION_DRIVER" "file"
    set_env_var "$file" "SESSION_LIFETIME" "120"
    set_env_var "$file" "SESSION_ENCRYPT" "false"
    set_env_var "$file" "SESSION_PATH" "/"
    set_env_var "$file" "SESSION_DOMAIN" "null"
    set_env_var "$file" "MAIL_MAILER" "smtp"
    set_env_var "$file" "MAIL_PORT" "1025"
    set_env_var "$file" "MAIL_SCHEME" "null"
    set_env_var "$file" "MAIL_USERNAME" "null"
    set_env_var "$file" "MAIL_PASSWORD" "null"
    set_env_var "$file" "MAIL_FROM_ADDRESS" "hello@example.com"
    set_env_var "$file" "MAIL_FROM_NAME" "\${APP_NAME}"
    set_env_var "$file" "SDI_AUTH_SERVICE_URL" "http://sdi_auth-service"
    set_env_var "$file" "SDI_AUTH_APPLICATION_ID" "9"
    set_env_var "$file" "SDI_AUTH_USERS_ENDPOINT" "/api/v1/applications/{application_id}/users"
    set_env_var "$file" "AUTH_BYPASS" "false"
}

normalize_host() {
    local raw="$1"
    # Detect scheme if present
    if [[ "$raw" =~ ^https:// ]]; then
        DETECTED_SCHEME="https"
    else
        DETECTED_SCHEME="http"
    fi
    # Strip scheme and any trailing path
    local clean
    clean=$(echo "$raw" | sed -E 's|^https?://||' | sed -E 's|/.*$||')
    
    # Check if host contains an inline port (ej. 192.168.1.10:8080)
    if [[ "$clean" =~ :[0-9]+$ ]]; then
        DETECTED_PORT="${clean##*:}"
        clean="${clean%:*}"
    fi
    echo "$clean"
}

# ------------------------------------------------------------------------------
# 2. Parseo de argumentos o modo interactivo
# ------------------------------------------------------------------------------

ENV_TARGET=""
RAW_HOST=""
INPUT_PORT=""
DETECTED_SCHEME="http"
DETECTED_PORT=""

# Parsear argumentos si se pasaron
if [ "$#" -ge 1 ]; then
    case "$1" in
        local|dev|prod)
            ENV_TARGET="$1"
            RAW_HOST="${2:-}"
            INPUT_PORT="${3:-}"
            ;;
        *)
            # Retrocompatibilidad: el primer argumento es el host, asume entorno prod
            ENV_TARGET="prod"
            RAW_HOST="$1"
            INPUT_PORT="${2:-}"
            ;;
    esac
fi

# Asistente interactivo si falta el entorno
if [ -z "$ENV_TARGET" ]; then
    echo "======================================================================"
    echo " CONFIGURADOR DE DESPLIEGUE MULTI-ENTORNO"
    echo "======================================================================"
    echo " Selecciona el entorno a desplegar:"
    echo "   1) prod   (Producción - Docker Compose Prod con Nginx Gateway)"
    echo "   2) dev    (Desarrollo / QA - Docker Compose Dev con Nginx Gateway)"
    echo "   3) local  (Local - Laravel Sail)"
    echo "----------------------------------------------------------------------"
    read -r -p " Entorno [prod/dev/local] (default: prod): " user_env_choice
    case "${user_env_choice:-prod}" in
        1|prod|production) ENV_TARGET="prod" ;;
        2|dev|development) ENV_TARGET="dev" ;;
        3|local)           ENV_TARGET="local" ;;
        *)
            echo "Entorno no válido. Usando 'prod' por defecto."
            ENV_TARGET="prod"
            ;;
    esac
fi

# Asistente interactivo si falta el host
if [ -z "$RAW_HOST" ]; then
    echo ""
    read -r -p " Ingrese URL, IP o Dominio (ej: 172.15.30.25, localhost, planeclone.local): " RAW_HOST
fi

if [ -z "$RAW_HOST" ]; then
    echo "ERROR: Debes especificar una IP, URL o nombre de dominio." >&2
    exit 1
fi

TARGET_HOST=$(normalize_host "$RAW_HOST")

# Definir puerto por defecto según entorno
DEFAULT_PORT="80"
if [ "$ENV_TARGET" = "local" ]; then
    DEFAULT_PORT="8000"
fi

if [ -n "$DETECTED_PORT" ] && [ -z "$INPUT_PORT" ]; then
    INPUT_PORT="$DETECTED_PORT"
fi

# Asistente interactivo si falta el puerto y no vino por CLI
if [ -z "$INPUT_PORT" ]; then
    if [ "$ENV_TARGET" = "local" ]; then
        read -r -p " Ingrese el puerto de entrada para la API [$DEFAULT_PORT]: " user_port_choice
    else
        read -r -p " Ingrese el puerto de entrada para Nginx Gateway [$DEFAULT_PORT]: " user_port_choice
    fi
    INPUT_PORT="${user_port_choice:-$DEFAULT_PORT}"
fi

PORT="${INPUT_PORT:-$DEFAULT_PORT}"

# Validar que el puerto sea numérico y válido
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "ERROR: El puerto '$PORT' no es válido (debe ser entre 1 y 65535)." >&2
    exit 1
fi

SCHEME="$DETECTED_SCHEME"
if [ "$PORT" = "443" ]; then
    SCHEME="https"
fi

if { [ "$SCHEME" = "http" ] && [ "$PORT" = "80" ]; } || { [ "$SCHEME" = "https" ] && [ "$PORT" = "443" ]; }; then
    BASE_URL="${SCHEME}://${TARGET_HOST}"
else
    BASE_URL="${SCHEME}://${TARGET_HOST}:${PORT}"
fi

echo "======================================================================"
echo " RESUMEN DE PARÁMETROS"
echo " Entorno       : $ENV_TARGET"
echo " Host Objetivo : $TARGET_HOST"
echo " Puerto Entrada: $PORT"
echo " URL Base      : $BASE_URL"
echo "======================================================================"

# ------------------------------------------------------------------------------
# 3. Configuración por entorno
# ------------------------------------------------------------------------------

case "$ENV_TARGET" in
    prod)
        echo "[1/3] Preparando archivo de entorno de Producción (.env.prod)..."
        if [ ! -f ".env.prod" ]; then
            if [ -f ".env.example" ]; then
                cp .env.example .env.prod
            else
                touch .env.prod
            fi
        fi

        RUSTFS_PORT=$(get_env_var ".env.prod" "PROD_RUSTFS_PORT" "9300")
        RUSTFS_BUCKET=$(get_env_var ".env.prod" "RUSTFS_BUCKET" "sail")

        echo "[2/3] Configurando variables de conexión y entorno en .env.prod..."
        # Identidad & Modo Aplicación
        set_env_var ".env.prod" "APP_NAME" "Project Management"
        set_env_var ".env.prod" "APP_ENV" "production"
        set_env_var ".env.prod" "APP_DEBUG" "false"
        set_env_var ".env.prod" "APP_SERVICE" "api_prod"
        set_env_var ".env.prod" "COMPOSE_PROJECT_NAME" "project_prod"
        set_env_var ".env.prod" "LOG_LEVEL" "warn"

        # URLs y Gateway
        set_env_var ".env.prod" "PROD_GATEWAY_PORT" "$PORT"
        set_env_var ".env.prod" "APP_URL" "$BASE_URL"
        set_env_var ".env.prod" "APP_URL_PROD" "$BASE_URL"
        set_env_var ".env.prod" "FRONTEND_URL" "$BASE_URL"

        # Conexión Base de Datos PostgreSQL (Red interna de docker-compose-prod)
        set_env_var ".env.prod" "DB_CONNECTION" "pgsql"
        set_env_var ".env.prod" "DB_HOST" "postgres_prod"
        set_env_var ".env.prod" "DB_PORT" "5432"
        set_env_var ".env.prod" "DB_DATABASE" "project_prod"
        set_env_var ".env.prod" "POSTGRES_DB" "project_prod"

        # Conexión Redis (Caché & Colas)
        set_env_var ".env.prod" "REDIS_CLIENT" "predis"
        set_env_var ".env.prod" "REDIS_HOST" "redis_prod"
        set_env_var ".env.prod" "REDIS_PORT" "6379"
        set_env_var ".env.prod" "REDIS_PREFIX" "project_prod_cache_"
        set_env_var ".env.prod" "REDIS_DB" "0"
        set_env_var ".env.prod" "REDIS_CACHE_DB" "1"
        set_env_var ".env.prod" "CACHE_STORE" "redis"
        set_env_var ".env.prod" "QUEUE_CONNECTION" "redis"

        # Filesystem / Almacenamiento S3 con RustFS
        set_env_var ".env.prod" "FILESYSTEM_DISK" "rustfs"
        set_env_var ".env.prod" "RUSTFS_ENDPOINT" "http://rustfs_prod:9000"
        set_env_var ".env.prod" "RUSTFS_URL" "${SCHEME}://${TARGET_HOST}:${RUSTFS_PORT}/${RUSTFS_BUCKET}"
        set_env_var ".env.prod" "AWS_ENDPOINT" "http://rustfs_prod:9000"
        set_env_var ".env.prod" "AWS_URL" "${SCHEME}://${TARGET_HOST}:${RUSTFS_PORT}/${RUSTFS_BUCKET}"
        set_env_var ".env.prod" "RUSTFS_LOG_LEVEL" "warn"

        # Frontend Web Next.js (Rutas relativas same-origin por Gateway Nginx)
        set_env_var ".env.prod" "NEXT_PUBLIC_ENVIRONMENT" "production"
        set_env_var ".env.prod" "NEXT_PUBLIC_API_URL" ""
        set_env_var ".env.prod" "NEXT_PUBLIC_REPORT_API_URL" ""
        set_env_var ".env.prod" "NEXT_PUBLIC_LOGIN_ROUTE" "/login"

        # Variables comunes (correo, sesión, logs, app locale, sdi auth)
        ensure_common_vars ".env.prod"

        # Asegurar clave de cifrado de Laravel
        ensure_app_key ".env.prod"

        echo "[3/3] Validando configuración de docker-compose-prod.yml..."
        docker compose --env-file .env.prod -f docker-compose-prod.yml config > /dev/null
        echo "      ✓ Sintaxis de Docker Compose válida."

        echo "======================================================================"
        echo " CONFIGURACIÓN DE PRODUCCIÓN COMPLETADA EXITOSAMENTE"
        echo "======================================================================"
        echo " Para iniciar los contenedores ahora:"
        echo "   docker compose --env-file .env.prod -f docker-compose-prod.yml up -d --build"
        echo ""
        echo " Para ejecutar migraciones y enlazar storage:"
        echo "   docker compose -f docker-compose-prod.yml exec api_prod php artisan migrate --force"
        echo "   docker compose -f docker-compose-prod.yml exec api_prod php artisan storage:link"
        echo ""
        echo " Puntos de acceso:"
        echo "   - Aplicación Web : $BASE_URL/"
        echo "   - API Backend    : $BASE_URL/api/v1"
        echo "   - Documentación  : $BASE_URL/docs"
        echo "======================================================================"
        ;;

    dev)
        echo "[1/3] Preparando archivo de entorno de Desarrollo / QA (.env.dev)..."
        if [ ! -f ".env.dev" ]; then
            if [ -f ".env.example" ]; then
                cp .env.example .env.dev
            else
                touch .env.dev
            fi
        fi

        RUSTFS_PORT=$(get_env_var ".env.dev" "DEV_RUSTFS_PORT" "9200")
        RUSTFS_BUCKET=$(get_env_var ".env.dev" "RUSTFS_BUCKET" "sail")

        echo "[2/3] Configurando variables de conexión y entorno en .env.dev..."
        # Identidad & Modo Aplicación
        set_env_var ".env.dev" "APP_NAME" "Project Management Dev"
        set_env_var ".env.dev" "APP_ENV" "development"
        set_env_var ".env.dev" "APP_DEBUG" "true"
        set_env_var ".env.dev" "APP_SERVICE" "api_dev"
        set_env_var ".env.dev" "COMPOSE_PROJECT_NAME" "project_dev"
        set_env_var ".env.dev" "LOG_LEVEL" "debug"

        # URLs y Gateway
        set_env_var ".env.dev" "DEV_GATEWAY_PORT" "$PORT"
        set_env_var ".env.dev" "APP_URL" "$BASE_URL"
        set_env_var ".env.dev" "APP_URL_PROD" "$BASE_URL"
        set_env_var ".env.dev" "FRONTEND_URL" "$BASE_URL"

        # Conexión Base de Datos PostgreSQL (Red interna de docker-compose-dev)
        set_env_var ".env.dev" "DB_CONNECTION" "pgsql"
        set_env_var ".env.dev" "DB_HOST" "postgres_dev"
        set_env_var ".env.dev" "DB_PORT" "5432"
        set_env_var ".env.dev" "DB_DATABASE" "project_dev"
        set_env_var ".env.dev" "POSTGRES_DB" "project_dev"

        # Conexión Redis (Caché & Colas)
        set_env_var ".env.dev" "REDIS_CLIENT" "predis"
        set_env_var ".env.dev" "REDIS_HOST" "redis_dev"
        set_env_var ".env.dev" "REDIS_PORT" "6379"
        set_env_var ".env.dev" "REDIS_PREFIX" "project_dev_cache_"
        set_env_var ".env.dev" "REDIS_DB" "0"
        set_env_var ".env.dev" "REDIS_CACHE_DB" "1"
        set_env_var ".env.dev" "CACHE_STORE" "redis"
        set_env_var ".env.dev" "QUEUE_CONNECTION" "redis"

        # Filesystem / Almacenamiento S3 con RustFS
        set_env_var ".env.dev" "FILESYSTEM_DISK" "rustfs"
        set_env_var ".env.dev" "RUSTFS_ENDPOINT" "http://rustfs_dev:9000"
        set_env_var ".env.dev" "RUSTFS_URL" "${SCHEME}://${TARGET_HOST}:${RUSTFS_PORT}/${RUSTFS_BUCKET}"
        set_env_var ".env.dev" "AWS_ENDPOINT" "http://rustfs_dev:9000"
        set_env_var ".env.dev" "AWS_URL" "${SCHEME}://${TARGET_HOST}:${RUSTFS_PORT}/${RUSTFS_BUCKET}"
        set_env_var ".env.dev" "RUSTFS_LOG_LEVEL" "info"

        # Correo Dev (Mailpit)
        set_env_var ".env.dev" "MAIL_HOST" "mailpit_dev"
        set_env_var ".env.dev" "MAIL_PORT" "1025"

        # Frontend Web Next.js (Rutas relativas same-origin por Gateway Nginx)
        set_env_var ".env.dev" "NEXT_PUBLIC_ENVIRONMENT" "development"
        set_env_var ".env.dev" "NEXT_PUBLIC_API_URL" ""
        set_env_var ".env.dev" "NEXT_PUBLIC_REPORT_API_URL" ""
        set_env_var ".env.dev" "NEXT_PUBLIC_LOGIN_ROUTE" "/login"

        # Variables comunes (correo, sesión, logs, app locale, sdi auth)
        ensure_common_vars ".env.dev"

        # Asegurar clave de cifrado de Laravel
        ensure_app_key ".env.dev"

        echo "[3/3] Validando configuración de docker-compose-dev.yml..."
        docker compose --env-file .env.dev -f docker-compose-dev.yml config > /dev/null
        echo "      ✓ Sintaxis de Docker Compose válida."

        echo "======================================================================"
        echo " CONFIGURACIÓN DE DESARROLLO / QA COMPLETADA EXITOSAMENTE"
        echo "======================================================================"
        echo " Para iniciar los contenedores ahora:"
        echo "   docker compose --env-file .env.dev -f docker-compose-dev.yml up -d --build"
        echo ""
        echo " Para ejecutar migraciones y enlazar storage:"
        echo "   docker compose -f docker-compose-dev.yml exec api_dev php artisan migrate --force"
        echo "   docker compose -f docker-compose-dev.yml exec api_dev php artisan storage:link"
        echo ""
        echo " Puntos de acceso:"
        echo "   - Aplicación Web : $BASE_URL/"
        echo "   - API Backend    : $BASE_URL/api/v1"
        echo "   - Documentación  : $BASE_URL/docs"
        echo "======================================================================"
        ;;

    local)
        echo "[1/3] Preparando archivo de entorno Local (.env)..."
        if [ ! -f ".env" ]; then
            if [ -f ".env.example" ]; then
                cp .env.example .env
            else
                touch .env
            fi
        fi

        WEB_PORT=$(get_env_var ".env" "WEB_PORT" "3000")
        RUSTFS_PORT=$(get_env_var ".env" "FORWARD_RUSTFS_PORT" "9100")
        RUSTFS_BUCKET=$(get_env_var ".env" "RUSTFS_BUCKET" "sail")

        if { [ "$SCHEME" = "http" ] && [ "$WEB_PORT" = "80" ]; } || { [ "$SCHEME" = "https" ] && [ "$WEB_PORT" = "443" ]; }; then
            WEB_URL="${SCHEME}://${TARGET_HOST}"
        else
            WEB_URL="${SCHEME}://${TARGET_HOST}:${WEB_PORT}"
        fi

        echo "[2/3] Configurando variables de conexión y entorno en .env, apps/api/.env y apps/web/.env..."
        # Identidad & Modo Aplicación Local
        set_env_var ".env" "APP_NAME" "Project Management"
        set_env_var ".env" "APP_ENV" "local"
        set_env_var ".env" "APP_DEBUG" "true"
        set_env_var ".env" "APP_SERVICE" "project_managment"
        set_env_var ".env" "COMPOSE_PROJECT_NAME" "project"
        set_env_var ".env" "LOG_LEVEL" "debug"

        # URLs y Puertos Host
        set_env_var ".env" "APP_PORT" "$PORT"
        set_env_var ".env" "WEB_PORT" "$WEB_PORT"
        set_env_var ".env" "APP_URL" "$BASE_URL"
        set_env_var ".env" "APP_URL_PROD" "$BASE_URL"
        set_env_var ".env" "FRONTEND_URL" "$WEB_URL"

        # Conexión Base de Datos PostgreSQL
        set_env_var ".env" "DB_CONNECTION" "pgsql"
        set_env_var ".env" "DB_HOST" "postgres"
        set_env_var ".env" "DB_PORT" "5432"
        set_env_var ".env" "DB_DATABASE" "project"
        set_env_var ".env" "POSTGRES_DB" "project"

        # Conexión Redis (Caché & Colas)
        set_env_var ".env" "REDIS_CLIENT" "predis"
        set_env_var ".env" "REDIS_HOST" "redis"
        set_env_var ".env" "REDIS_PORT" "6379"
        set_env_var ".env" "REDIS_PREFIX" "project_cache_"
        set_env_var ".env" "REDIS_DB" "0"
        set_env_var ".env" "REDIS_CACHE_DB" "1"
        set_env_var ".env" "CACHE_STORE" "redis"
        set_env_var ".env" "QUEUE_CONNECTION" "redis"

        # Filesystem / Almacenamiento S3 con RustFS
        set_env_var ".env" "FILESYSTEM_DISK" "rustfs"
        set_env_var ".env" "RUSTFS_ENDPOINT" "http://rustfs:9000"
        set_env_var ".env" "RUSTFS_URL" "${SCHEME}://${TARGET_HOST}:${RUSTFS_PORT}/${RUSTFS_BUCKET}"
        set_env_var ".env" "AWS_ENDPOINT" "http://rustfs:9000"
        set_env_var ".env" "AWS_URL" "${SCHEME}://${TARGET_HOST}:${RUSTFS_PORT}/${RUSTFS_BUCKET}"
        set_env_var ".env" "RUSTFS_LOG_LEVEL" "info"

        # Mail Local
        set_env_var ".env" "MAIL_HOST" "mailpit"
        set_env_var ".env" "MAIL_PORT" "1025"

        # Limpiar variables residuales de otros entornos si existiesen en .env
        remove_env_var ".env" "PROD_GATEWAY_PORT"
        remove_env_var ".env" "DEV_GATEWAY_PORT"

        # Variables comunes (correo, sesión, logs, app locale, sdi auth)
        ensure_common_vars ".env"

        # Asegurar clave de cifrado de Laravel
        ensure_app_key ".env"

        # Subproyecto apps/api/.env
        if [ -f "apps/api/.env" ] || [ -f "apps/api/.env.example" ]; then
            if [ ! -f "apps/api/.env" ]; then
                cp "apps/api/.env.example" "apps/api/.env"
            fi
            set_env_var "apps/api/.env" "APP_NAME" "Project Management"
            set_env_var "apps/api/.env" "APP_ENV" "local"
            set_env_var "apps/api/.env" "APP_DEBUG" "true"
            set_env_var "apps/api/.env" "APP_SERVICE" "project_managment"
            set_env_var "apps/api/.env" "COMPOSE_PROJECT_NAME" "project"
            set_env_var "apps/api/.env" "LOG_LEVEL" "debug"
            set_env_var "apps/api/.env" "APP_PORT" "$PORT"
            set_env_var "apps/api/.env" "APP_URL" "$BASE_URL"
            set_env_var "apps/api/.env" "APP_URL_PROD" "$BASE_URL"
            set_env_var "apps/api/.env" "FRONTEND_URL" "$WEB_URL"
            set_env_var "apps/api/.env" "DB_CONNECTION" "pgsql"
            set_env_var "apps/api/.env" "DB_HOST" "postgres"
            set_env_var "apps/api/.env" "DB_PORT" "5432"
            set_env_var "apps/api/.env" "DB_DATABASE" "project"
            set_env_var "apps/api/.env" "POSTGRES_DB" "project"
            set_env_var "apps/api/.env" "REDIS_CLIENT" "predis"
            set_env_var "apps/api/.env" "REDIS_HOST" "redis"
            set_env_var "apps/api/.env" "REDIS_PORT" "6379"
            set_env_var "apps/api/.env" "REDIS_PREFIX" "project_cache_"
            set_env_var "apps/api/.env" "REDIS_DB" "0"
            set_env_var "apps/api/.env" "REDIS_CACHE_DB" "1"
            set_env_var "apps/api/.env" "CACHE_STORE" "redis"
            set_env_var "apps/api/.env" "QUEUE_CONNECTION" "redis"
            set_env_var "apps/api/.env" "FILESYSTEM_DISK" "rustfs"
            set_env_var "apps/api/.env" "RUSTFS_ENDPOINT" "http://rustfs:9000"
            set_env_var "apps/api/.env" "RUSTFS_URL" "${SCHEME}://${TARGET_HOST}:${RUSTFS_PORT}/${RUSTFS_BUCKET}"
            set_env_var "apps/api/.env" "AWS_ENDPOINT" "http://rustfs:9000"
            set_env_var "apps/api/.env" "AWS_URL" "${SCHEME}://${TARGET_HOST}:${RUSTFS_PORT}/${RUSTFS_BUCKET}"
            ensure_common_vars "apps/api/.env"
            ensure_app_key "apps/api/.env"
        fi

        # Subproyecto apps/web/.env
        if [ -f "apps/web/.env" ] || [ -f "apps/web/.env.example" ]; then
            if [ ! -f "apps/web/.env" ]; then
                cp "apps/web/.env.example" "apps/web/.env"
            fi
            set_env_var "apps/web/.env" "NEXT_PUBLIC_ENVIRONMENT" "local"
            set_env_var "apps/web/.env" "NEXT_PUBLIC_API_URL" "$BASE_URL"
            set_env_var "apps/web/.env" "NEXT_PUBLIC_REPORT_API_URL" "$BASE_URL"
            set_env_var "apps/web/.env" "NEXT_PUBLIC_LOGIN_ROUTE" "$WEB_URL"
        fi

        echo "[3/3] Validando configuración de docker-compose.yml..."
        docker compose --env-file .env -f docker-compose.yml config > /dev/null
        echo "      ✓ Sintaxis de Docker Compose válida."

        echo "======================================================================"
        echo " CONFIGURACIÓN LOCAL COMPLETADA EXITOSAMENTE"
        echo "======================================================================"
        echo " Para iniciar backend y servicios en Docker (Sail):"
        echo "   docker compose --env-file .env -f docker-compose.yml up -d"
        echo ""
        echo " Para ejecutar migraciones y enlazar storage:"
        echo "   ./sail artisan migrate"
        echo "   ./sail artisan storage:link"
        echo ""
        echo " Para iniciar el frontend en el host:"
        echo "   cd apps/web && pnpm dev"
        echo ""
        echo " Puntos de acceso:"
        echo "   - Frontend Web (Nativo) : $WEB_URL"
        echo "   - API Backend (Sail)   : $BASE_URL/api/v1"
        echo "   - Documentación Scramble: $BASE_URL/docs"
        echo "======================================================================"
        ;;
esac

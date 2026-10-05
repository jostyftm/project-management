#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue Unificado (IP o Dominio Personalizado)
# Uso:
#   ./deploy/deploy.sh <IP_O_DOMINIO> [PUERTO_GATEWAY (default 80)]
#
# Ejemplos:
#   ./deploy/deploy.sh 172.15.30.25
#   ./deploy/deploy.sh planeclone.local
#   ./deploy/deploy.sh 172.15.30.25 8080
# ==============================================================================

set -euo pipefail

TARGET_HOST="${1:-}"
GATEWAY_PORT="${2:-80}"

if [ -z "$TARGET_HOST" ]; then
    echo "======================================================================"
    echo " ERROR: Debes especificar una IP o nombre de dominio."
    echo "======================================================================"
    echo " Uso: $0 <IP_O_DOMINIO> [PUERTO]"
    echo ""
    echo " Ejemplos:"
    echo "   $0 172.15.30.25"
    echo "   $0 planeclone.local"
    echo "   $0 192.168.1.100 8080"
    exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ "$GATEWAY_PORT" = "80" ]; then
    BASE_URL="http://${TARGET_HOST}"
else
    BASE_URL="http://${TARGET_HOST}:${GATEWAY_PORT}"
fi

echo "======================================================================"
echo " CONFIGURANDO DESPLIEGUE UNIFICADO"
echo " Host Objetivo : $TARGET_HOST"
echo " Puerto Gateway: $GATEWAY_PORT"
echo " URL Base      : $BASE_URL"
echo "======================================================================"

# 1. Asegurar existencia de archivo .env en la raiz
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    if [ -f ".env.prod" ]; then
        echo "[1/4] Creando .env a partir de .env.prod..."
        cp .env.prod "$ENV_FILE"
    else
        echo "[1/4] Creando .env a partir de .env.example..."
        cp .env.example "$ENV_FILE"
    fi
else
    echo "[1/4] Archivo .env detectado."
fi

# 2. Actualizar variables dinamicas en .env
echo "[2/4] Actualizando variables de host en $ENV_FILE..."

set_env_var() {
    local key="$1"
    local value="$2"
    if grep -q "^${key}=" "$ENV_FILE"; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

set_env_var "PROD_GATEWAY_PORT" "$GATEWAY_PORT"
set_env_var "APP_URL" "$BASE_URL"
set_env_var "FRONTEND_URL" "$BASE_URL"
set_env_var "NEXT_PUBLIC_API_URL" ""
set_env_var "NEXT_PUBLIC_REPORT_API_URL" ""
set_env_var "RUSTFS_URL" "${BASE_URL}:9300/sail"
set_env_var "AWS_URL" "${BASE_URL}:9300/sail"

echo "      ✓ APP_URL=$BASE_URL"
echo "      ✓ FRONTEND_URL=$BASE_URL"
echo "      ✓ PROD_GATEWAY_PORT=$GATEWAY_PORT"
echo "      ✓ NEXT_PUBLIC_API_URL= (same-origin relativo /api/v1)"

# 3. Validar configuracion de Docker Compose
echo "[3/4] Validando sintaxis de docker-compose-prod.yml..."
docker compose --env-file "$ENV_FILE" -f docker-compose-prod.yml config > /dev/null
echo "      ✓ Configuracion de Docker Compose valida."

echo "======================================================================"
echo " LISTO PARA LEVANTAR EL SERVICIO"
echo "======================================================================"
echo " Para iniciar los contenedores ahora, ejecuta:"
echo "   docker compose --env-file $ENV_FILE -f docker-compose-prod.yml up -d --build"
echo ""
echo " Para aplicar migraciones y storage link una vez iniciado:"
echo "   docker compose -f docker-compose-prod.yml exec api_prod php artisan migrate --force"
echo "   docker compose -f docker-compose-prod.yml exec api_prod php artisan storage:link"
echo ""
echo " Puntos de acceso una vez iniciado:"
echo "   - App Web         : $BASE_URL/"
echo "   - API Backend     : $BASE_URL/api/v1/..."
echo "   - Documentacion   : $BASE_URL/docs"
echo "======================================================================"

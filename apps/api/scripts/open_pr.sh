#!/usr/bin/env bash
# scripts/open_pr.sh - Helper dinámico para hacer push y abrir Pull Request hacia el repositorio principal
set -e

# -------------------------------------------------------------
# 1. Detección de Rama Actual y Rama Base
# -------------------------------------------------------------
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
BASE_BRANCH="${1:-dev}"

if [ -z "$CURRENT_BRANCH" ] || [ "$CURRENT_BRANCH" = "HEAD" ]; then
    echo "❌ Error: No se pudo determinar la rama actual (detached HEAD)."
    exit 1
fi

# -------------------------------------------------------------
# 2. Detección Dinámica de Remoto 'origin' (Fork del Desarrollador)
# -------------------------------------------------------------
ORIGIN_URL=$(git config --get remote.origin.url || true)

if [ -z "$ORIGIN_URL" ]; then
    echo "❌ Error: No se encontró ningún remote 'origin' configurado en este repositorio."
    exit 1
fi

# Limpiar sufijo .git y extraer owner y repo
# Funciona con: git@host:owner/repo.git y https://github.com/owner/repo.git
CLEAN_ORIGIN="${ORIGIN_URL%.git}"
FORK_OWNER=$(echo "$CLEAN_ORIGIN" | sed -E "s|.*[:/]([^/]+)/([^/]+)$|\1|")
REPO_NAME=$(echo "$CLEAN_ORIGIN" | sed -E "s|.*[:/]([^/]+)/([^/]+)$|\2|")

# -------------------------------------------------------------
# 3. Detección Dinámica de Repositorio Principal (Upstream)
# -------------------------------------------------------------
UPSTREAM_URL=$(git config --get remote.upstream.url || git config --get remote.master.url || true)

if [ -n "$UPSTREAM_URL" ]; then
    CLEAN_UPSTREAM="${UPSTREAM_URL%.git}"
    UPSTREAM_OWNER=$(echo "$CLEAN_UPSTREAM" | sed -E "s|.*[:/]([^/]+)/([^/]+)$|\1|")
    UPSTREAM_REPO=$(echo "$CLEAN_UPSTREAM" | sed -E "s|.*[:/]([^/]+)/([^/]+)$|\2|")
else
    UPSTREAM_OWNER="${UPSTREAM_ORG:-Inverpacifico-desarrollo}"
    UPSTREAM_REPO="$REPO_NAME"
fi

# -------------------------------------------------------------
# 4. Formateo de la Referencia HEAD según si es Fork o Repo Directo
# -------------------------------------------------------------
if [ "$FORK_OWNER" = "$UPSTREAM_OWNER" ]; then
    HEAD_REF="$CURRENT_BRANCH"
else
    HEAD_REF="${FORK_OWNER}:${CURRENT_BRANCH}"
fi

# -------------------------------------------------------------
# 5. Pull a Origin
# -------------------------------------------------------------
echo "========================================================================"
echo "🚀 Desarrollador : $FORK_OWNER"
echo "📦 Repositorio   : $REPO_NAME"
echo "🌿 Rama actual   : $CURRENT_BRANCH"
echo "🎯 Destino       : $UPSTREAM_OWNER/$UPSTREAM_REPO (rama: $BASE_BRANCH)"
echo "========================================================================"
echo "Bajando cambios a origin ($CURRENT_BRANCH)..."
git pull origin "$CURRENT_BRANCH"

# -------------------------------------------------------------
# 5. Push a Origin
# -------------------------------------------------------------
echo "========================================================================"
echo "🚀 Desarrollador : $FORK_OWNER"
echo "📦 Repositorio   : $REPO_NAME"
echo "🌿 Rama actual   : $CURRENT_BRANCH"
echo "🎯 Destino       : $UPSTREAM_OWNER/$UPSTREAM_REPO (rama: $BASE_BRANCH)"
echo "========================================================================"
echo "Subiendo cambios a origin ($CURRENT_BRANCH)..."
git push origin "$CURRENT_BRANCH"

# -------------------------------------------------------------
# 6. Generación de URL de Pull Request
# -------------------------------------------------------------
PR_URL="https://github.com/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/compare/${BASE_BRANCH}...${HEAD_REF}?expand=1"

echo ""
echo "========================================================================"
echo "✅ Push completado exitosamente a tu fork."
echo "🔗 Para crear el Pull Request hacia el repositorio principal abre:"
echo "   $PR_URL"
echo "========================================================================"

# Abrir el navegador automáticamente si está disponible en entorno gráfico
if command -v xdg-open > /dev/null 2>&1; then
    xdg-open "$PR_URL" 2>/dev/null || true
elif command -v open > /dev/null 2>&1; then
    open "$PR_URL" 2>/dev/null || true
fi

#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/apps/api/vendor/bin/sail" ]; then
    exec "$SCRIPT_DIR/apps/api/vendor/bin/sail" "$@"
else
    echo "Laravel Sail no encontrado en $SCRIPT_DIR/apps/api/vendor/bin/sail" >&2
    exit 1
fi

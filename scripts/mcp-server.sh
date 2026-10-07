#!/usr/bin/env bash
set -e

# Directorio raíz del proyecto
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Ejecutar el servidor MCP dentro del contenedor Docker con stdin/stdout desacoplado de TTY (-T)
exec docker compose exec -T project_managment php artisan mcp:start project-management "$@"

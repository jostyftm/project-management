# Guía de Conexión del Servidor MCP (Model Context Protocol)

Este proyecto cuenta con un servidor oficial **MCP (Model Context Protocol)** implementado con [`laravel/mcp`](https://laravel.com/framework/docs/mcp). Permite a modelos y agentes de IA (como **Cursor**, **Claude Desktop**, **Antigravity**, **VS Code** o agentes web autónomos) conectarse de manera segura a la plataforma para gestionar proyectos, tareas, sprints, módulos, versiones y flujos de trabajo en tiempo real.

---

## 1. Modos de Conexión y Transporte

El servidor MCP ofrece dos modalidades de transporte:

1. **Modo Local (Stdio Transport)**: Comunicación directa mediante entrada/salida estándar ejecutando el comando de Artisan dentro del contenedor o en el host. Ideal para clientes de escritorio (Cursor, Claude Desktop, Antigravity).
2. **Modo Web (HTTP / SSE Transport)**: Comunicación remota vía `POST /mcp/project-management` con autenticación mediante Bearer token de Sanctum y aislamiento por Workspace.

---

## 2. Configuración en Clientes de IA

### 2.1. Cursor (`.cursor/mcp.json`)

### 2.1. Cursor (`.cursor/mcp.json`)

Para que el asistente de Cursor interactúe con los proyectos, el archivo `.cursor/mcp.json` ya se encuentra configurado en la raíz del proyecto usando el wrapper:

```json
{
  "mcpServers": {
    "plane-project-management": {
      "command": "./scripts/mcp-server.sh"
    }
  }
}
```

> **Alternativa directa con Docker:**
> ```json
> {
>   "mcpServers": {
>     "plane-project-management": {
>       "command": "docker",
>       "args": [
>         "compose",
>         "exec",
>         "-T",
>         "project_managment",
>         "php",
>         "artisan",
>         "mcp:start",
>         "project-management"
>       ]
>     }
>   }
> }
> ```

---

### 2.2. Claude Desktop (`claude_desktop_config.json`)

En Claude Desktop, accede a la configuración (`Settings > Developer > Edit Config`) y agrega el servidor apuntando al script o a Docker:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "plane-projects": {
      "command": "/ruta/absoluta/al/proyecto/scripts/mcp-server.sh"
    }
  }
}
```

---

### 2.3. VS Code en Windows con API en WSL (HTTP Local sin Fricción)

Si ejecutas Docker en **WSL** y tu **VS Code** corre directamente en **Windows**:
WSL2 comparte automáticamente la red con Windows a través de `localhost:8000`.

El archivo `.vscode/mcp.json` está configurado para conectarse vía HTTP local:

```json
{
  "mcpServers": {
    "plane-project-management": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:8000/mcp/project-management"
      ]
    }
  }
}
```

> **Alternativa directa con URL (si tu extensión soporta `"url"` nativo, como Roo-Code o Cline):**
> ```json
> {
>   "mcpServers": {
>     "plane-project-management": {
>       "url": "http://localhost:8000/mcp/project-management"
>     }
>   }
> }
> ```
> *En entorno local, el middleware `AuthenticateMcpRequest` autentica automáticamente con el SuperAdmin sin necesidad de tokens.*

---

### 2.4. Antigravity / Linux Nativo (Stdio)

Si trabajas directamente en terminal Linux o dentro de WSL:
```json
{
  "mcpServers": {
    "plane-project-management": {
      "command": "./scripts/mcp-server.sh"
    }
  }
}
```

---

### 2.4. Integración Remota / Agentes Web (HTTP / SSE)

Para conectar agentes a través de la red:

- **Endpoint:** `POST https://tu-dominio.com/mcp/project-management`
- **Headers requeridos:**
  - `Authorization: Bearer <TU_SANCTUM_TOKEN>`
  - `X-Workspace-Id: <ID_DEL_WORKSPACE>`
  - `Accept: application/json`
  - `Content-Type: application/json`

Ejemplo de payload JSON-RPC 2.0:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_projects",
    "arguments": {}
  }
}
```

---

## 3. Catálogo de Herramientas (Tools)

| Herramienta | Tipo | Descripción | Argumentos Clave |
| :--- | :--- | :--- | :--- |
| `list_projects` | Lectura | Lista los proyectos del workspace con filtros y conteos | `query` (opcional) |
| `get_project` | Lectura | Consulta detalle de proyecto con estados, etiquetas y miembros | `project` (ID o identificador ej: "ENG") |
| `create_project` | Escritura | Crea un proyecto inicializando automáticamente los 5 estados Plane | `name`, `identifier`, `description`, `estimate_system` |
| `update_project` | Escritura | Actualiza nombre, descripción o sistema de estimación | `project`, `name`, `description`, `estimate_system` |
| `delete_project` | Destructiva | Elimina un proyecto en cascada con confirmación obligatoria | `project`, `confirm_identifier` |
| `list_work_items` | Lectura | Lista y filtra historias, tareas o bugs por ciclo, módulo, estado o prioridad | `project`, `cycle_id`, `module_id`, `state_id`, `priority`, `query` |
| `get_work_item` | Lectura | Detalle completo de tarea por clave (ej: "ENG-101") con DoD y entregables | `item`, `project` (opcional) |
| `create_work_item` | Escritura | Crea una tarea calculando consecutivo y asignando estado inicial | `project`, `title`, `description`, `priority`, `estimate_points`, `cycle_id` |
| `update_work_item` | Escritura | Modifica estado, prioridad, responsable, puntos o ciclo de una tarea | `item`, `state_id`, `priority`, `estimate_points`, `lead_id`, `cycle_id` |
| `delete_work_item` | Destructiva | Elimina una tarea de forma definitiva | `item`, `project` (opcional) |
| `list_cycles` | Lectura | Lista los ciclos / sprints con sus fechas y métricas | `project`, `status` (DRAFT, UPCOMING, CURRENT, COMPLETED) |
| `get_cycle` | Lectura | Detalle de un sprint con porcentaje de avance y lista de tareas | `cycle_id` |
| `create_cycle` | Escritura | Registra un nuevo ciclo o sprint de trabajo | `project`, `name`, `start_date`, `end_date`, `status` |
| `update_cycle` | Escritura | Cambia estado del sprint (ej: a CURRENT o COMPLETED) y fechas | `cycle_id`, `status`, `name`, `start_date`, `end_date` |
| `list_modules` | Lectura | Lista módulos funcionales de un proyecto | `project`, `status` (PLANNED, IN_PROGRESS, COMPLETED...) |
| `get_module` | Lectura | Consulta detalle de módulo y sus tareas vinculadas | `module_id` |
| `create_module` | Escritura | Crea un módulo funcional con responsable | `project`, `name`, `lead_id`, `start_date`, `target_date` |
| `update_module` | Escritura | Actualiza avance o responsable del módulo | `module_id`, `status`, `name`, `lead_id` |
| `list_milestones` | Lectura | Lista los hitos estratégicos del proyecto | `project` |
| `get_milestone` | Lectura | Detalle del hito y tareas asociadas | `milestone_id` |
| `create_milestone` | Escritura | Registra un hito con fecha objetivo | `project`, `title`, `description`, `target_date` |
| `update_milestone` | Escritura | Marca un hito como COMPLETED o reprograma fecha | `milestone_id`, `status`, `target_date` |
| `list_releases` | Lectura | Lista versiones de software del proyecto | `project`, `status` (DRAFT, PUBLISHED, ARCHIVED) |
| `get_release` | Lectura | Detalle de la versión con changelog completo | `release_id` |
| `create_release` | Escritura | Crea una versión SemVer con notas de lanzamiento | `project`, `version`, `name`, `changelog`, `status` |
| `update_release` | Escritura | Publica o actualiza una versión | `release_id`, `status`, `changelog`, `version` |
| `list_project_states` | Lectura | Lista los estados del proyecto y sus grupos canónicos | `project` |
| `list_project_labels` | Lectura | Lista las etiquetas disponibles para categorización | `project` |

---

## 4. Recursos Disponibles (Resources)

- **`projects://list`**: Catálogo de todos los proyectos activos en formato estructurado JSON.
- **`projects://{project}/summary`**: Informe ejecutivo en tiempo real en Markdown detallando salud del proyecto, sprint activo, distribución por estados, módulos y alertas de tareas urgentes.

---

## 5. Prompts Asistidos (Prompts)

- **`plan_sprint`**: Genera la sesión guiada de planificación ágil a partir del backlog disponible, capacidad estimada y objetivo del sprint.
- **`project_health_review`**: Realiza una auditoría exhaustiva detectando tareas vencidas, cuellos de botella en WIP y recomendaciones para el equipo de entrega.

---

## 6. Depuración con MCP Inspector

Puedes inspeccionar y probar interactivamente todas las herramientas y recursos utilizando el inspector oficial de MCP incluido en Laravel:

```bash
docker compose exec project_managment php artisan mcp:inspector project-management
```

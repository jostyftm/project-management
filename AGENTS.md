# Directrices para Asistentes y Agentes de IA (AGENTS.md)

Este repositorio es una plataforma integral de gestión ágil de desarrollo de software (inspirada en Plane). Cuenta con un backend en **Laravel** (`apps/api`) y un frontend en **Next.js** (`apps/web`), orquestados mediante **Docker Compose**.

---

## 1. Integración con el Servidor MCP (Model Context Protocol)

Este proyecto cuenta con un servidor oficial MCP implementado con `laravel/mcp`, configurado para comunicarse mediante el wrapper ejecutable:
```bash
./scripts/mcp-server.sh
```

### Herramientas Disponibles (25 Tools):
- **Proyectos:** `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project`.
- **Work Items (Tareas, Historias, Bugs):** `list_work_items`, `get_work_item`, `create_work_item`, `update_work_item`, `delete_work_item`.
- **Ciclos / Sprints:** `list_cycles`, `get_cycle`, `create_cycle`, `update_cycle`.
- **Módulos:** `list_modules`, `get_module`, `create_module`, `update_module`.
- **Hitos (Milestones):** `list_milestones`, `get_milestone`, `create_milestone`, `update_milestone`.
- **Versiones / Releases:** `list_releases`, `get_release`, `create_release`, `update_release`.
- **Flujos de Trabajo:** `list_project_states`, `list_project_labels`.
- **Miembros e Invitaciones:** `list_project_members`, `add_project_member`, `update_project_member_role`, `remove_project_member`.

### Recursos Contextuales:
- `projects://list`: Catálogo estructurado de proyectos activos.
- `projects://{project}/summary`: Resumen ejecutivo en Markdown con la salud del proyecto, sprint en curso, desglose de estados y alertas de tareas urgentes.

### Prompts Asistidos:
- `plan_sprint`: Asiste en la planificación de sprints a partir del backlog del proyecto y la capacidad estimada.
- `project_health_review`: Audita tareas vencidas, sobrecarga de WIP y riesgos de entrega.

> **Instrucción para el Agente:** Cuando el usuario solicite crear, consultar, modificar o auditar tareas, proyectos, sprints, módulos o releases, prioriza siempre el uso de estas herramientas MCP.

---

## 2. Entorno y Ejecución de Comandos

- **Contenedor Backend:** `project_managment`
- **Comandos Artisan:** `docker compose exec project_managment php artisan <comando>`
- **Pruebas Automatizadas:** `docker compose exec project_managment php artisan test`
- **Formateo de Código:** `docker compose exec project_managment ./vendor/bin/pint`
- **Inspector MCP:** `docker compose exec project_managment php artisan mcp:inspector project-management`

---

## 3. Documentación Técnica de Integración y Work Items
- **Guía de Integración Completa:** Para detalles sobre el almacenamiento en HTML puro (`description_html`), el catálogo de editores frontend (`RichTextEditor` vs `NotionBlockEditor`) y contratos de MCP/REST API, consulta [docs/WORK_ITEM_INTEGRATION_AND_MCP.md](docs/WORK_ITEM_INTEGRATION_AND_MCP.md).

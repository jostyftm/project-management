# Directrices para Asistentes y Agentes de IA (AGENTS.md)

Este repositorio es una plataforma integral de gestión ágil de desarrollo de software (inspirada en Plane). Cuenta con un backend en **Laravel** (`apps/api`) y un frontend en **Next.js** (`apps/web`), orquestados mediante **Docker Compose**.

---

## 1. Integración con el Servidor MCP (Model Context Protocol)

Este proyecto cuenta con un servidor oficial MCP implementado con `laravel/mcp`, configurado para comunicarse mediante el wrapper ejecutable:
```bash
./scripts/mcp-server.sh
```

### Herramientas Disponibles (41 Tools):
- **Espacios de Trabajo (Workspaces):** `list_workspaces`, `get_workspace`, `create_workspace`, `update_workspace`, `delete_workspace`, `list_workspace_members`, `add_workspace_member`, `update_workspace_member_role`, `remove_workspace_member`.
- **Proyectos:** `list_projects`, `get_project`, `get_daily_standup`, `create_project`, `update_project`, `delete_project`, `export_project`, `import_project`.
- **Work Items (Tareas, Historias, Bugs):** `list_work_items`, `get_work_item`, `create_work_item` (soporta `acceptance_criteria`), `update_work_item`, `delete_work_item`.
- **Criterios de Aceptación / Definition of Done (DoD):** `create_work_item_dod_item`, `toggle_work_item_dod_item`, `delete_work_item_dod_item`.
- **Ciclos / Sprints:** `list_cycles`, `get_cycle`, `get_sprint_planning`, `create_cycle`, `update_cycle`.
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

> **Instrucción para el Agente:** Cuando el usuario solicite crear, consultar, modificar o auditar espacios de trabajo, tareas, proyectos, sprints, módulos o releases, prioriza siempre el uso de estas herramientas MCP.

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

---

## 4. Filosofía de Código y Cambios (Ponytail / YAGNI)
- **Solución mínima funcional**: Realizar siempre el cambio más pequeño y limpio que resuelva la tarea en su totalidad.
- **Reutilización obligatoria**: Buscar e implementar componentes, utilidades y servicios existentes en `apps/` antes de añadir código nuevo. No instalar dependencias externas para funciones de pocas líneas.
- **Sin sobreingeniería**: Evitar abstracciones prematuras, wrappers redundantes, tipados innecesariamente complejos o código especulativo ("para el futuro").
- **Diffs cortos**: Mantener los cambios limpios y concisos. El código que no se escribe es el que menos tokens consume y menos mantenimiento requiere.

---

## 5. Optimización de Salidas y Terminal (RTK & Context-Mode)
- **Wrappers de RTK**: Priorizar el uso de `rtk` al ejecutar comandos comunes de terminal para reducir el volumen de salida que ingresa al contexto:
  - Git: `rtk git status`, `rtk git diff`, `rtk git log`
  - Búsqueda: `rtk grep`
  - Pruebas y Linters: `rtk test`, `rtk lint`
- **Manejo de datos masivos (Context-Mode)**:
  - Ante comandos o consultas que generen salidas extensas (e.g., logs de contenedores Docker, listados grandes de paquetes pnpm, respuestas extensas de APIs o suites completas de tests), **no volcar la salida completa al contexto**.
  - Filtrar o extraer server-side (usando pipes con `grep`, `head`, `tail`, `jq` o scripts específicos) para inyectar al contexto únicamente las líneas de error o los campos requeridos.

---

## 6. Estilo de Comunicación (Caveman Inspired / High Signal)
- **Directo al grano**: Priorizar la respuesta técnica y la acción inmediata sobre fórmulas de cortesía, disculpas o saludos ceremoniales.
- **Integridad técnica**: Conservar con total exactitud todas las rutas de archivos, nombres de variables, comandos ejecutables y bloques de código.
- **Cero relleno**: Prescindir de frases introductorias redundantes ("*A continuación te presento...*", "*Con gusto te ayudo...*").

---

## 7. Diseño y Experiencia de Usuario (UI/UX Designer)
- **Generación de Sistemas de Diseño**: Ante el desarrollo de nuevas vistas, componentes clave o flujos de interfaz, consultar el motor de diseño:
  ```bash
  python3 .agents/skills/uiux-designer/scripts/search.py "<tipo_producto> <palabras_clave>" --design-system
  ```
- **Accesibilidad y WCAG AA (Crítico)**:
  - Contraste de texto mínimo de 4.5:1 respecto al fondo.
  - Áreas táctiles (touch targets) mínimas de 44x44px en móviles y elementos interactivos.
  - Indicadores de foco (`focus-visible`) nítidos y navegación consistente por teclado.
  - Etiquetas descriptivas (`aria-label`) en botones basados exclusivamente en iconos.
- **Microinteracciones y Feedback**:
  - `cursor-pointer` obligatorio en todos los elementos interactivos.
  - Transiciones suaves (150-300ms) en estados hover y active; respetar `prefers-reduced-motion`.
  - Deshabilitar botones con estado de carga durante peticiones asíncronas para prevenir doble envío.
  - No usar emojis como iconos; utilizar exclusivamente iconos vectoriales SVG (Lucide / Heroicons).

---

## 8. Arquitectura y Patrones Frontend (Frontend Expert)
- **Suspense-First y Cero Layout Shifts**:
  - Prohibidos los early returns condicionales con spinners (`if (isLoading) return <Spinner />`).
  - Emplear límites declarativos `<Suspense>` / loaders para evitar parpadeos visuales y saltos de maquetación.
- **Tipado Estricto (TypeScript)**:
  - Sin tipos `any`. Declarar interfaces explícitas para props y modelos de dominio.
  - Emplear `import type` para importaciones puras de tipos.
- **Organización Modular (Feature-Based)**:
  - Estructurar características en `features/{modulo}/` (`api/`, `components/`, `hooks/`, `types/`).
  - Separación de estilos: mantener estilos inline/sx cuando el bloque tenga menos de 100 líneas; extraer a archivo dedicado si excede ese límite.
- **Optimización y Carga Perezosa**:
  - Carga diferida (`React.lazy`) en componentes pesados, modales secundarios, gráficos y rutas complejas.
  - Emplear `useCallback` para manejadores de eventos pasados a hijos y `useMemo` en transformaciones de datos costosas.

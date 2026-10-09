# Guía de Integración: Work Items, Componentes de Editor Enriquecido y Servidor MCP

Esta documentación técnica está diseñada para desarrolladores, integradores e ingenieros que deseen extender la plataforma, integrar nuevos clientes o consumir los servicios de gestión de tareas (Work Items) tanto desde la interfaz web (Next.js) como a través de la API REST o el servidor **Model Context Protocol (MCP)**.

---

## 1. Arquitectura de Datos: Persistencia en HTML Puro (`description_html`)

### 1.1. Principio de la Fuente de la Verdad
A partir de la versión actual, la descripción de los Work Items se almacena de forma nativa como **HTML semántico puro** en la columna `description_html` (`LONGTEXT` en MySQL / `TEXT` en PostgreSQL).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FUENTES DE ENTRADA                              │
│                                                                        │
│   Web (RichTextEditor)       MCP (IA / Agentes)       API Externa      │
│      (HTML directo)          (Markdown o HTML)      (HTML o String)    │
└──────────────┬───────────────────────┬──────────────────────┬──────────┘
               │                       │                      │
               ▼                       ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  NORMALIZACIÓN Y PERSISTENCIA (API)                    │
│                                                                        │
│  - Si recibe HTML (`<p>`, `<h1>`, etc.) ──> Almacena HTML Puro        │
│  - Si recibe Markdown (`###`, `- `, etc.) ──> Convierte a HTML         │
│  - Si es registro histórico sin HTML ──> Resuelve dinámicamente        │
│                                                                        │
│                      work_items.description_html                       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SALIDA Y CONSUMO UNIFICADO                        │
│                                                                        │
│   - API Resource: `attributes.description_html` y alias `description`   │
│   - Compatibilidad legacy: `attributes.description_json` mantenido     │
│   - MCP Tools: Entrega texto HTML puro listo para renderizado          │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2. Especificación del Contrato HTML
El contenido admitido en `description_html` comprende las etiquetas estándar generadas por TipTap / ProseMirror:
- **Estructura y Títulos:** `<h1>`, `<h2>`, `<h3>`, `<p>`, `<blockquote>`, `<hr>`
- **Listas:** `<ul>`, `<ol>`, `<li>`, listas de tareas con casillas (`<p>☑ ...</p>` / `<p>☐ ...</p>`)
- **Estilos en línea:** `<strong>`, `<em>`, `<u>`, `<s>`, `<code>`, `<a href="..." target="_blank">`
- **Tablas:** `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`
- **Bloques de código:** `<pre><code>...</code></pre>`

### 1.3. Retrocompatibilidad Total con Registros Anteriores
1. **Migración con Backfill:** La migración `2026_10_09_100001_add_description_html_to_work_items_table` ejecutó una transformación de los registros preexistentes con `description_json` (incluyendo bloques heredados de Notion y tablas) hacia HTML limpio.
2. **Accesor Dinámico en Eloquent:** Si en cualquier momento un registro tiene `description_html = null` pero conserva `description_json`, el accesor `$workItem->description_html` y el alias `$workItem->description` ejecutan `resolveLegacyJsonToHtml()`, garantizando que la API y los recursos jamás retornen valores nulos si existe información guardada.
3. **Respaldo en API:** `WorkItemResource` entrega:
   ```json
   {
     "attributes": {
       "title": "Migrar módulo de autenticación",
       "description_html": "<h3>Objetivo</h3><p>Implementar OAuth2...</p>",
       "description": "<h3>Objetivo</h3><p>Implementar OAuth2...</p>",
       "description_json": { "html": "<h3>Objetivo</h3><p>Implementar OAuth2...</p>" }
     }
   }
   ```

---

## 2. Catálogo de Componentes Frontend (Next.js / Tailwind CSS)

En la aplicación existen **dos componentes principales de edición**. Es fundamental comprender sus casos de uso para saber cuál reutilizar en nuevos módulos.

### 2.1. `RichTextEditor` (`apps/web/components/ui/rich-text-editor.tsx`)

Componente ligero y moderno basado en **TipTap (ProseMirror)** diseñado para entradas enriquecidas continuas con emisión directa de HTML.

- **Ubicación:** `apps/web/components/ui/rich-text-editor.tsx`
- **Formato de datos:** Emite y recibe `string` (HTML puro).
- **Características principales:**
  - Barra de herramientas con formato de texto (Negrita, Cursiva, Subrayado, Tachado, Código, Encabezados H1-H3, Listas con viñetas, Listas numeradas, Citas, Enlaces).
  - Soporte nativo para modo claro y modo oscuro (`dark:` classes y `prose-invert`).
  - Límite de altura configurable (`maxHeight?: string`, ej: `"380px"`, `"500px"`).
  - Estado editable o solo lectura (`editable?: boolean`).
- **Casos de uso sugeridos para reutilizar:**
  - Criterios de aceptación o notas en entregables de tareas (`WorkItemDeliverablesSection`).
  - Módulo de comentarios interactivos (`CommentBox`).
  - Notas de versión en Releases (`ReleaseModal`).
  - Resumen ejecutivo de reportes de workspace.

#### Ejemplo de Reutilización:
```tsx
import React, { useState } from "react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

export function DeliverableNotesEditor({ initialNotes, onSave }: { initialNotes: string; onSave: (html: string) => void }) {
  const [content, setContent] = useState(initialNotes);

  return (
    <div className="space-y-3">
      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder="Escribe aquí las notas técnicas o criterios del entregable..."
        maxHeight="320px"
      />
      <button
        onClick={() => onSave(content)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
      >
        Guardar Notas
      </button>
    </div>
  );
}
```

---

### 2.2. `NotionBlockEditor` (`apps/web/components/plane/editor/NotionBlockEditor.tsx`)

Editor basado en bloques modulares independientes (párrafos, títulos, listas, divisores, bloques de código, tablas editables por celdas).

- **Ubicación:** `apps/web/components/plane/editor/NotionBlockEditor.tsx`
- **Formato de datos:** Emite y recibe un arreglo de objetos `DocBlock[]`:
  ```ts
  interface DocBlock {
    id: string;
    type: "paragraph" | "heading_1" | "heading_2" | "heading_3" | "bullet_list" | "numbered_list" | "todo" | "quote" | "code" | "callout" | "divider" | "table";
    content: string;
    checked?: boolean;
    tableData?: string[][];
  }
  ```
- **Por qué se preservó intacto:**
  Este editor está diseñado específicamente para documentos de formato libre, wikis corporativas y páginas del proyecto (`apps/web/app/(dashboard)/pages/[pageId]/page.tsx`). Permite reordenar bloques, insertar tablas dinámicas de varias filas/columnas y manejar bloques interactivos de checklist.
- **Casos de uso sugeridos para reutilizar:**
  - Sistema de Wiki y Documentación de Proyecto (`Pages`).
  - Plantillas de especificaciones técnicas (RFCs).
  - Base de conocimiento de equipo o Runbooks de infraestructura.

---

### 2.3. Contenedores de Work Items: Flujo de Guardado y Carga

| Contenedor | Archivo | Comportamiento |
| :--- | :--- | :--- |
| **`WorkItemCreateModal`** | `apps/web/components/plane/work-items/WorkItemCreateModal.tsx` | Permite redactar la descripción inicial en `RichTextEditor`. Al enviar el formulario, limpia etiquetas vacías (`<p></p>`) y envía `description_html: cleanHtml`. |
| **`WorkItemDetailSheet`** | `apps/web/components/plane/WorkItemDetailSheet.tsx` | Carga `itemData.description_html` de forma instantánea. Cuenta con auto-guardado debounced silencioso (800ms) que actualiza `description_html` en segundo plano sin interrumpir la escritura ni mostrar toasts molestos. |

#### Utilidad de Normalización (`rich-text-utils.ts`):
Si en algún componente recibes un payload heterogéneo (puede ser `description_html`, un objeto o un array de bloques legacy), usa `formatDescriptionToHtml()`:
```ts
import { formatDescriptionToHtml } from "@/lib/rich-text-utils";

// Soporta strings HTML directos, arrays de bloques DocBlock o estructuras TipTap:
const htmlClean = formatDescriptionToHtml(item.description_html || item.description_json);
```

---

## 3. Especificación de la API REST

### 3.1. Headers Obligatorios
- `Authorization: Bearer <SANCTUM_TOKEN>`
- `X-Workspace-Id: <ID_DEL_WORKSPACE>`
- `Accept: application/json`
- `Content-Type: application/json`

---

### 3.2. Crear Work Item
- **Endpoint:** `POST /api/v1/projects/{projectId}/work-items`
- **Parámetros de Descripción:** Se acepta `description_html` o `description` indistintamente.

#### Ejemplo de Petición (cURL):
```bash
curl -X POST "http://localhost:8000/api/v1/projects/1/work-items" \
  -H "Authorization: Bearer 1|tu_token_aqui" \
  -H "X-Workspace-Id: 1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "title": "Configurar pipeline de CI/CD",
    "description_html": "<h3>Criterios de Aceptación</h3><ul><li>Compilación sin errores</li><li>Pint y Pest ejecutados</li></ul>",
    "priority": "HIGH",
    "estimate_points": 5
  }'
```

---

### 3.3. Actualizar Work Item
- **Endpoint:** `PUT /api/v1/work-items/{id}` o `PATCH /api/v1/work-items/{id}`

#### Ejemplo de Petición (cURL):
```bash
curl -X PUT "http://localhost:8000/api/v1/work-items/42" \
  -H "Authorization: Bearer 1|tu_token_aqui" \
  -H "X-Workspace-Id: 1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "description_html": "<p>Se actualiza el requerimiento para incluir pruebas de penetración.</p>"
  }'
```

---

## 4. Integración con el Servidor MCP (Model Context Protocol)

El proyecto cuenta con un servidor oficial **MCP** implementado con `laravel/mcp`. Los agentes de IA (como **Cursor**, **Claude Desktop**, **Antigravity**, **VS Code** o agentes web autónomos) pueden interactuar con los Work Items de forma nativa.

### 4.1. Conexión Rápida

#### A. Stdio (Local / Host o Docker):
```bash
./scripts/mcp-server.sh
```
O directamente con Docker:
```bash
docker compose exec -T project_managment php artisan mcp:start project-management
```

#### B. HTTP / SSE (Remoto o Gateway Web):
- **URL:** `http://tu-dominio.com/mcp/project-management` (o alias `http://tu-dominio.com/api/mcp/project-management`)
- **Headers:** `Authorization: Bearer <TOKEN>`, `X-Workspace-Id: <ID>`, `Accept: application/json`.

---

### 4.2. Herramientas MCP para Work Items

#### 1. `create_work_item`
Crea una nueva tarea. Soporta texto plano, Markdown estándar o HTML puro. Si se provee Markdown, el servidor lo convierte automáticamente a HTML semántico.

- **Parámetros:**
  - `project` (string, requerido): ID o prefijo del proyecto (ej: `"ENG"` o `"1"`).
  - `title` (string, requerido): Título de la tarea.
  - `description` (string, opcional): Contenido descriptivo en HTML puro (`<p>...</p>`) o Markdown (`### Título\n- Item`).
  - `priority` (string, opcional): `'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'`.
  - `state_id`, `type_id`, `lead_id`, `cycle_id`, `module_id`, `milestone_id`, `estimate_points`.

#### Ejemplo de Llamada JSON-RPC 2.0:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_work_item",
    "arguments": {
      "project": "ENG",
      "title": "Optimizar latencia de caché Redis",
      "description": "<h3>Objetivo</h3><p>Reducir tiempo de respuesta en un 30%.</p><ul><li>Validar tags</li><li>Configurar TTL</li></ul>",
      "priority": "HIGH",
      "estimate_points": 3
    }
  }
}
```

---

#### 2. `update_work_item`
Actualiza el estado, prioridad o descripción de una tarea existente.

- **Parámetros clave:**
  - `item` (string, requerido): Clave de la tarea (ej: `"ENG-101"`) o ID numérico.
  - `description` (string, opcional): Nueva descripción en HTML puro o Markdown.
  - `state_id`, `priority`, `estimate_points`, `lead_id`, `cycle_id`.

#### Ejemplo de Llamada JSON-RPC 2.0:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "update_work_item",
    "arguments": {
      "item": "ENG-101",
      "description": "### Especificación Final\n- Se validó el endpoint\n- Cero regresiones detectadas"
    }
  }
}
```

---

#### 3. `get_work_item`
Obtiene el detalle íntegro de la tarea.

- **Parámetros:**
  - `item` (string, requerido): Clave (ej: `"ENG-101"`) o ID.
- **Respuesta:**
  Incluye el campo `description_html` y el alias `description` conteniendo el HTML puro sin dobles escapes, listo para ser consumido por un LLM o renderizado en el cliente.

---

### 4.3. Recomendaciones para Agentes de IA
1. **No escapar HTML manualmente:** Envía el HTML tal cual (`<p>texto</p>`). El backend se encarga de almacenarlo limpio en la base de datos.
2. **Markdown es bienvenido:** Si tu modelo produce Markdown por naturaleza (`## Título`, `- Lista`), envíalo directamente en el parámetro `description`. El servidor lo transformará en HTML semántico compatible con `RichTextEditor`.
3. **Consulta de tareas:** Al llamar a `get_work_item`, lee siempre `description_html` para obtener el contenido completo del requerimiento.

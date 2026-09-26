# Plane Clone — Plataforma SaaS de Gestión de Proyectos e Incidencias

Aplicación web full-stack de alto rendimiento inspirada en **Plane**, construida con arquitectura multi-tenant (workspaces), soporte integral para proyectos, estados por defecto y personalizados, etiquetas, y work items con vistas intercambiables **Kanban (Drag & Drop)** y **Lista**.

---

## 🛠️ Stack Tecnológico

- **Backend (`apps/api`):**
  - **Laravel 13** (PHP 8.4+) estructurado según el estándar corporativo `sdi_service_template`.
  - **Autenticación:** Laravel Sanctum (Tokens Bearer).
  - **Multi-Tenancy:** Aislamiento a nivel de base de datos mediante encabezado `X-Workspace-Id` y `WorkspaceScope`.
  - **Documentación API:** OpenAPI interactiva autogenerada vía Scramble en `/api/v1/docs`.
  - **Testing:** Pest PHP (38 tests unitarios y de integración con 127 aserciones).
- **Frontend (`apps/web`):**
  - **Next.js 16** (App Router, React 19, Turbopack) estructurado según el estándar corporativo `sdi_app-dynamic-reports`.
  - **UI & Estilos:** Tailwind CSS v4, Radix UI / shadcn/ui, Lucide Icons, Sonner.
  - **Drag & Drop:** `@dnd-kit/core` para tableros Kanban fluidos e interactivos.
  - **Gestión de Estado:** Zustand para workspaces y proyectos activos; React Query para cache de red.
- **Infraestructura:**
  - **PostgreSQL 16:** Base de datos relacional para multi-inquilino.
  - **Redis 7:** Cache de alto rendimiento y colas.
  - **Docker & Docker Compose:** Orquestación completa de servicios.
  - **CI/CD:** GitHub Actions workflow en `.github/workflows/ci.yml`.

---

## 🚀 Inicio Rápido con Docker

Para levantar toda la plataforma (PostgreSQL, Redis, Laravel API y Next.js Web):

```bash
# 1. Clonar el repositorio y ubicarse en el proyecto
cd /home/ubuntu/projects/project

# 2. Iniciar todos los contenedores con Docker Compose
docker compose up -d --build

# 3. Verificar estado de los servicios
docker compose ps
```

- **Frontend Web:** [http://localhost:3000](http://localhost:3000)
- **API Backend:** [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
- **Documentación OpenAPI (Scramble):** [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

---

## 💻 Ejecución en Entorno Local (Sin Docker)

### 1. Backend (`apps/api`)

```bash
cd apps/api

# Instalar dependencias PHP
composer install

# Configurar variables de entorno
cp .env.example .env
php artisan key:generate

# Ejecutar migraciones
php artisan migrate

# Ejecutar suite de pruebas Pest
./vendor/bin/pest

# Iniciar servidor local
php artisan serve --port=8000
```

### 2. Frontend (`apps/web`)

```bash
cd apps/web

# Instalar dependencias
pnpm install

# Compilar y validar tipos TypeScript
pnpm build

# Iniciar en modo desarrollo
pnpm dev
```

---

## 📋 Flujo de Trabajo y Capacidades de Fase 1

1. **Autenticación y Registro:**
   - Accede a [http://localhost:3000/login](http://localhost:3000/login).
   - En la pestaña **Registrarse**, introduce tu nombre, correo, contraseña y el nombre de tu primer Workspace (ej. *Mi Organización*).
   - El sistema crea la cuenta, provisiona el workspace inicial, asigna el rol `OWNER` y genera un token Bearer.
2. **Selector y Creación de Workspaces:**
   - En el menú lateral puedes alternar entre múltiples workspaces o crear nuevos instantáneamente.
   - Cada workspace cuenta con aislamiento total de proyectos, miembros y work items (`X-Workspace-Id`).
3. **Gestión de Proyectos:**
   - Crea un proyecto indicando su Nombre (ej. *Plataforma Core*) e Identificador (ej. *CORE*).
   - Al crearse, se auto-provisionan los **5 estados oficiales de Plane**:
     - `Backlog` (grupo: `BACKLOG`, color gris `#94a3b8`)
     - `To Do` (grupo: `UNSTARTED`, color pizarra `#64748b`)
     - `In Progress` (grupo: `STARTED`, color ámbar `#f59e0b`)
     - `Done` (grupo: `COMPLETED`, color esmeralda `#10b981`)
     - `Cancelled` (grupo: `CANCELLED`, color carmesí `#ef4444`)
4. **Gestión de Work Items y Layouts:**
   - **Vista Kanban:** Columnas por estado con soporte **Drag & Drop** interactivo usando `@dnd-kit/core`. Al arrastrar una tarjeta, el estado se sincroniza de inmediato con la API.
   - **Vista de Lista:** Tabla con cambio rápido de estado mediante selectores desplegables.
   - **Creación de Work Items:** Modal para definir título, prioridad (`URGENT`, `HIGH`, `MEDIUM`, `LOW`, `NONE`), estado inicial y puntos de estimación.
   - **Numeración Secuencial:** Cada item recibe un identificador incremental único por proyecto (ej. `CORE-1`, `CORE-2`).

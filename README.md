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

## 🚀 Inicio con Docker (Monorepo)

La plataforma cuenta con 3 composiciones Docker a nivel de raíz para cada ambiente:

### 1. Entorno Local (Laravel Sail + Hot-Reloading Nativo)
Desarrollo interactivo con recarga en vivo. El backend y los servicios auxiliares corren en Docker (Sail), mientras que el frontend corre de forma nativa en el host para garantizar Hot Module Replacement (HMR) instantáneo con Turbopack:

```bash
# 1. Iniciar backend y servicios auxiliares en Docker (Sail)
docker compose up -d

# 2. Inicializar bucket en RustFS (solo la primera vez)
docker exec project_managment php artisan storage:init-rustfs

# 3. En otra terminal, iniciar el frontend de forma nativa en el host:
cd apps/web
pnpm dev
```

- **Frontend Web (Nativo HMR):** [http://localhost:3000](http://localhost:3000)
- **API Backend:** [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
- **RustFS Consola Web:** [http://localhost:9101](http://localhost:9101) (Credenciales: `sail` / `password`)
- **Buzón Mailpit:** [http://localhost:8025](http://localhost:8025)
- **Documentación OpenAPI (Scramble):** [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

#### Comandos de Laravel Sail:
Los comandos de Sail pueden ejecutarse indistintamente desde la raíz del proyecto o desde el subdirectorio de la API:
```bash
# Desde la raíz del monorepo:
./sail ps
./sail artisan migrate
./sail test
./sail tinker

# O desde apps/api:
cd apps/api
./vendor/bin/sail ps
./vendor/bin/sail artisan migrate
./vendor/bin/sail test
```

### 2. Entorno Dev / Staging (Nginx Gateway + Arquitectura Aislada)
Emula la arquitectura de servidor real para pruebas de integración y pre-producción. Cuenta con una **Puerta de Enlace (Nginx Gateway)** como único punto de entrada expuesto, protegiendo los servicios internos (PostgreSQL, Redis, RustFS/MinIO y Mailpit):

```bash
docker compose --env-file .env.dev -f docker-compose-dev.yml up -d --build
```
- **Puerta de Enlace Unificada (Puerto 80):** [http://localhost:80](http://localhost:80) (enruta `/` a la App y `/api/` a la API)
- **Frontend Dev (Proxy Gateway):** [http://localhost:3001](http://localhost:3001)
- **API Dev (Proxy Gateway):** [http://localhost:8001/api/v1](http://localhost:8001/api/v1)
- *Servicios internos (PostgreSQL, Redis, RustFS): Aislados en `dev-network` sin exposición externa de puertos.*

### 3. Entorno Producción (Nginx Gateway + Hardened)
Despliegue de producción con OPcache inmutable, Composer `--no-dev`, Next.js standalone y Puerta de Enlace Nginx de alto rendimiento:

```bash
docker compose --env-file .env.prod -f docker-compose-prod.yml up -d --build
```
- **Puerta de Enlace Unificada (Puerto 80):** [http://localhost:80](http://localhost:80)
- **Frontend Prod (Proxy Gateway):** [http://localhost:3002](http://localhost:3002)
- **API Prod (Proxy Gateway):** [http://localhost:8002/api/v1](http://localhost:8002/api/v1)
- *Servicios internos (PostgreSQL, Redis, RustFS): Aislados en `prod-network` sin exposición externa de puertos.*

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

# SDI Service Template — Guía de Desarrollo y Microservicios

Plantilla base y scaffold oficial sobre **Laravel 13** (PHP 8.4+) orientada a la creación y estandarización de microservicios y APIs REST dentro del ecosistema **SDI**.

---

## 1. Visión General del Stack

- **Framework**: Laravel 13 (PHP 8.4+)
- **Entorno Docker / Sail**: PostgreSQL 18, Redis 7 y RustFS (almacenamiento S3-compatible)
- **Testing**: Pest v5 con soporte para SQLite en memoria y aislamiento automático
- **Documentación de API**: Scramble para generación automática OpenAPI / Swagger UI interactiva (`/api/v1/docs`, `/api/v2/docs`)
- **Filtros y Búsqueda**: `spatie/laravel-query-builder` integrado con trait `HasSearchable`
- **Caché Inteligente**: Trait `HasCacheInvalidation` con invalidación reactiva por eventos Eloquent y soporte para etiquetas (Tags)
- **Autenticación Centralizada SDI**: Middleware `auth.sdi` con soporte Bearer token, caché en Redis, headers inter-servicio y modo bypass
- **Estilo de Código**: Laravel Pint (PSR-12)

---

## 2. Inicio Rápido (Quickstart)

### Requisitos previos
- Docker Desktop o Docker Engine con Docker Compose
- PHP 8.4+ y Composer (opcional si utilizas Laravel Sail)

### Instalación paso a paso

```bash
# 1. Clonar el repositorio y acceder a la carpeta
cd /home/ubuntu/projects/sdi/sdi_service_template

# 2. Instalar dependencias de PHP
composer install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Generar clave de aplicación
php artisan key:generate

# 5. Iniciar contenedores con Laravel Sail
./vendor/bin/sail up -d

# 6. Ejecutar migraciones de base de datos
./vendor/bin/sail artisan migrate

# 7. Inicializar bucket en RustFS (S3)
./vendor/bin/sail artisan storage:init-rustfs

# 8. Ejecutar suite de pruebas
./vendor/bin/sail artisan test
```

> **Nota para desarrollo sin Docker (Host local):**
> La configuración de pruebas en `phpunit.xml` y `tests/TestCase.php` utiliza **SQLite en memoria (`:memory:`)**, lo que permite ejecutar `php artisan test` directamente en tu máquina host sin necesidad de tener PostgreSQL o Redis corriendo.

---

## 3. Arquitectura del Servicio

El servicio implementa una arquitectura de capas estricta para garantizar bajo acoplamiento, alta testabilidad y documentación OpenAPI automática.

```
┌─────────────────┐
│   HTTP Client   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│     Middleware 'auth.sdi'       │ ── (Valida Bearer / X-User-Auth-Id / Redis Cache / Bypass)
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│          FormRequest            │ ── (Valida datos de entrada + Genera docs OpenAPI vía @example)
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│     Thin Controller             │ ── (Solo inyecta el Service y devuelve el Resource tipado)
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│      Service Layer              │ ── (Lógica de negocio, transacciones DB y orquestación)
└────────┬────────────────────────┘
         │
         ├─────────────────────────────────────────┐
         ▼                                         ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│  Eloquent Model                 │       │    HasCacheInvalidation         │
│  - HasSearchable (Spatie Query) │       │  (findCached / tags / eventos)  │
└────────┬────────────────────────┘       └─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│     API Resource (JSON:API)     │ ── (Transforma la salida; Scramble infiere el schema de respuesta)
└─────────────────────────────────┘
```

### Capas y Responsabilidades

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| **Middleware** | `app/Http/Middleware/` | Autenticación centralizada SDI, resolución de usuario, CORS, etc. |
| **FormRequest** | `app/Http/Requests/{Entity}/` | Autorización, reglas de validación y documentación OpenAPI con `@example`. |
| **Controller** | `app/Http/Controllers/Api/v{n}/{Entity}/` | Controlador delgado: delega al Service y retorna el Resource correspondiente. |
| **Service** | `app/Services/` | Toda la lógica de negocio, transacciones (`DB::transaction`), consultas y mutaciones. |
| **Model** | `app/Models/` | Definición de tabla, relaciones, casting, `HasSearchable` y `HasCacheInvalidation`. |
| **Resource** | `app/Http/Resources/{Entity}/` | Formato JSON:API para respuestas estándar (`type`, `id`, `attributes`, `relationships`). |
| **Exceptions** | `app/Exceptions/` | `ApiHandlerException` convierte errores y excepciones en JSON uniforme (`HasApiResponse`). |

---

## 4. Autenticación en el Ecosistema SDI (`auth.sdi`)

El middleware `App\Http\Middleware\AuthenticateSdiUser` gestiona la autenticación de microservicios:

### Modos de Resolución:
1. **Llamadas inter-servicio (Header):**
   - Encabezado `X-User-Auth-Id` o `X-User-Id`.
   - Busca al usuario local por la columna `user_auth_id`.
2. **Token Bearer (SSO Centralizado):**
   - Lee el Bearer Token del header `Authorization: Bearer <token>`.
   - Consulta el endpoint `GET /api/v1/me` en el microservicio `sdi_auth_service`.
   - Cachea el resultado en Redis por 300 segundos (`auth_user_me_{md5}`).
   - Si el usuario no existe en la base de datos local del microservicio, lo **auto-aprovisiona** automáticamente.
3. **Bypass para Desarrollo y Pruebas:**
   - Si `AUTH_BYPASS=true` en `.env`, autentica automáticamente como usuario de desarrollo sin consultar el servicio de auth.
   - En entorno `testing`, utiliza un usuario de pruebas en memoria. Para forzar un error 401 en tests, envía el header `X-Force-Unauthenticated: true`.

### Variables de Entorno de Autenticación (`.env`):
```env
SDI_AUTH_SERVICE_URL=http://sdi_auth-service
SDI_AUTH_APPLICATION_ID=9
SDI_AUTH_USERS_ENDPOINT=/api/v1/applications/{application_id}/users
AUTH_BYPASS=false
```

---

## 5. Convenciones de Desarrollo y Buenas Prácticas

### Reglas de Oro (Do's & Don'ts)

- ✅ **SÍ: Mantén los controladores delgados (Thin Controllers).**
  El controlador únicamente inyecta el servicio en el constructor, llama al método respectivo y retorna un `Resource` o `Response`.
- ❌ **NO: Nunca escribas lógica de negocio ni consultas Eloquent directas en el controlador.**
- ✅ **SÍ: Usa FormRequests para toda entrada de datos.**
  Documenta cada regla de validación con DocBlock y etiqueta `@example`. Scramble utiliza estos comentarios para construir la documentación Swagger automáticamente.
- ✅ **SÍ: Usa `HasCacheInvalidation::findCached($id)` para lecturas individuales.**
  ```php
  // CORRECTO:
  $user = User::findCached($id);

  // PROHIBIDO:
  $user = Cache::remember("user_{$id}", 0, fn () => User::find($id)); // En Laravel, TTL=0 elimina la clave
  ```
- ✅ **SÍ: Usa `HasSearchable` para endpoints de listado.**
  Permite filtros, ordenación y paginación estándar de `spatie/laravel-query-builder`:
  ```php
  return (new User)->search(
      request: $request,
      filters: ['name', 'email'],
      relationships: [],
  );
  ```
- ✅ **SÍ: Escribe pruebas con Pest v5 para cada nuevo endpoint.**
  Valida rutas exitosas (200/201/204), errores de validación (422) y seguridad (401/403).

---

## 6. Documentación Automática OpenAPI (Scramble)

Scramble genera la especificación OpenAPI leyendo directamente el código PHP sin requerir anotaciones YAML externas:

- **Interfaz de Documentación v1**: `http://localhost/api/v1/docs`
- **Interfaz de Documentación v2**: `http://localhost/api/v2/docs`
- **JSON OpenAPI**: `/docs/v1/openapi.json`

### Cómo documentar reglas en FormRequest:
```php
public function rules(): array
{
    return [
        /**
         * Nombre completo del usuario
         *
         * @example Jhon Doe
         */
        'name' => ['required', 'string', 'max:255'],

        /**
         * Correo electrónico corporativo
         *
         * @example jhon.doe@sdi.local
         */
        'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
    ];
}
```

---

## 7. Ejemplo Práctico de Uso

La plantilla incluye una implementación de referencia completa para la entidad `User`.

### Estructura del Ejemplo:
- **Controlador**: `app/Http/Controllers/Api/v1/User/UserController.php`
- **Servicio**: `app/Services/UserService.php`
- **Peticiones**: `app/Http/Requests/User/` (`UserListRequest`, `UserCreateRequest`, `UserUpdateRequest`)
- **Recurso**: `app/Http/Resources/User/UserResource.php`
- **Modelo**: `app/Models/User.php`
- **Pruebas**: `tests/Feature/UserManagementTest.php`

### Probando los Endpoints con `curl`

#### 1. Listar usuarios (con filtro y paginación)
```bash
curl -X GET "http://localhost/api/v1/users?filter[name]=Jhon&paginate=true&limit=10" \
  -H "Accept: application/json" \
  -H "X-User-Auth-Id: 1"
```
**Respuesta:**
```json
{
  "data": [
    {
      "type": "users",
      "id": 1,
      "attributes": {
        "user_auth_id": 10,
        "name": "Jhon Doe",
        "email": "jhon.doe@sdi.local",
        "created_at": "2026-09-23T15:00:00.000000Z",
        "updated_at": "2026-09-23T15:00:00.000000Z"
      }
    }
  ]
}
```

#### 2. Crear un nuevo usuario
```bash
curl -X POST "http://localhost/api/v1/users" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-User-Auth-Id: 1" \
  -d '{
    "user_auth_id": 150,
    "name": "Maria Morales",
    "email": "maria.morales@sdi.local",
    "password": "Password123!"
  }'
```

#### 3. Obtener un usuario por ID (Cache-aside)
```bash
curl -X GET "http://localhost/api/v1/users/1" \
  -H "Accept: application/json" \
  -H "X-User-Auth-Id: 1"
```

#### 4. Actualizar usuario
```bash
curl -X PUT "http://localhost/api/v1/users/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-User-Auth-Id: 1" \
  -d '{
    "name": "Maria M. Lopez"
  }'
```

#### 5. Eliminar usuario
```bash
curl -X DELETE "http://localhost/api/v1/users/1" \
  -H "Accept: application/json" \
  -H "X-User-Auth-Id: 1"
```
**Respuesta:** `204 No Content`

---

## 8. Guía Paso a Paso: Cómo Crear un Nuevo Módulo

Sigue este flujo estándar para crear cualquier nuevo recurso (por ejemplo, `Product`):

### Paso 1: Crear el Modelo y la Migración
```bash
./vendor/bin/sail php artisan make:model Product -m
```
En el modelo `app/Models/Product.php`, implementa los traits:
```php
namespace App\Models;

use App\Traits\HasCacheInvalidation;
use App\Traits\HasSearchable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasCacheInvalidation, HasFactory, HasSearchable;

    protected $fillable = ['name', 'description', 'price', 'status'];

    public function getCacheKeyPattern(): string
    {
        return 'product_{id}';
    }

    public function getCacheTags(): array
    {
        return ['products'];
    }

    protected function shouldInvalidateCacheOnSave(): bool
    {
        return $this->isDirty(['name', 'price', 'status']);
    }
}
```

### Paso 2: Generar el Servicio con el Comando Scaffolding
```bash
./vendor/bin/sail php artisan make:service Product --model=Product --api
```
Esto genera `app/Services/ProductService.php` con los métodos CRUD estándar preconfigurados (`list`, `get`, `save`, `update`, `delete`).

### Paso 3: Crear los FormRequests
Crea `ProductCreateRequest`, `ProductUpdateRequest` y `ProductListRequest` bajo `app/Http/Requests/Product/`.
Asegúrate de agregar anotaciones `@example` en cada regla para Scramble.

### Paso 4: Crear el Resource JSON:API
```bash
./vendor/bin/sail php artisan make:resource Product/ProductResource
```
Define el método `toArray`:
```php
public function toArray(Request $request): array
{
    return [
        'type' => 'products',
        'id' => $this->id,
        'attributes' => [
            'name' => $this->name,
            'description' => $this->description,
            'price' => $this->price,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ],
    ];
}
```

### Paso 5: Crear el Controlador Delgado
Crea `app/Http/Controllers/Api/v1/Product/ProductController.php` inyectando `ProductService`:
```php
namespace App\Http\Controllers\Api\v1\Product;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\ProductCreateRequest;
use App\Http\Requests\Product\ProductListRequest;
use App\Http\Requests\Product\ProductUpdateRequest;
use App\Http\Resources\Product\ProductResource;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Response;

class ProductController extends Controller
{
    public function __construct(private ProductService $productService) {}

    public function index(ProductListRequest $request): AnonymousResourceCollection
    {
        return ProductResource::collection($this->productService->list($request));
    }

    public function store(ProductCreateRequest $request): JsonResource
    {
        return new ProductResource($this->productService->save($request));
    }

    public function show(Product $product): JsonResource
    {
        return new ProductResource($this->productService->get($product));
    }

    public function update(ProductUpdateRequest $request, Product $product): JsonResource
    {
        return new ProductResource($this->productService->update($request, $product));
    }

    public function destroy(Product $product): Response
    {
        $this->productService->delete($product);
        return response()->noContent();
    }
}
```

### Paso 6: Registrar la Ruta en `routes/api/v1.php`
```php
Route::middleware(['auth.sdi'])->group(function () {
    Route::apiResource('users', UserController::class);
    Route::apiResource('products', ProductController::class);
});
```

### Paso 7: Crear la Prueba Feature con Pest
Crea `tests/Feature/ProductTest.php` probando las operaciones CRUD y validaciones.

---

## 9. Testing con Pest v5

La suite de pruebas corre con **Pest v5**:

```bash
# Ejecutar todas las pruebas
php artisan test

# Ejecutar una prueba específica
php artisan test --filter=UserManagementTest

# Ejecutar con reporte de cobertura (si Xdebug/PCOV está activo)
php artisan test --coverage
```

### Simulando Autenticación en Pruebas
```php
// Simular respuesta del servicio central de autenticación SDI
Http::fake([
    'http://sdi_auth-service/api/v1/me' => Http::response([
        'data' => [
            'id' => 999,
            'attributes' => [
                'name' => 'Tester User',
                'email' => 'tester@sdi.local',
            ],
        ],
    ], 200),
]);

$response = $this->withToken('valid-token')->getJson('/api/v1/products');
$response->assertStatus(200);
```

---

## 10. Almacenamiento con RustFS (S3-Compatible)

RustFS corre como contenedor S3-compatible:
- **API S3**: Puerto `9100` (`http://127.0.0.1:9100`)
- **Consola Web**: Puerto `9101` (`http://localhost:9101`)
- **Credenciales por defecto**: `sail` / `password`
- **Uso en código**: `Storage::disk('rustfs')`
- **Crear bucket inicial**: `php artisan storage:init-rustfs`

---

## 11. Formateo de Código con Laravel Pint

Para mantener la consistencia del código en todo el proyecto:

```bash
# Verificar estilo sin modificar archivos
./vendor/bin/pint --test

# Corregir formato automáticamente
./vendor/bin/pint
```

---

## 12. Flujo de Trabajo y Pull Requests (`composer pr`)

El proyecto implementa un flujo colaborativo mediante **forks personales** hacia el repositorio central de la organización (`Inverpacifico-desarrollo`):

1. **Trabajar en una rama local**:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   # Realizar cambios y commits
   git commit -m "feat: implementar nueva funcionalidad"
   ```

2. **Crear Pull Request automáticamente**:
   ```bash
   # Envía cambios a tu fork y abre el PR hacia la rama 'dev' del repositorio principal
   composer pr

   # O especificar otra rama base (ej. 'main')
   composer pr main
   ```

El script [`scripts/open_pr.sh`](scripts/open_pr.sh) detecta dinámicamente tu fork en `origin`, el repositorio de destino organizacional (`upstream` o `Inverpacifico-desarrollo`), sube los cambios y genera el enlace directo de GitHub para abrir la Pull Request.

---

## 13. Integración Continua (CI Quality Gate)

Cada Pull Request hacia `dev` o `main` y cada push a `dev` ejecuta automáticamente el pipeline de GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):
- **Code Style (Pint)**: Valida que el código cumpla con los estándares PSR-12 vía `vendor/bin/pint --test`.
- **Pest Tests**: Ejecuta la suite de pruebas unitarias y funcionales con PHP 8.4 y SQLite en memoria.


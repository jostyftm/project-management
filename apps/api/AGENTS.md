# SDI Service Template — Guía de Desarrollo

> Guía completa para desarrolladores y modelos de IA que trabajen en este proyecto.

---

## 1. Project Overview

**Stack:**
- Laravel 13 (PHP 8.4+)
- Docker/Sail (PostgreSQL 18, Redis 7, RustFS)
- Pest v5 para tests
- Scramble para documentación OpenAPI
- spatie/laravel-query-builder para filtros/orden/paginación

**Propósito:** Template para desarrollo de microservicios API con arquitectura en capas.

---

## 2. Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Request   │────▶│   auth.sdi   │────▶│  FormRequest │────▶│  Controller │────▶│   Service    │────▶│    Model   │
│             │     │ (middleware) │     │  (validación │     │   (thin)    │     │   (lógica)   │     │  (Eloquent)│
└─────────────┘     └──────────────┘     │   + docs)    │     └──────┬──────┘     └──────────────┘     └──────┬─────┘
                                         └──────────────┘            │                                        │
                                                                     │                                        │
                                                                     ▼                                        ▼
                                                             ┌──────────────┐                        ┌──────────────┐
                                                             │   Resource   │                        │   Cache      │
                                                             │  (JSON:API)  │                        │ (auto-inval) │
                                                             └──────────────┘                        └──────────────┘
```

**Capas:**
- **Middleware** → `auth.sdi` (Autenticación centralizada SDI, Bearer tokens, headers inter-servicio, caché Redis)
- **Request** → FormRequest (validación + documentación Scramble con `@example`)
- **Controller** → Thin, solo delega al Service y retorna el Resource correspondiente
- **Service** → Toda la lógica de negocio y transacciones de base de datos
- **Model** → Eloquent + traits reutilizables (`HasCacheInvalidation`, `HasSearchable`)
- **Resource** → Formato JSON:API para respuestas estandarizadas

---

## 3. Directory Structure

```
app/
├── Console/Commands/
│   ├── InitRustfsBucketCommand.php      # storage:init-rustfs
│   └── MakeServiceCommand.php           # make:service
├── Exceptions/
│   └── ApiHandlerException.php          # Manejo centralizado de errores
├── Http/
│   ├── Controllers/
│   │   └── Api/v1/{Entity}/
│   │       └── {Entity}Controller.php
│   ├── Middleware/
│   │   └── AuthenticateSdiUser.php      # auth.sdi middleware
│   ├── Requests/{Entity}/
│   │   ├── {Entity}ListRequest.php
│   │   ├── {Entity}CreateRequest.php
│   │   └── {Entity}UpdateRequest.php
│   └── Resources/{Entity}/
│       ├── {Entity}Resource.php
│       └── {Entity}Collection.php
├── Models/
│   └── {Entity}.php
├── Providers/
│   ├── AppServiceProvider.php
│   └── TelescopeServiceProvider.php
├── Services/
│   └── {Entity}Service.php
└── Traits/
    ├── HasApiResponse.php
    ├── HasCacheInvalidation.php
    └── HasSearchable.php

routes/
├── api.php           # Declara versiones: v1, v2
├── api/v1.php        # Rutas de la versión 1 (protegidas con auth.sdi)
├── api/v2.php        # Rutas de la versión 2 (placeholder)
└── web.php           # Scramble UI routes

stubs/
├── service.stub      # Stub para make:service
└── crud-methods.stub # Métodos CRUD para make:service --api

tests/
├── Feature/          # Tests de integración (HTTP) con Pest v5
├── Unit/             # Tests unitarios
├── TestCase.php      # Base test case con SQLite :memory: aislado
└── Pest.php          # Configuración Pest
```

---

## 4. API Versioning

**Patrón:** Versionado por prefijo de URL con archivos de rutas separados.

```php
// routes/api.php
Route::prefix('v1')->group(base_path('routes/api/v1.php'));
Route::prefix('v2')->group(base_path('routes/api/v2.php'));
```

```php
// routes/api/v1.php
use App\Http\Controllers\Api\v1\User\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth.sdi'])->group(function () {
    Route::apiResource('users', UserController::class);
    // GET    /api/v1/users          → index
    // POST   /api/v1/users          → store
    // GET    /api/v1/users/{user}   → show
    // PUT    /api/v1/users/{user}   → update
    // DELETE /api/v1/users/{user}   → destroy
});
```

**Para agregar una nueva versión:**
1. Crear `routes/api/v3.php`
2. Agregar `Route::prefix('v3')->group(base_path('routes/api/v3.php'));` en `routes/api.php`
3. Crear controllers en `app/Http/Controllers/Api/v3/`
4. Registrar Scramble en `AppServiceProvider` y `routes/web.php`

---

## 5. Controllers

**Ubicación:** `app/Http/Controllers/Api/v{n}/{Entity}/{Entity}Controller.php`

**Convenciones:**
- Uno por recurso
- Constructor injection del Service
- Return types SIEMPRE tipados con el Resource
- NO escribir lógica de negocio

**Ejemplo completo con documentación Scramble:**

```php
<?php

namespace App\Http\Controllers\Api\v1\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\UserCreateRequest;
use App\Http\Requests\User\UserListRequest;
use App\Http\Requests\User\UserUpdateRequest;
use App\Http\Resources\User\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Response;

class UserController extends Controller
{
    public function __construct(
        private UserService $userService
    ) {}

    /**
     * List users
     *
     * Scramble lee:
     * - @param UserListRequest → genera query params desde rules()
     * - @return AnonymousResourceCollection → infiere schema desde UserResource
     *
     * @param  UserListRequest  $request
     * @return AnonymousResourceCollection
     */
    public function index(UserListRequest $request): AnonymousResourceCollection
    {
        $users = $this->userService->list($request);

        return UserResource::collection($users);
    }

    /**
     * Create a new user
     *
     * Scramble lee:
     * - @param UserCreateRequest → genera request body desde rules()
     * - @return JsonResource → infiere schema desde UserResource
     *
     * @param  UserCreateRequest  $request
     * @return JsonResource
     */
    public function store(UserCreateRequest $request): JsonResource
    {
        $user = $this->userService->save($request);

        return new UserResource($user);
    }

    /**
     * Get a user by ID
     *
     * Scramble lee:
     * - @param User → genera path parameter {user}
     * - @return JsonResource → infiere schema desde UserResource
     *
     * @param  User  $user
     * @return JsonResource
     */
    public function show(User $user): JsonResource
    {
        $user = $this->userService->get($user);

        return new UserResource($user);
    }

    /**
     * Update a user
     *
     * Scramble lee:
     * - @param UserUpdateRequest → genera request body desde rules()
     * - @param User → genera path parameter {user}
     * - @return JsonResource → infiere schema desde UserResource
     *
     * @param  UserUpdateRequest  $request
     * @param  User  $user
     * @return JsonResource
     */
    public function update(UserUpdateRequest $request, User $user): JsonResource
    {
        $user = $this->userService->update($request, $user);

        return new UserResource($user);
    }

    /**
     * Delete a user
     *
     * Scramble lee:
     * - @param User → genera path parameter {user}
     * - @return Response → documenta como 204 No Content
     *
     * @param  User  $user
     * @return Response
     */
    public function destroy(User $user): Response
    {
        $this->userService->delete($user);

        return response()->noContent();
    }
}
```

**Cómo Scramble genera la documentación:**
- **Return types** → Scramble infiere el schema de respuesta desde `UserResource::toArray()`
- **FormRequest type hints** → Scramble lee `rules()` para generar query params (GET) o request body (POST/PUT)
- **`@example` en PHPDoc** → Scramble los usa como ejemplos en la UI
- **`@return` PHPDoc** → Ayuda a Scramble a resolver tipos complejos

---

## 6. FormRequests

**Ubicación:** `app/Http/Requests/{Entity}/{Entity}{Action}Request.php`

**Convenciones:**
- `authorize()` retorna `true`
- SIEMPRE incluir `@example` en PHPDoc de cada regla para que Scramble genere documentación con ejemplos
- `messages()` para mensajes personalizados

**Ejemplo ListRequest (query params):**

```php
<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UserListRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Scramble lee cada regla para generar los query params en la documentación.
     * El PHPDoc con @example se muestra como ejemplo en la UI de Scramble.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            /**
             * Filter by name
             *
             * @example jhon
             */
            'filter.name' => ['sometimes', 'string'],

            /**
             * Filter by email
             *
             * @example jhon@mail.com
             */
            'filter.email' => ['sometimes', 'string'],

            /**
             * Sort by field (name, email)
             *
             * @example name
             */
            'sort' => ['sometimes', 'string'],

            /**
             * Enable pagination
             *
             * @example true
             */
            'paginate' => ['sometimes', 'in:true,false'],

            /**
             * Results per page
             *
             * @example 10
             */
            'limit' => ['sometimes', 'integer'],
        ];
    }
}
```

**Ejemplo CreateRequest (body):**

```php
<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UserCreateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Scramble lee cada regla para generar el request body en la documentación.
     * 'required' → campo requerido en docs
     * 'string', 'integer', 'email' → tipos inferidos
     * '@example' → ejemplos en la UI
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            /**
             * User full name
             *
             * @example Jhon Doe
             */
            'name' => ['required', 'string', 'max:255'],

            /**
             * User email address
             *
             * @example jhondoe@mail.com
             */
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],

            /**
             * User password (min 8 characters)
             *
             * @example password123
             */
            'password' => ['required', 'string', 'min:8'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => __('validation.unique', ['attribute' => 'email']),
        ];
    }
}
```

**Ejemplo UpdateRequest (body con exclusión propio ID):**

```php
<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UserUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->route('user');

        return [
            /**
             * User full name
             *
             * @example Jhon Doe
             */
            'name' => ['sometimes', 'string', 'max:255'],

            /**
             * User email address (unique except current user)
             *
             * @example jhondoe@mail.com
             */
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],

            /**
             * New password (optional)
             *
             * @example newpassword123
             */
            'password' => ['sometimes', 'string', 'min:8'],
        ];
    }
}
```

**Reglas clave para Scramble:**
| Regla | Efecto en docs |
|-------|----------------|
| `required` | Campo requerido |
| `sometimes` | Campo opcional |
| `string`, `integer`, `boolean`, `email` | Tipo inferido |
| `max:255`, `min:8` | Constraints documentados |
| `in:true,false` | Enum documentado |
| `unique:users,email` | Validación documentada |
| `@example valor` | Ejemplo en la UI |

---

## 7. Service Layer

**Ubicación:** `app/Services/{Entity}Service.php`

**Convenciones:**
- Métodos: `list`, `get`, `save`, `update`, `delete`
- Usar `HasCacheInvalidation::findCached()` en `get()`, NO `Cache::remember()`
- Aceptar `Request` (no FormRequest) para flexibilidad

**Ejemplo completo:**

```php
<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;

class UserService
{
    /**
     * List users
     *
     * Usa HasSearchable (spatie/laravel-query-builder) para filtros, orden y paginación.
     *
     * @param  Request  $request
     * @return Collection|AbstractPaginator
     */
    public function list(Request $request): Collection|AbstractPaginator
    {
        return (new User)->search(
            request: $request,
            filters: ['name', 'email'],
            relationships: [],
        );
    }

    /**
     * Get user by ID with cache
     *
     * Usa HasCacheInvalidation::findCached() para cache automático.
     * TTL=0 significa "forever" (hasta invalidación manual).
     *
     * @param  User  $user
     * @return User|null
     */
    public function get(User $user): ?User
    {
        return User::findCached($user->id);
    }

    /**
     * Create a new user
     *
     * @param  Request  $request
     * @return User
     */
    public function save(Request $request): User
    {
        $user = new User($request->validated());
        $user->password = bcrypt($request->password);
        $user->save();

        return $user;
    }

    /**
     * Update a user
     *
     * @param  Request  $request
     * @param  User  $user
     * @return User
     */
    public function update(Request $request, User $user): User
    {
        $user->update($request->validated());

        if ($request->has('password')) {
            $user->password = bcrypt($request->password);
            $user->save();
        }

        return $user;
    }

    /**
     * Delete a user
     *
     * @param  User  $user
     * @return void
     */
    public function delete(User $user): void
    {
        $user->delete();
    }
}
```

**Generator:**
```bash
./vendor/bin/sail php artisan make:service Product --model=Product --api
# Crea app/Services/ProductService.php con métodos CRUD
```

---

## 8. Models

**Ubicación:** `app/Models/{Entity}.php`

**Traits disponibles:**
- `HasCacheInvalidation` → Cache automático con invalidación
- `HasSearchable` → Filtros/orden/paginación vía spatie
- `HasFactory` → Factories para tests
- `Notifiable` → Notificaciones

**Ejemplo completo:**

```php
<?php

namespace App\Models;

use App\Traits\HasCacheInvalidation;
use App\Traits\HasSearchable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasCacheInvalidation, HasFactory, HasSearchable, Notifiable;

    /**
     * Patrón de clave de caché para el modelo User.
     * Placeholders: {model}, {id}, {key}
     */
    public function getCacheKeyPattern(): string
    {
        return 'user_{id}';
    }

    /**
     * Etiquetas de caché para invalidación masiva.
     * Solo funciona con Redis/Memcached.
     */
    public function getCacheTags(): array
    {
        return ['users'];
    }

    /**
     * Solo invalidar caché cuando atributos relevantes cambian.
     * Si retorna false, la cache se conserva.
     */
    protected function shouldInvalidateCacheOnSave(): bool
    {
        return $this->isDirty(['name', 'email', 'email_verified_at', 'user_auth_id']);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_auth_id',
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_auth_id' => 'integer',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
```

---

## 9. HasCacheInvalidation

**Ubicación:** `app/Traits/HasCacheInvalidation.php`

**Función:** Invalidación automática de caché en eventos `saved`, `deleted`, `restored`.

**Métodos configurables en el modelo:**

| Método | Default | Descripción |
|--------|---------|-------------|
| `getCacheKeyPattern()` | `{model}_{id}` | Patrón de clave |
| `getCacheTags()` | `[snake(model)]` | Tags para invalidación masiva |
| `getCacheTtl()` | `0` (forever) | TTL en segundos |
| `getCacheStoreName()` | `null` (default) | Store de caché |
| `useCacheTags()` | `true` | Habilitar tags |
| `shouldInvalidateCacheOnSave()` | `true` | Invalidar al guardar |
| `shouldInvalidateCacheOnDelete()` | `true` | Invalidar al borrar |
| `shouldInvalidateCacheOnRestore()` | `true` | Invalidar al restaurar |

**Métodos estáticos:**
```php
User::findCached($id);           // Busca con cache
User::findCached($id, 3600);     // TTL personalizado
User::invalidateAllCache();       // Flush masivo (Redis/Memcached)
```

**Métodos de instancia:**
```php
$user->invalidateCache();         // Invalida esta instancia
$user->warmCache();               // Pre-calienta cache
$user->isCached();                // Verifica si está en cache
$user->getCacheKey();             // Obtiene la clave de cache
```

**Ejemplo de uso:**
```php
// En el Service
$product = Product::findCached(1);     // Cache-aside automático
$product->save();                       // Invalida cache automáticamente

// Invalidación masiva
Product::invalidateAllCache();          // Limpia todo cache de Products
```

**Nota:** `TTL=0` usa `rememberForever()` internamente (no `remember()` con 0, que en Laravel borra la clave).

---

## 10. HasSearchable

**Ubicación:** `app/Traits/HasSearchable.php`

**Función:** Wraps spatie/laravel-query-builder para filtros, orden y paginación.

**Método:**
```php
public function search(
    Request $request,
    array $relationships = [],
    ?Closure $callback = null,
    ?array $filters = [],
    ?array $sorts = []
): QueryBuilder|Collection|AbstractPaginator
```

**Ejemplo de uso en Service:**
```php
public function list(Request $request): Collection|AbstractPaginator
{
    return (new Product)->search(
        request: $request,
        filters: ['name', 'category_id', 'price'],
        relationships: ['category'],
    );
}
```

**Query params del request:**
```
GET /api/v1/products?filter[name]=Laptop&filter[category_id]=5&sort=-price&paginate=true&limit=20
```

**Parámetros de search():**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `$request` | Request | Request HTTP con query params |
| `$relationships` | array | Relaciones a eager load |
| `$callback` | Closure\|null | Callback para customizar query |
| `$filters` | array\|null | Filtros permitidos |
| `$sorts` | array\|null | Sorts permitidos |

---

## 11. HasApiResponse

**Ubicación:** `app/Traits/HasApiResponse.php`

**Función:** Formato de respuesta JSON estandarizado.

**Métodos:**
```php
// Respuesta exitosa
return $this->successResponse($data, 200);
// → { "status": 200, "data": { ... } }

// Respuesta de error
return $this->errorResponse($errors, "Mensaje", 422);
// → { "status": 422, "message": "Mensaje", "errors": { ... } }
```

**Uso en `ApiHandlerException`:**
Todas las excepciones se convierten en respuestas JSON a través de `ApiHandlerException`, que usa `HasApiResponse`.

---

## 12. API Resources

**Ubicación:** `app/Http/Resources/{Entity}/{Entity}Resource.php`

**Función:** Transforma modelos Eloquent en formato JSON:API. **Scramble lee `toArray()` para generar el schema de respuesta en la documentación.**

**Ejemplo completo:**

```php
<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * Scramble lee este método para generar el schema de respuesta
     * en la documentación OpenAPI. Cada clave se convierte en una
     * propiedad del schema.
     *
     * - 'type' → "type": "string"
     * - 'id' → "type": "integer"
     * - 'attributes.name' → "type": "string"
     * - 'attributes.email' → "type": "string", "format": "email"
     * - 'attributes.created_at' → "type": "string", "format": "date-time"
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => 'users',
            'id' => $this->id,
            'attributes' => $this->getAttributes(),
        ];
    }

    /**
     * Get the attributes for the resource.
     *
     * @return array<string, mixed>
     */
    private function getAttributes(): array
    {
        return [
            'name' => $this->name,
            'email' => $this->email,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    /**
     * Get the relationships for the resource.
     *
     * @return array<string, mixed>
     */
    private function getRelationships(): array
    {
        return [
            // Definir relaciones aquí si se necesitan
        ];
    }
}
```

**Ejemplo para otra entidad (Product):**

```php
<?php

namespace App\Http\Resources\Product;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => 'products',
            'id' => $this->id,
            'attributes' => [
                'name' => $this->name,
                'description' => $this->description,
                'price' => $this->price,
                'category_id' => $this->category_id,
                'created_at' => $this->created_at,
                'updated_at' => $this->updated_at,
            ],
        ];
    }
}
```

**Cómo Scramble genera el schema de respuesta:**
- `type` (string) → `"type": "string"`
- `id` (integer) → `"type": "integer"`
- `attributes.name` (string) → `"type": "string"`
- `attributes.email` (string) → `"type": "string", "format": "email"`
- `attributes.price` (decimal) → `"type": "number", "format": "float"`
- `attributes.created_at` (datetime) → `"type": "string", "format": "date-time"`

---

## 13. Observers

**Ubicación:** `app/Observers/{Entity}Observer.php`

**Crear:**
```bash
./vendor/bin/sail php artisan make:observer ProductObserver --model=Product
```

**Ejemplo:**
```php
<?php

namespace App\Observers;

use App\Models\Product;

class ProductObserver
{
    public function saved(Product $product): void
    {
        // Lógica después de crear/actualizar
    }

    public function deleted(Product $product): void
    {
        // Lógica después de borrar
    }

    public function restored(Product $product): void
    {
        // Lógica después de restaurar (soft delete)
    }
}
```

**Registrar en `AppServiceProvider`:**
```php
public function boot(): void
{
    Product::observe(ProductObserver::class);
}
```

**O con attributo en el modelo (Laravel 11+):**
```php
use Illuminate\Database\Eloquent\Attributes\ObservedBy;

#[ObservedBy(ProductObserver::class)]
class Product extends Model
{
    // ...
}
```

**Nota:** `HasCacheInvalidation` ya maneja eventos `saved`, `deleted`, `restored`. Observers son para lógica adicional.

---

## 14. SDI Ecosystem Authentication (auth.sdi)

**Ubicación:** `app/Http/Middleware/AuthenticateSdiUser.php`

**Alias en `bootstrap/app.php`:** `'auth.sdi'`

**Mecanismos de resolución:**
1. **Request User**: Si ya está autenticado en la sesión o request actual.
2. **Header de Microservicio**: `X-User-Auth-Id` o `X-User-Id` para llamadas inter-servicio; busca directamente por `user_auth_id`.
3. **Bearer Token (SSO Centralizado)**:
   - Extrae el token de `Authorization: Bearer <token>`.
   - Consulta `GET /api/v1/me` en el microservicio `sdi_auth_service`.
   - Almacena en caché Redis durante 300 segundos (`auth_user_me_{md5}`).
   - Si el usuario no existe localmente, lo **auto-aprovisiona** en la tabla `users` con su `user_auth_id`, `name` y `email`.
4. **Bypass en Desarrollo y Testing**:
   - `AUTH_BYPASS=true` en `.env` permite trabajar en local creando/usando un usuario administrador local.
   - En entorno de testing, `AuthenticateSdiUser` crea o recupera automáticamente un usuario de pruebas.
   - Para simular un error 401 en pruebas, enviar el header `X-Force-Unauthenticated: true`.

**Configuración en `config/services.php`:**
```php
'sdi' => [
    'auth' => [
        'url' => env('SDI_AUTH_SERVICE_URL', 'http://sdi_auth-service'),
        'application_id' => (int) env('SDI_AUTH_APPLICATION_ID', 9),
        'users_endpoint' => env('SDI_AUTH_USERS_ENDPOINT', '/api/v1/applications/{application_id}/users'),
        'bypass' => (bool) env('AUTH_BYPASS', false),
    ],
],
```

**Testing con Pest:**
```php
it('resolves user via Bearer token calling sdi_auth_service', function () {
    Http::fake([
        'http://sdi_auth-service/api/v1/me' => Http::response([
            'data' => [
                'id' => 999,
                'attributes' => [
                    'name' => 'Mock Auth User',
                    'email' => 'mock@sdi.local',
                ],
            ],
        ], 200),
    ]);

    $response = $this->withToken('valid-token')->getJson('/api/v1/users');
    $response->assertStatus(200);
});
```

---

## 15. Scramble Documentation

**Configuración:**
```php
// config/scramble.php
'api_path' => 'api',
'servers' => [
    'Live' => env('APP_URL', 'http://127.0.0.1:8080') . '/api',
    'Prod' => env('APP_URL_PROD', 'http://127.0.0.1:8000') . '/api',
],
'middleware' => ['web', RestrictedDocsAccess::class],
```

**Rutas de documentación:**
```php
// routes/web.php
Scramble::registerUiRoute(path: '/api/v1/docs', api: 'default');
Scramble::registerUiRoute(path: '/api/v2/docs', api: 'v2');
```

**Registro de APIs:**
```php
// AppServiceProvider.php
public function register(): void
{
    Scramble::ignoreDefaultRoutes();
}

public function boot(): void
{
    Scramble::registerApi('v2', ['info' => ['version' => '2.0']])
        ->expose(ui: '/api/v2/docs', document: '/docs/v2/openapi.json');
}
```

**Pipeline de documentación:**
```
1. Route → Scramble detecta rutas bajo /api
2. Controller → Lee @return type hint para saber qué Resource usa
3. FormRequest → Lee rules() para generar query params o request body
4. Resource → Lee toArray() para generar response schema
5. PHPDoc @example → Agrega ejemplos en la UI
```

**Acceso:**
- Local: `http://localhost:8000/api/v1/docs`
- Producción: `https://tu-dominio.com/api/v1/docs`

---

## 16. Testing

**Framework:** Pest v5 con `RefreshDatabase` automático y SQLite en memoria (`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`).

**Configuración (`tests/Pest.php`):**
```php
pest()->extend(Tests\TestCase::class)
    ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->in('Feature', 'Unit');
```

**Ejemplo Test Unitario:**
```php
<?php

use App\Models\User;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Cache::flush();
});

it('findCached retrieves from database and caches the result', function () {
    $user = User::factory()->create(['id' => 99, 'name' => 'Test User']);

    $cached = User::findCached(99);

    expect($cached)->not->toBeNull();
    expect($cached->id)->toBe(99);
    expect($cached->name)->toBe('Test User');
    expect(Cache::has('user_99'))->toBeTrue();
});

it('findCached returns cached value on subsequent calls', function () {
    $user = User::factory()->create(['id' => 100, 'name' => 'First']);

    // First call - hits database
    $cached1 = User::findCached(100);
    expect($cached1->name)->toBe('First');

    // Update in database directly (bypassing model events)
    User::where('id', 100)->update(['name' => 'Second']);

    // Second call - should return cached value
    $cached2 = User::findCached(100);
    expect($cached2->name)->toBe('First');
});
```

**Ejemplo Test Feature (HTTP):**
```php
<?php

it('creates a user successfully', function () {
    $response = $this->postJson('/api/v1/users', [
        'name' => 'Jhon Doe',
        'email' => 'jhondoe@mail.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(201)
        ->assertJsonFragment(['name' => 'Jhon Doe']);
});

it('validates required fields', function () {
    $response = $this->postJson('/api/v1/users', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'email', 'password']);
});
```

**Ejecutar tests:**
```bash
./vendor/bin/sail php artisan test                    # Todos
./vendor/bin/sail php artisan test --filter=UserManagementTest  # Específico
```

---

## 17. Database

**Migrations (Laravel 13 anonymous class pattern):**
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new Migration extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->foreignId('category_id')->constrained();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
```

**Factories:**
```php
<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'description' => fake()->paragraph(),
            'price' => fake()->randomFloat(2, 10, 1000),
            'category_id' => Category::factory(),
        ];
    }
}
```

**Seeders:**
```php
<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        Product::factory(50)->create();
    }
}
```

---

## 18. Console Commands

**Generator para Services:**
```bash
./vendor/bin/sail php artisan make:service {Name} --model={Model} --api
```

**Ejemplo:**
```bash
./vendor/bin/sail php artisan make:service Product --model=Product --api
# Crea app/Services/ProductService.php con métodos CRUD
```

**Custom commands:**
```bash
./vendor/bin/sail php artisan storage:init-rustfs  # Crea bucket en RustFS
```

**Crear command custom:**
```bash
./vendor/bin/sail php artisan make:command {CommandName}
# Crea app/Console/Commands/{CommandName}.php
```

---

## 19. Docker/Sail Services

**Servicios disponibles:**

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `laravel.test` | 8000 | PHP 8.5 + Laravel |
| `pgsql` | 5432 | PostgreSQL 18 |
| `redis` | 6379 | Redis 7 |
| `rustfs` | 9100 (API) | RustFS (S3-compatible) |
| `rustfs` | 9101 (Console) | RustFS Web Console |

**Credenciales RustFS:**
- Usuario: `sail`
- Contraseña: `password`
- Bucket: `sail`
- Endpoint: `http://rustfs:9000` (dentro de Docker) / `http://127.0.0.1:9100` (host)

**Comandos útiles:**
```bash
./vendor/bin/sail up -d              # Levantar servicios
./vendor/bin/sail down               # Detener servicios
./vendor/bin/sail logs -f            # Ver logs
./vendor/bin/sail php artisan ...    # Ejecutar artisan
./vendor/bin/sail npm install        # Instalar dependencias
```

---

## 20. Code Style

**Laravel Pint:**
```bash
# Verificar estilo
./vendor/bin/sail php vendor/bin/pint --test

# Aplicar correcciones
./vendor/bin/sail php vendor/bin/pint
```

**Convenciones:**
- PHPDoc blocks en métodos públicos
- `@return` type hints siempre presentes
- `@param` para parámetros complejos
- `@example` en FormRequests para Scramble

---

## 21. Environment Setup

**Quickstart:**
```bash
# 1. Clonar repo
git clone <repo-url>
cd sdi_service_template

# 2. Instalar dependencias
composer install

# 3. Configurar .env
cp .env.example .env
php artisan key:generate

# 4. Levantar servicios
./vendor/bin/sail up -d

# 5. Ejecutar migraciones
./vendor/bin/sail php artisan migrate

# 6. Inicializar RustFS
./vendor/bin/sail php artisan storage:init-rustfs
```

**Variables importantes en `.env`:**
```env
APP_LOCALE=es
APP_TIMEZONE=America/Bogota
DB_CONNECTION=pgsql
DB_HOST=pgsql
DB_DATABASE=sdi_service
CACHE_STORE=redis
QUEUE_CONNECTION=redis
FILESYSTEM_DISK=rustfs

# RustFS
RUSTFS_ACCESS_KEY=sail
RUSTFS_SECRET_KEY=password
RUSTFS_BUCKET=sail
RUSTFS_ENDPOINT=http://rustfs:9000

# SDI Auth Service
SDI_AUTH_SERVICE_URL=http://sdi_auth-service
SDI_AUTH_APPLICATION_ID=9
SDI_AUTH_USERS_ENDPOINT=/api/v1/applications/{application_id}/users
AUTH_BYPASS=false
```

---

## 22. Adding a New Resource (Step-by-Step)

**Ejemplo: Agregar entidad `Product`**

### Paso 1: Model + Migration + Factory
```bash
./vendor/bin/sail php artisan make:model Product -m
# Crea app/Models/Product.php y database/migrations/..._create_products_table.php

# Editar migration con campos
# Crear factory en database/factories/ProductFactory.php
```

### Paso 2: Service
```bash
./vendor/bin/sail php artisan make:service Product --model=Product --api
# Crea app/Services/ProductService.php
# Editar para agregar filtros en list(), lógica en save(), etc.
```

### Paso 3: FormRequests
```bash
./vendor/bin/sail php artisan make:request ProductListRequest
./vendor/bin/sail php artisan make:request ProductCreateRequest
./vendor/bin/sail php artisan make:request ProductUpdateRequest
# Mover a app/Http/Requests/Product/
# Agregar @example en PHPDoc de cada regla
```

### Paso 4: Resource
```bash
./vendor/bin/sail php artisan make:resource ProductResource
# Mover a app/Http/Resources/Product/
# Definir campos en toArray()
```

### Paso 5: Controller
```bash
./vendor/bin/sail php artisan make:controller Api/v1/Product/ProductController
# Crear métodos: index, store, show, update, destroy
# Constructor injection de ProductService
# Return types con ProductResource
```

### Paso 6: Ruta
```php
// routes/api/v1.php
use App\Http\Controllers\Api\v1\Product\ProductController;

Route::middleware(['auth.sdi'])->group(function () {
    Route::apiResource('products', ProductController::class);
});
```

### Paso 7: Tests
```bash
./vendor/bin/sail php artisan make:test ProductTest --pest
# Crear tests en tests/Feature/ProductTest.php
```

### Paso 8: Verificar Documentación
```bash
# Abrir http://localhost:8000/api/v1/docs
# Verificar que los endpoints aparecen con schema correcto
```

---

## 23. Naming Conventions Table

| Capa | Ubicación | Naming | Ejemplo |
|------|-----------|--------|---------|
| Controller | `app/Http/Controllers/Api/v{n}/{Entity}/` | `{Entity}Controller` | `UserController` |
| Request (List) | `app/Http/Requests/{Entity}/` | `{Entity}ListRequest` | `UserListRequest` |
| Request (Create) | `app/Http/Requests/{Entity}/` | `{Entity}CreateRequest` | `UserCreateRequest` |
| Request (Update) | `app/Http/Requests/{Entity}/` | `{Entity}UpdateRequest` | `UserUpdateRequest` |
| Service | `app/Services/` | `{Entity}Service` | `UserService` |
| Model | `app/Models/` | `{Entity}` | `User` |
| Resource | `app/Http/Resources/{Entity}/` | `{Entity}Resource` | `UserResource` |
| Collection | `app/Http/Resources/{Entity}/` | `{Entity}Collection` | `UserCollection` |
| Observer | `app/Observers/` | `{Entity}Observer` | `UserObserver` |
| Factory | `database/factories/` | `{Entity}Factory` | `UserFactory` |
| Migration | `database/migrations/` | `{timestamp}_{action}_{table}` | `2024_01_01_000000_create_users_table` |
| Test (Feature) | `tests/Feature/` | `{Feature}Test.php` | `UserManagementTest.php` |
| Test (Unit) | `tests/Unit/` | `{Feature}Test.php` | `HasCacheInvalidationTest.php` |

---

## 24. Prompt para Modelos de IA

Copia y pega este prompt al inicio de tu conversación cuando trabajes en este proyecto:

---

**PROMPT:**

```
Eres un desarrollador senior trabajando en un proyecto Laravel 13 + PHP 8.4+ con la
siguiente arquitectura. DEBES seguir estas convenciones EXACTAMENTE:

### Stack
- Laravel 13, PHP 8.4+, Docker/Sail (pgsql, redis, rustfs)
- Pest v5 para tests
- Scramble para documentación OpenAPI (auto-generada desde código)
- spatie/laravel-query-builder para filtros/orden/paginación

### Arquitectura en Capas
Request → FormRequest → Controller (thin) → Service (lógica) → Model → Resource (JSON:API)

### Convenciones de Código

1. **Controllers**: Uno por recurso en `app/Http/Controllers/Api/v{n}/{Entity}/`.
   Constructor injection del Service. Return types SIEMPRE tipados con el Resource.
   NO escribir lógica de negocio en controllers.

2. **FormRequests**: En `app/Http/Requests/{Entity}/`, naming `{Entity}{Action}Request`.
   SIEMPRE incluir `@example` en PHPDoc de cada regla para que Scramble genere
   documentación con ejemplos. `authorize()` retorna `true`.

3. **Services**: En `app/Services/{Entity}Service.php`. Métodos: `list`, `get`, `save`,
   `update`, `delete`. Usar `HasCacheInvalidation::findCached()` en `get()`, NO
   `Cache::remember()`.

4. **Models**: En `app/Models/`. Usar traits: `HasCacheInvalidation`, `HasFactory`,
   `HasSearchable`. Configurar `getCacheKeyPattern()`, `getCacheTags()`,
   `shouldInvalidateCacheOnSave()`.

5. **Resources**: En `app/Http/Resources/{Entity}/`. Formato JSON:API con `type`, `id`,
   `attributes`. Scramble lee `toArray()` para generar response schema.

6. **Rutas**: En `routes/api/v{n}.php`. Usar `Route::apiResource()`.

7. **Tests**: Pest v5 en `tests/Feature/` y `tests/Unit/`. `RefreshDatabase` automático.

### Documentación Scramble
Scramble genera docs AUTOMÁTICAMENTE desde:
- **FormRequest::rules()** → query params (GET) o body schema (POST/PUT)
- **PHPDoc @example** → ejemplos en la UI
- **Controller return types** → schema de respuesta
- **Resource::toArray()** → estructura del response

Para que la documentación sea completa, SIEMPRE:
- Tipar return types en controllers con el Resource
- Incluir @example en cada regla de FormRequest
- Definir todos los campos en Resource::toArray()

### Comandos Útiles
./vendor/bin/sail php artisan make:service {Name} --model={Model} --api
./vendor/bin/sail php artisan test
./vendor/bin/sail php vendor/bin/pint

### No Hacer
- NO usar Cache::remember() directamente (usar trait HasCacheInvalidation)
- NO escribir lógica de negocio en controllers
- NO crear controllers sin FormRequest asociado
- NO usar return types genéricos (siempre el Resource específico)
- NO olvidar @example en PHPDoc de FormRequests

### Flujo de Desarrollo
Al crear un nuevo recurso, SIEMPRE sigue este orden:
1. Crear Migration + Model + Factory
2. Crear Service con make:service --api
3. Crear FormRequests (con @example para Scramble)
4. Crear Resource (con campos documentados)
5. Crear Controller (con return types tipados)
6. Agregar ruta en routes/api/v{n}.php
7. Escribir tests
8. Verificar documentación Scramble en /api/v{n}/docs
```

---

## 25. Workflow de Colaboración Git & CI (`composer pr`)

**Modelo de Trabajo:**
- Cada desarrollador clona/hace fork a su cuenta personal en GitHub.
- El upstream organizacional oficial es `Inverpacifico-desarrollo`.

**Comandos de Pull Request:**
```bash
# Sube cambios a tu fork (origin) y genera el enlace del PR hacia 'dev' en Inverpacifico-desarrollo:
composer pr

# O hacia la rama 'main':
composer pr main
```

**Quality Gate Automatizado (.github/workflows/ci.yml):**
Todo Pull Request hacia `dev` o `main` debe superar obligatoriamente:
1. `Code Style (Pint)`: `./vendor/bin/pint --test`
2. `Pest Tests`: `./vendor/bin/pest`

---

> **Nota:** Este `AGENTS.md` es la fuente de verdad para el desarrollo en este proyecto. Siempre consulta esta guía antes de implementar cualquier funcionalidad.

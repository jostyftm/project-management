<?php

namespace App\Traits;

use Illuminate\Contracts\Cache\Repository;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Trait HasCacheInvalidation
 *
 * Proporciona invalidación automática de caché para modelos Eloquent
 * cuando se guardan, borran o restauran. Soporta patrones de clave
 * personalizados, etiquetas (tags) para invalidación masiva, TTL
 * configurable y múltiples stores de caché.
 *
 * @example
 * ```php
 * class User extends Model {
 *     use HasCacheInvalidation;
 *
 *     protected function getCacheKeyPattern(): string { return 'user_{id}'; }
 *     protected function getCacheTags(): array { return ['users']; }
 *     protected function getCacheTtl(): int { return 3600; }
 *
 *     protected function shouldInvalidateCacheOnSave(): bool {
 *         return $this->isDirty(['name', 'email']);
 *     }
 * }
 *
 * // Uso en service:
 * $user = User::findCached(1);      // Obtiene del cache o BD
 * $user->save();                    // Invalida cache automáticamente
 * User::invalidateAllCache();       // Limpia todo cache de User
 * ```
 */
trait HasCacheInvalidation
{
    /**
     * Registra los eventos del modelo para invalidación automática.
     *
     * Eventos escuchados:
     * - `saved`    → creación y actualización (create + update)
     * - `deleted`  → borrado suave y forzado
     * - `restored` → restauración de soft delete (solo si usa SoftDeletes)
     */
    protected static function bootHasCacheInvalidation(): void
    {
        static::saved(function (Model $model): void {
            if ($model->shouldInvalidateCacheOnSave()) {
                $model->invalidateCache();
            }
        });

        static::deleted(function (Model $model): void {
            if ($model->shouldInvalidateCacheOnDelete()) {
                $model->invalidateCache();
            }
        });

        // Solo registrar restored si el modelo usa SoftDeletes
        if (in_array(SoftDeletes::class, class_uses(static::class), true)) {
            static::restored(function (Model $model): void {
                if ($model->shouldInvalidateCacheOnRestore()) {
                    $model->invalidateCache();
                }
            });
        }
    }

    /**
     * Determina si invalidar caché al guardar el modelo.
     *
     * Sobrescribe para lógica condicional (ej. solo si atributos
     * específicos cambiaron con `$this->isDirty([...])`).
     *
     * @return bool `true` para invalidar, `false` para conservar caché
     */
    protected function shouldInvalidateCacheOnSave(): bool
    {
        return true;
    }

    /**
     * Determina si invalidar caché al borrar el modelo.
     *
     * @return bool `true` para invalidar, `false` para conservar caché
     */
    protected function shouldInvalidateCacheOnDelete(): bool
    {
        return true;
    }

    /**
     * Determina si invalidar caché al restaurar (soft delete).
     *
     * @return bool `true` para invalidar, `false` para conservar caché
     */
    protected function shouldInvalidateCacheOnRestore(): bool
    {
        return true;
    }

    /**
     * Obtiene el patrón de clave de caché configurado.
     *
     * Placeholders disponibles:
     * - `{model}` → nombre del modelo en snake_case (ej. "user")
     * - `{id}`    → clave primaria del modelo
     * - `{key}`   → alias de `{id}`
     *
     * @return string Patrón con placeholders (ej. "user_{id}")
     */
    public function getCacheKeyPattern(): string
    {
        return '{model}_{id}';
    }

    /**
     * Obtiene las etiquetas de caché para este modelo.
     *
     * @return array<int, string> Lista de tags (ej. ['users'])
     */
    public function getCacheTags(): array
    {
        return [Str::snake(class_basename(static::class))];
    }

    /**
     * Indica si se deben usar etiquetas (tags) para el caché.
     *
     * Se desactiva automáticamente si el store no soporta tags.
     */
    protected function useCacheTags(): bool
    {
        return true;
    }

    /**
     * Obtiene el nombre del store de caché a utilizar.
     *
     * `null` usa el store por defecto (`config('cache.default')`).
     * Ejemplos: `'redis'`, `'memcached'`, `'database'`, `'file'`.
     */
    protected function getCacheStoreName(): ?string
    {
        return null;
    }

    /**
     * Obtiene el TTL (time to live) en segundos para entradas de caché.
     *
     * `0` = forever (hasta invalidación manual).
     * Valores positivos = segundos hasta expiración.
     */
    public function getCacheTtl(): int
    {
        return 0;
    }

    /**
     * Genera la clave de caché para la instancia actual.
     *
     * Reemplaza placeholders en `getCacheKeyPattern()`:
     * - `{model}` → snake_case del nombre de clase (ej. "user")
     * - `{id}` / `{key}` → valor de `$this->getKey()`
     *
     * @return string Clave de caché formateada (ej. "user_1")
     */
    public function getCacheKey(): string
    {
        $pattern = $this->getCacheKeyPattern();
        $modelName = Str::snake(class_basename(static::class));

        return str_replace(
            ['{model}', '{id}', '{key}'],
            [$modelName, $this->getKey(), $this->getKey()],
            $pattern
        );
    }

    /**
     * Obtiene la instancia del store de caché configurado.
     *
     * @return Repository Store de caché
     */
    protected function getCacheStore(): Repository
    {
        $storeName = $this->getCacheStoreName();

        return $storeName ? Cache::store($storeName) : Cache::store();
    }

    /**
     * Verifica si el store actual soporta etiquetas (tags).
     *
     * Comprueba:
     * 1. `useCacheTags()` esté habilitado
     * 2. Driver sea 'redis' o 'memcached'
     *
     * @return bool `true` si soporta tags
     */
    protected function cacheStoreSupportsTags(): bool
    {
        if (! $this->useCacheTags()) {
            return false;
        }

        $store = $this->getCacheStore()->getStore();

        if (! method_exists($store, 'getDriverName')) {
            return false;
        }

        $driver = $store->getDriverName() ?? '';

        return in_array($driver, ['redis', 'memcached'], true);
    }

    /**
     * Invalida la entrada de caché para esta instancia del modelo.
     *
     * Usa tags si están disponibles, sino clave directa.
     */
    public function invalidateCache(): void
    {
        $key = $this->getCacheKey();
        $store = $this->getCacheStore();

        if ($this->cacheStoreSupportsTags()) {
            $store->tags($this->getCacheTags())->forget($key);
        } else {
            $store->forget($key);
        }
    }

    /**
     * Invalida TODO el caché asociado a este tipo de modelo.
     *
     * Requiere store con soporte de tags (Redis/Memcached).
     * Sin tags, no hay forma eficiente de invalidar masivamente.
     */
    public static function invalidateAllCache(): void
    {
        $store = Cache::store();
        $tags = [Str::snake(class_basename(static::class))];

        $driverStore = $store->getStore();
        $supportsTags = method_exists($driverStore, 'getDriverName')
            && in_array($driverStore->getDriverName() ?? '', ['redis', 'memcached'], true);

        if ($supportsTags) {
            $store->tags($tags)->flush();
        }
    }

    /**
     * Resolve cache store without triggering model boot events.
     */
    private static function resolveCacheStore(): Repository
    {
        $model = new static;
        $storeName = $model->getCacheStoreName();

        return $storeName ? Cache::store($storeName) : Cache::store();
    }

    /**
     * Busca un modelo por ID usando caché automático.
     *
     * Si existe en caché → lo devuelve.
     * Si no existe → consulta BD, guarda en caché y lo devuelve.
     *
     * @param  mixed  $id  ID del modelo a buscar
     * @param  int|null  $ttl  TTL específico (sobrescribe `getCacheTtl()`)
     * @return static|null Instancia del modelo o `null` si no existe
     */
    public static function findCached(mixed $id, ?int $ttl = null): ?static
    {
        $model = new static;
        $key = str_replace(
            ['{model}', '{id}', '{key}'],
            [Str::snake(class_basename(static::class)), $id, $id],
            $model->getCacheKeyPattern()
        );

        $ttl = $ttl ?? $model->getCacheTtl();
        $store = $model->getCacheStore();

        if ($model->cacheStoreSupportsTags()) {
            $taggedStore = $store->tags($model->getCacheTags());

            return $ttl > 0
                ? $taggedStore->remember($key, $ttl, fn () => static::find($id))
                : $taggedStore->rememberForever($key, fn () => static::find($id));
        }

        return $ttl > 0
            ? $store->remember($key, $ttl, fn () => static::find($id))
            : $store->rememberForever($key, fn () => static::find($id));
    }

    /**
     * Precalienta (warm) el caché para esta instancia.
     *
     * Guarda la instancia actual en caché con el TTL configurado.
     * Útil después de crear/actualizar para evitar primer miss.
     *
     * @return static `$this` para encadenamiento
     */
    public function warmCache(): static
    {
        $key = $this->getCacheKey();
        $store = $this->getCacheStore();
        $ttl = $this->getCacheTtl();

        if ($this->cacheStoreSupportsTags()) {
            $taggedStore = $store->tags($this->getCacheTags());
            if ($ttl > 0) {
                $taggedStore->put($key, $this, $ttl);
            } else {
                $taggedStore->forever($key, $this);
            }
        } else {
            if ($ttl > 0) {
                $store->put($key, $this, $ttl);
            } else {
                $store->forever($key, $this);
            }
        }

        return $this;
    }

    /**
     * Verifica si esta instancia está actualmente en caché.
     *
     * @return bool `true` si existe en caché, `false` en caso contrario
     */
    public function isCached(): bool
    {
        $key = $this->getCacheKey();
        $store = $this->getCacheStore();

        if ($this->cacheStoreSupportsTags()) {
            return $store->tags($this->getCacheTags())->has($key);
        }

        return $store->has($key);
    }
}

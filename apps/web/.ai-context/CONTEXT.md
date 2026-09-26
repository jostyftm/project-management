# Contexto del Proyecto — Reportes Dinámicos

Este documento está pensado para que un agente de IA que retome el trabajo
entienda dos cosas de forma **separada**:

1. **Sección 1 — Contexto del proyecto**: el ecosistema, arquitectura de URLs,
   convenciones y patrones que debe respetarse al tocar el código (sin acciones).
2. **Sección 2 — Trabajo realizado**: historial cronológico de lo implementado,
   con archivos tocados y verificación.

---

# Sección 1 — Contexto del proyecto

## Repos involucrados

- **Frontend** — `sdi_app-dynamic-reports`
  - Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS.
  - `zustand` (estado global), `@tanstack/react-query`, `react-hook-form` + `zod` (v4),
    `shadcn/ui` (componentes en `components/ui/`).
  - Las rutas de negocio viven bajo `app/(dashboard)/...`.
- **Backend** — `sdi_dynamic-reports-service`
  - Laravel (API resource / JSON), controladores en `app/Http/Controllers/Api/v1/`,
    servicios en `app/Services/`, requests en `app/Http/Requests/`,
    resources en `app/Http/Resources/`, rutas en `routes/api/v1.php`.

## Arquitectura de URLs / servicios

- `WEB_URL = NEXT_PUBLIC_API_URL`.
- `API_URL(service, version)` → `${WEB_URL}/${service}/api/${version}`.
  - Ej.: `API_URL('report', 'v1')` → `https://backen.ganebyd.local/report/api/v1`.
- Cada servicio tiene su prefijo dentro de `NEXT_PUBLIC_API_URL`:
  `/report`, `/auth`, `/company`, `/audit`.
- `config/enviroments.ts`:
  - `REPORT_API_VERSION_URL` **fue eliminada** (ya no existe).
  - `REPORT_API_URL` **se mantiene** porque `lib/axios-report.ts` la usa como `baseURL`.

## Endpoints backend relevantes (`backen.ganebyd.local`)

- `users`
- `database-connections` (CRUD) + `POST database-connections/test`
- `reports` (CRUD) + `reports/{id}/dry-run`, `reports/{id}/headers` (GET/PUT),
  `reports/{id}/parameters`
- `report-schedules` (CRUD)
- `report-executions` (index/show) — no incluye Formato/Destino (limitación de API).

## Credenciales de prueba

- Token Bearer de ejemplo: `89|8UJvu29mqrag9GR7WYUVnCStwbwU5dx0CNDijQPs1c3da155`.
- Login fallback: POST `/auth/api/v1/login` con
  `username: CC_1111798455`, `password: 123456789`.

## PATRÓN CRÍTICO DE API (causa recurrente de bugs)

`lib/request-report.ts` (`reportRequestService<T>`) resuelve con `resp.data`,
es decir, el **objeto JSON completo** que devuelve Laravel, **sin desempacar la
clave `data`**.

- Recurso individual → `{ data: {...recurso} }` → para leer el recurso hay que
  acceder a `res.data` (tipar el service con `ApiResponse<T>` de
  `@/types/paginate` y desempacar en el hook).
- Lista → `{ data: [...], meta, links }` → tipar con `PaginatedResponse<T>`; el
  hook ya hace `data?.data`.

Regla práctica: **un resource individual (`store`, `update`, `show`, `dry-run`, etc.)
envuelve el payload en `.data`. No asumas que el body ya es el objeto de negocio.**

Formato de error: `ApiErrorException` con campos `status`, `message`, `errors`.
`getReportByIdService` devuelve el reporte **con** `name`, `description`, `category`,
`sql_query` (en `attributes`) y `connection_id`/`connection`/`parameters`/`headers`
(en `relationships`).

## Decisiones y convenciones

- **Sin PermissionGuard**: no se usa para ocultar funcionalidad.
- **Tabs de `/reports` manuales** (no `PageTabs`) porque `useCheckHasPermission`
  retorna `false` sin permisos (ocultaría las pestañas).
- **Zod v4**: `required_error` NO existe (renombrado a `error`). Usar
  `z.string().min(1)` para IDs de select; convertir a `Number()` al enviar.
  Evitar `z.coerce` / `z.preprocess` (rompen el resolver por `unknown`).
- **Páginas de listado** envuelven filtros con `params={{ params }}`
  (`PaginateResourcesProps`).
- **Conservación de password en edición de conexiones**: el backend `update()`
  omite el password si llega vacío (`empty()` → `unset`); no sobrescribir.
  El cast del modelo encripta el password al asignarse y `decryptPassword()` lo lee.

---

# Sección 2 — Trabajo realizado

> Orden cronológico. Cada ítem: qué se hizo, dónde, y cómo se verificó.

## 1. Fix warning React “uncontrolled → controlled” en creación de conexión

- **Problema**: `defaultValues` incompletos en `useForm` dejaban varios inputs en
  `undefined`; al seleccionar un driver el form se remontaba (`key={driverCode}`) e
  inputs pasaban de uncontrolled a controlled.
- **Cambio**: `app/(dashboard)/setting/connections/hooks/use-connection-actions.ts`
  — `defaultValues` ahora trae todas las claves en `""` fusionadas con `...values`
  (`...values` al final para que la edición sobreescriba). Se limpió el import `z`
  sin uso.

## 2. Botón “Probar conexión” antes de guardar (backend + frontend)

- **Backend**:
  - `DatabaseConnectionTestRequest.php` (nuevo): valida `database_driver_id`
    (required) + campos nullable, **sin** `name`.
  - `DatabaseConnectionService::test()`: crea un `DatabaseConnection` **sin
    persistir**, carga la relación `driver`, inyecta config vía
    `ConnectionBuilderFactory` y valida con `DB::connection(...)->getPdo()`;
    limpia en `finally` (`DB::purge`).
  - `DatabaseConnectionController::test()`: captura `Throwable` → `422 {message}`
    (caso especial para `could not find driver`).
  - Ruta `POST api/v1/database-connections/test` registrada **antes** de
    `apiResource` (para que `test` no la capture `show`).
- **Frontend**:
  - `connection-service.ts`: `ConnectionTestValues` + `testConnectionService`.
  - `use-test-connection.ts` (nuevo): `useMutation` con toast de éxito.
  - `ConnectionFormInner.tsx`: botón “Probar conexión” (tipo `button`, spinner);
    toast de error con mensaje del backend (`error.message` vía `ApiErrorException`).

## 3. Fix 405 “The method is invalid” al actualizar una conexión

- **Causa**: `driverCredentials()` en el diálogo de edición no incluía `id`, por lo
  que al guardar la URL quedaba `PUT database-connections/` (sin id). Esa URI solo
  soporta `POST` (store) → `MethodNotAllowedHttpException` → 405. Era un bug
  preexistente, no de los cambios de esta sesión.
- **Cambio**: `GeneralDialogConnection.tsx` — agregado `id: String(connection.id)`
  al retorno de `driverCredentials()` (y tipo `id: string`).

## 4. Fix prueba de conexión en edición con password en blanco

- **Problema**: al editar, si el password va en blanco (placeholder “conservar la
  actual”), el test fallaba con `no password supplied` porque el endpoint construía
  un objeto nuevo con password vacío.
- **Cambio**:
  - `DatabaseConnectionTestRequest`: campo opcional `id` (exists).
  - `DatabaseConnectionService::test()`: si llega `id` y `password` vacío, carga la
    conexión persistida, usa su `decryptPassword()` y completa campos vacíos
    (host/port/db_name/schema/username/tns_string) desde el registro guardado.
  - `connection-service.ts`: `ConnectionTestValues.id`.
  - `ConnectionFormInner.tsx`: `handleTestConnection` envía `id: formValues.id`.
- **Comportamiento**: creación usa el password escrito; edición con password en
  blanco usa el guardado; edición con password nuevo usa el escrito.

## 5. Fix bug sistemático de desempaquetado (`.data`) en módulo de reportes

- **Problema**: `reportRequestService` no desempaca `.data`; los services de recurso
  individual tipaban `Report` directo, así que `saved.id` era `undefined` y el
  dry-run llamaba `reports/undefined/dry-run` → 500 PostgreSQL (bigint `undefined`).
- **Cambio** (`app/(dashboard)/reports/`):
  - `services/report-service.ts`: `saveReportService`, `updateReportService`,
    `getReportByIdService` → `ApiResponse<Report>`; `dryRunReportService`,
    `getReportHeadersService`, `syncReportHeadersService` → `ApiResponse<...[]>`.
  - `hooks/use-report-actions.ts`: `saveReport` retorna `res?.data`.
  - `hooks/use-report-by-id.ts`: devuelve `res.data`.
  - `hooks/use-dry-run.ts`: `onSuccess` usa `res.data` (array de columnas).
- **Efecto**: dry-run con id real, `StepSummary` muestra datos, `StepHeaderMapping`
  recibe el array de columnas correcto.

## 6. Wizard de reportes de modal → página completa

- **Motivo**: el modal era poco responsivo; el textarea de SQL y el botón se
  desbordaban del modal.
- **Cambios**:
  - Nuevas rutas: `app/(dashboard)/reports/new/page.tsx` (create) y
    `app/(dashboard)/reports/[id]/edit/page.tsx` (update), ambas usando
    `CardHomePage` (`backRoute="/reports"`, título, Card con scroll propio).
  - `components/wizard/ReportWizard.tsx`: prop `mode: "create" | "update"` y
    navegación con `next/navigation`; ya no recibe `closeModal`.
  - `StepSqlConnection.tsx`: sin `closeModal`; botón “Crear/Guardar y Validar”
    derivado de `isUpdate`; tras validar → `setStep("headers")`.
  - `StepHeaderMapping.tsx`: sin `closeModal`; **eliminado el `useEffect` que
    causaba `set-state-in-effect`** (`localHeaders` ahora con inicializador lazy).
  - `StepSummary.tsx`: sin `closeModal`; prop `mode`. En **create**, “Finalizar y
    Editar” → `router.replace('/reports/{reportId}/edit')` (ir al edit del reporte).
    En **update**, “Finalizar” → `router.replace('/reports')`. Llama `reset()`
    del store antes de navegar.
  - Entradas redirigidas: `page.tsx` botón “Crear reporte” → `router.push('/reports/new')`;
    `ActionsReport.tsx` “Editar” → `router.push(`/reports/{id}/edit`)` (Eliminar sigue
    en modal).
  - `GeneralDialogReport.tsx` ahora **solo** maneja eliminar (delete en modal).
  - `report-constants.ts`: eliminados `createReport`/`updateReport` y
    `ModalsTitleReport` (quedaron sin uso).
  - `components/ui/form-field-input.tsx`: textarea pasa a `min-h-40 w-full resize-y`
    (responsivo, puede crecer verticalmente sin salir del Card).

## 7. Validar antes de guardar reporte + fix SQL con `;` al final

- **Problema A**: al crear un reporte se disparaban 2 peticiones (`POST reports`
  para guardar y `POST reports/{id}/dry-run` para validar). Si la validación fallaba,
  el reporte **ya había quedado persistido** pero la UI no avanzaba (reporte huérfano).
- **Problema B**: una SQL que terminaba en `;` (`select * from users;`) producía un
  500, porque el dry-run la envuelve en `SELECT * FROM (...;) AS report_limited`.

- **Cambios backend** (`sdi_dynamic-reports-service`):
  - `DynamicConnectionService::wrapForDryRun()`: sanea la SQL (`rtrim(trim($sql), ';')`)
    antes de envolverla (corrige el 500 del `;`).
  - `ReportService::save()` / `update()`: normalizan la SQL quitando el `;` final al
    persistir (la BD queda con SQL limpia). Helper `normalizeSql()`.
  - `ReportPreviewRequest.php` (nuevo): `database_connection_id` (required), `sql_query`
    (required), `values` (opcional). Sin `name` — se valida SOLO la consulta.
  - `ReportService::preview(connectionId, sqlQuery, overrides)`: carga la conexión con
    `driver`, le asigna `id` sintético (-1) para el nombre de conexión temporal, extrae
    parámetros y ejecuta `dryRunColumns` **sin persistir** un reporte.
  - `ReportController::preview()` → `ColumnResource::collection(...)`.
  - Ruta `POST api/v1/reports/dry-run` (antes de `apiResource('reports')`) mapea a
    `preview`. Coexiste con `POST reports/{report}/dry-run` (el que usa id).

- **Cambios frontend** (`sdi_app-dynamic-reports`):
  - `services/report-service.ts`: `previewReportService({ database_connection_id, sql_query, values })`
    → `POST reports/dry-run` → `ApiResponse<ReportColumn[]>`.
  - `hooks/use-dry-run.ts`: nuevo `useReportPreview` con `runPreview(connectionId, sql)`.
    En éxito puebla el store (`setDryRunResult(res.data, [])` y `setConnectionAndSql`),
    **sin** `setReportId` (el id depende del guardado posterior).
  - `components/wizard/StepSqlConnection.tsx`: `handleValidate` reordenado —
    **1) validar (preview) → si falla NO guarda y se queda en la vista** →
    **2) si OK, `saveReport`** → **3) `setReportId(String(saved.id))`** → `setStep("headers")`.
    El botón ahora muestra “Validando…” (usa `isPreviewing`) / “Guardar y Validar” / “Crear y Validar”.

- **Comportamiento**: si la SQL es inválida, no se crea ni actualiza el reporte y se
  muestra el error (sin registros huérfanos). El `;` final ya no rompe la validación
  ni queda guardado.

## 8. Fix cache: `Report::findCached` devolvía `__PHP_Incomplete_Class`

- **Problema**: al obtener un registro por caché (Redis, `CACHE_STORE=redis`,
  `REDIS_CACHE_DB=8`) salía:
  `Return value must be of type ?App\Models\Report, __PHP_Incomplete_Class returned`
  en `app/Traits/HasCacheInvalidation.php` (`findCached`).
- **Causa raíz**: `findCached()` guardaba en caché la **instancia Eloquent viva**
  (`static::find($id)` → el modelo `Report`), que internamente contiene closures/
  callbacks de Eloquent (dispatcher, eventos, relations, boots) NO serializables de
  forma fiable con el serializer PHP de Redis. Al recuperarla, `unserialize` producía
  `__PHP_Incomplete_Class`; al no ser un `Report`, el return tipo `?static` disparaba
  el `TypeError`. Es un problema de diseño general del trait (afectaba también a User,
  DatabaseConnection, ReportExecution, ReportSchedule), visible primero en `Report`.
- **Cambio** (`app/Traits/HasCacheInvalidation.php`, `findCached()`): se cachea
  **solo el array de atributos** (`$found->getAttributes()`), nunca la instancia viva.
  - El resolver de `remember`/`rememberForever` devuelve `getAttributes()` o `null`.
  - **Defensa**: si el valor recuperado NO es un array (dato viejo/corrupto p.ej.
    `__PHP_Incomplete_Class`), se invalida la clave (`invalidateCache()`) y se resuelve
    desde BD. Un `null` legítimo (modelo inexistente) se devuelve tal cual.
  - Rehidratación con `(new static)->newFromBuilder($attributes)` → `?static` válido.
- **Relaciones**: nunca viajan en caché (hoy `findCached` usa `find()` sin eager-load y
  el `load()` de relaciones es posterior, en cada service). `warmCache` no se usa en la
  app. Por tanto esta cambio NO altera la semántica de relaciones; los servicios siguen
  haciendo `load()` fuera de la caché.
- **Verificado**: `php -l` OK; prueba aislada con `newFromBuilder` devuelve `Report`
  válido (`exists=true`). No se pudo probar contra la BD (host `erp_postgres` no
  resuelve en el entorno local).

## 9. Fix OOM al generar reporte (`ReportGeneratorJob` ZipStream RAM exhausted)

- **Error**: `Allowed memory size of 134217728 bytes exhausted (tried to allocate
  16777248 bytes) ... vendor/maenichen/zipstream-php/src/File.php:334` al generar el
  XLSX del reporte (sale del job `ReportGeneratorJob`), y luego
  `MaxAttemptsExceededException` ("attempted too many times").
- **Causa raíz — acaparamiento de memoria en varias capas**:
  1. `DynamicConnectionService::runQuery()` usa `DB::select()` → trae **todas** las
     filas a memoria (array de stdClass).
  2. `applyHeaders()` reconstruía **copia** del dataset (`$normalized[] = (array) $row`)
     aunque no hubiera filtro de headers.
  3. `ReportDataExport` (`FromArray`) + PhpSpreadsheet/XLSX arman el worksheet y el ZIP
     en memoria (PhpSpreadsheet retiene el sheet; `zipstream` mantiene buffers).
  → Pico ~3x el dataset; con `memory_limit=128M` (php.ini por defecto) revienta en
  reportes medianos/grandes.
- **Cambios (Opción D híbrida)**:
  - `app/Services/ReportGeneratorService.php` `applyHeaders()`: en el branch **sin
    headers configurados** ya no se reconstruye `$normalized`; se reutiliza `$rows`
    original (stdClass) y solo se derivan headings desde la 1ª fila (evita copiar todo
    el dataset). Confirmado que Maatwebsite convierte stdClass por fila
    (`Sheet::mapArraybleRow`, líneas 708-710) sin romper el writer. Elimina el pico 3x→~2x.
    El branch **con** headers se deja intacto (la copia es necesaria por filtro/renombre).
  - `deploy/local/php.ini`: `memory_limit = 1024M` → **`2048M`** (aplicado a todo PHP vía
    `99-sail.ini`, incluye al worker de cola).
  - `deploy/local/supervisord.conf`: worker `laravel-worker` agregado
    `--max-memory=1536` a `queue:work --queue=default` → el proceso se reinicia si un
    job supera ese uso, evitando la muerte del worker por OOM que causaba el reintento
    infinito del job (fatal de proceso, no excepción capturada).
  - Reintentos: `ReportGeneratorJob::$tries = 1` ya estaba; el "attempted too many
    times" provenía del fatal OOM que mataba el worker y re-liberaba el job en Redis
    (reserved→pending). Con más memoria + `--max-memory` deja de reproducirse.
- **Pendiente opcional (mejora estructural, Opción C)**: streaming real del query
  (cursor PDO en `runQuery`) + export por chunks para millones de filas; el híbrido
  actual cubre hasta volúmenes grandes pero NO elimina la materialización en memoria.
- **Verificado**: `php -l` OK; `memory_limit=2048M` leído del php.ini; `supervisord.conf`
  parsea OK. Reconstruir la imagen del contenedor para aplicar php.ini/supervisord.

## 10. Fix `explode(): array given` al entregar reporte por email (conciliacion:run)

- **Error**: `explode(): Argument #2 ($string) must be of type string, array given` en
  `app/Services/ReportGeneratorService.php` (`deliverViaEmail`), `schedule_id:2`.
- **Causa**: `ReportDestination` castea `config` a `array`
  (`'config' => 'array'` en `app/Models/ReportDestination.php:34`). Para destino `email`,
  el campo `to` se guarda en BD como **array** de destinatarios (no string). La línea
  `explode(',', $config['to'] ?? '')` reventaba; `??` solo protege contra `null`,
  no contra array.
- **Cambios**:
  - `deliverViaEmail()`: normaliza `$config['to']` → lista de strings (acepta array o
    string separado por comas legacy), filtra vacíos, y pasa el **array** a
    `Mail::to($recipients)` (soporte nativo de Laravel).
  - `deliverViaFtp()` (defensivo): cast de campos a tipos escalares
    (`(string)`/`(int)`/`(bool)`) para evitar el mismo fallo futuro si `config` trajera
    arrays.
- **Verificado**: `php -l` OK. No se pudo probar contra BD/SMTP en el entorno local.

## 11. Formato de salida `.txt` + opciones `include_headers` y `delimiter`

**Objetivo**: generar/entregar reportes también en `.txt`, y permitir habilitar/ocultar la
fila de encabezados en el archivo, con separador de columnas configurable cuando el
formato es `txt`.

**Decisiones del usuario**: `txt` es un **formato de salida** (nuevo código en
`file_formats`); el checkbox "Incluir encabezados" aplica a **todos** los formatos; el
separador (default **Tab** `\t`; opciones `\t`, `|`, `,`, `;`, espacio) se expone en la UI
**solo cuando el formato es `txt`**; el valor `delimiter` **se conserva** en BD aunque el
formato ideal otro.

### Backend (`sdi_dynamic-reports-service`)
- Migración `database/migrations/2026_09_03_000012_add_report_schedule_output_options_table.php`:
  `report_schedules` += `include_headers` (bool, default `true`) y `delimiter`
  (string nullable).
- `app/Models/ReportSchedule.php`: `$fillable` += `include_headers`, `delimiter`;
  `$casts = ['include_headers' => 'boolean']`.
- `ReportScheduleCreateRequest` / `ReportScheduleUpdateRequest`: reglas
  `'include_headers' => ['sometimes','boolean']` y `'delimiter' => ['sometimes','nullable','string','max:10']`.
- `app/Http/Resources/ReportSchedule/ReportScheduleResource.php`: attributes +=
  `include_headers`, `delimiter`.
- `database/seeders/FileFormatSeeder.php`: agrega `FileFormat(['code'=>'txt','name'=>'Texto'])`.
- `app/Services/ReportGeneratorService.php`:
  - `storeReport()`: `match` de extensión += `'txt' => 'txt'`; si `format === 'txt'` delega a
    `storeText()`; para xlsx/csv pasa `$headings` solo si `include_headers`
    (`new ReportDataExport($rows, $schedule->include_headers ? $headings : [])`). Confirmado:
    en Maatwebsite `ensureMultipleRows([])` no escribe fila de títulos.
  - nuevo `storeText()`: escribe con `Storage::disk('local')->put()`, separador
    `$schedule->delimiter ?: "\t"`, fila de títulos `implode($delimiter, $headings)` cuando
    `include_headers` y hay headings, y cada fila `implode($delimiter, array_values((array) $row))`.

### Frontend (`sdi_app-dynamic-reports`)
- `types/catalog-type.ts`: `FileFormatCode = "xlsx" | "csv" | "pdf" | "txt"`.
- `types/schedule-type.ts`: attributes += `include_headers: boolean; delimiter: string | null;`.
- `app/(dashboard)/reports/schedule/services/schedule-service.ts`: `ScheduleFormValues` +=
  `include_headers?`, `delimiter?`.
- `components/ScheduleDialog.tsx`: checkbox "Incluir encabezados" (visible siempre, con
  `components/ui/checkbox`); `Select` "Separador de columnas" **solo si
  `selectedFormat.attributes.code === 'txt'`**; estados `includeHeaders` (default true) y
  `delimiter` (default `"\t"`); payload envía `delimiter` solo para txt.
  IMPORTANTE JSX: usar `value={"\t"}` (expresión) para un tab real, no `value="\t"`.
- `components/ColumnsSchedule.tsx`: columna "Salida" muestra encabezados ("Encabezados"/"Sin
  encabez") y, para txt, el separador ("Sep: Tab/Pipe/...").

### Verificación
- Backend: `php -l` OK en migración, modelo, requests, resource, seeder y generador.
- Frontend: `tsc --noEmit` EXIT 0 y `eslint` EXIT 0 (catalog-type, schedule-type,
  schedule-service, ScheduleDialog, ColumnsSchedule); `FileFormatCode` ampliado no rompe
  switches exhaustivos (solo se usa como tipo).

### Pendiente en entorno con BD
- `php artisan migrate` (aplica `include_headers`/`delimiter`).
- `php artisan db:seed --class=FileFormatSeeder` (inserta `code=txt` para que aparezca en el
  Select de formato).

## 12. Fix mapeo de cabeceras vacío cuando el SQL con parámetros devuelve 0 filas

**Síntoma**: al crear un reporte cuyo SQL incluye parámetros (`:param`), el paso siguiente de
**mapeo de cabeceras** no mostraba resultados (tabla vacía, 0 columnas).

**Causa raíz**: `DynamicConnectionService::dryRunColumns()` obtenía las columnas **solo de la
primera fila** (`array_keys((array) $rows[0])`). Cuando los `dummyValue()` de los parámetros
(`''` para nombres genéricos; fecha de hoy para `fecha/date/desde/hasta`) no matcheaban filas,
el `SELECT * FROM (...) AS report_limited LIMIT 1` devolvía 0 filas → `[]` → el wizard no tenía
columnas para mapear headers.

**Decisión (usuario)**: Opción C híbrida — mostrar las columnas aunque haya 0 filas, resolviendo
los nombres por **metadatos del driver**, con soporte **escalable por factory** (Postgres, MySQL,
Oracle y futuros). Parámetros repetidos contemplados. **Sin cambios de frontend**.

### Backend (`sdi_dynamic-reports-service`), nuevos archivos en `app/Connections/`
- `ColumnRetrieverInterface.php`: `columns(PDO $pdo, string $sql, array $bindings, array $rowColumns): array`.
  Si `$rowColumns` no vacío lo devuelve (fallback rápido); si vacío, resuelve por metadatos.
- `ExecutesStatement.php` (trait): `executeStatement()` + `bindValues()` que soporta bindings
  **asociativos (nombrados)** y posicionales; `pdoType()` mapea int/bool/null/LOB/str. Un binding
  por nombre cubre todas las apariciones del placeholder nombrado (parámetros repetidos).
- `PostgresColumnRetriever.php` / `MysqlColumnRetriever.php`: ejecutan el SQL y usan
  `PDOStatement::getColumnMeta($i)['name']` (fiable en pgsql/mysql).
- `OracleColumnRetriever.php`: usa un bloque PL/SQL con **`DBMS_SQL`** (`parse` +
  `describe_columns`, recogiendo `rec_tab(i).col_name` en `:names`). No requiere ejecutar ni
  bindear la consulta → funciona con 0 filas. Si `DBMS_SQL` falla, `Log::warning` y devuelve `[]`.
- `ColumnRetrieverFactory.php`: `for(string $laravelDriver)` con `match` por driver, igual que
  `ConnectionBuilderFactory`. **Para escalar a un driver nuevo**: añadir un caso + su retriever.

### Backend, cambio en `app/Services/DynamicConnectionService.php`
- `dryRunColumns()`: si `$rows` tiene ≥1 fila → columnas de la primera fila (camino rápido, sin
  cambio). Si hay **0 filas** → `withConnection()` re-inyecta la conexión, obtiene el driver
  (`$conn->getConfig('driver')`), instancia el retriever vía `ColumnRetrieverFactory::for(...)` y
  ejecuta `columns($conn->getPdo(), $wrapped, $bindings, $rowColumns)`.
- Los bindings se pasan **tal cual** (asociativos por nombre) a `runQuery` y al retriever; el trait
  los enlaza por nombre (cubre placeholders repetidos). No se reescribió a placeholders posicionales.

### Verificación
- Backend: `php -l` OK en interfaz, trait, 3 retrievers, factory y `DynamicConnectionService`.
- Frontend: sin cambios; `tsc --noEmit` EXIT 0 y `eslint` solo errores/warnings preexistentes.
- No se pudo probar contra BD real (host `erp_postgres` no resuelve local). La lógica de metadatos
  (getColumnMeta / DBMS_SQL) queda aislada por driver y se valida en entorno con BD.

### Nota Oracle
- `getColumnMeta()` no es fiable en PDO_OCI; por eso Oracle usa `DBMS_SQL`. Si no hay privilegios
  de `DBMS_SQL` en la cuenta, el retriever devuelve `[]` + log; añadir fallback adicional si se
  requiere en producción con Oracle.

## 13. Programación de reportes: Drawer + generador de cron + "cada X semanas"

**Síntomas**: el modal de creación/edición se desbordaba hacia abajo; warning de React
`Each child in a list should have a unique "key" prop` en `ScheduleParameters`; el cron solo
soportaba daily/weekly/monthly/yearly y su estado interno no se sincronizaba al editar.

**Decisiones del usuario**: convertir la creación/edición a un **Drawer** (quedando el modal
solo para la confirmación de eliminación, ya mediante `AlertDeleteDialog`); la expresión cron se
**genera automáticamente** al elegir frecuencia+hora (sin botón manual "Usar expresión"), pero se
muestra; se agregan frecuencias (cada minuto/cada X minutos/cada hora/cada X horas/cada X semanas);
**UI condicional**: solo mostrar los campos que aplican a la frecuencia seleccionada; meses/días
multi-selección; se conserva el `DayPicker` actual.

### Frontend (`sdi_app-dynamic-reports`)
- `pnpm add vaul` (v1.1.2) + `pnpm dlx shadcn@latest add drawer` → crea `components/ui/drawer.tsx`
  (estilo new-york, desliza desde abajo, overlay `bg-black/50`, perilla superior). Se agrega con el
  CLI de shadcn porque el proyecto usa **pnpm** (npm falla con bug de arborist en este árbol).
- `app/(dashboard)/reports/schedule/components/ScheduleDialog.tsx` → renombrado a
  **`ScheduleDrawer.tsx`**: usa `Drawer`/`DrawerContent`/`DrawerHeader`/`DrawerFooter` en lugar de
  `TemplateDialog`. `DrawerContent` con `h-[90vh]`, body con `flex-1 overflow-y-auto px-4`, footer
  con Cancelar/Guardar (elimina el `max-h-[70vh]`/`max-h-[500px]` que causaba el desbordamiento).
  Se elimina el `ScheduleDialog.tsx` antiguo; `page.tsx` importa `ScheduleDrawer`.
- `components/CronBuilder.tsx` (rediseñado): frecuencias `minute | minutes | hour | hours | daily |
  weekly | weekInterval | monthly | yearly`. Cron auto-generado en `useMemo` (sin botón):
  - `minute` → `* * * * *`; `minutes` → `*/X * * * *`; `hour` → `0 * * * *`; `hours` → `0 */X * * *`;
    `daily` → `m H * * *`; `weekly`/`weekInterval` → `m H * * dow` (dow numérico CSV);
    `monthly` → `m H dom * *`; `yearly` → `m H dom 1,3,... *` (meses multi).
  - **UI condicional**: `time` solo para daily/weekly/weekInterval/monthly/yearly; campo `X` solo
    para minutes/hours; `DayPicker` (0-6, L..D) para weekly/weekInterval; día del mes para
    monthly/yearly; meses (multi, 12 botones) para yearly.
  - **Parsing en edición** (`parseCron`): dado `value` + `everyNWeeks`, precarga frecuencia/hora/días/
    mes/día/meses. Guards para no pisar la cron de edición al montar (`initialValue`/`lastParsed`.
  - Exposición: `onChange(cron)` auto + `everyNWeeks`/`onEveryNWeeksChange`.
- `components/ScheduleParameters.tsx:65`: `key={name}` → `key={`${name}-${index}`}` (fix del warning).
- `ScheduleDrawer`: `reportParams` deduplicado con `[...new Set(...)]`; payload agrega `every_n_weeks`
  (de `onEveryNWeeksChange`, `null` cuando no es semanario).
- `types/schedule-type.ts`: `ReportSchedule.attributes.every_n_weeks: number | null`.
- `schedule/services/schedule-service.ts`: `ScheduleFormValues.every_n_weeks?`.

### Backend (`sdi_dynamic-reports-service`) — "cada X semanas"
- **Migración** `database/migrations/2026_09_03_000013_add_every_n_weeks_to_report_schedules_table.php`:
  `report_schedules.every_n_weeks` (unsignedSmallInteger nullable).
- `app/Models/ReportSchedule.php`: `$fillable` += `every_n_weeks`.
- `ReportScheduleCreateRequest` / `ReportScheduleUpdateRequest`: regla
  `'every_n_weeks' => ['sometimes','nullable','integer','min:1','max:52']`.
- `ReportScheduleResource`: attributes += `every_n_weeks`.
- `app/Console/Commands/RunConciliationCommand.php`: `isDue()` ahora recibe `ReportSchedule $schedule`.
  Evalúa `(new CronExpression($schedule->cron_expression))->isDue($now)` y, si `every_n_weeks > 1`,
  aplica `((int)$now->isoWeek() - 1) % every_n_weeks === 0` (anclado a semana ISO 1). Nota: el cron
  estándar (5 campos) NO puede expresar "cada X semanas"; por eso se añade esta condición extra en el
  comando. La `cron_expression` semanal lleva el día de la semana (`m H * * dow`).

### Verificación
- Frontend: `tsc --noEmit` EXIT 0; `eslint` EXIT 0 en los archivos nuevos/tocados.
- Backend: `php -l` OK en migración, modelo, requests, resource y comando.
- Pendiente entorno con BD: `php artisan migrate` (aplica `every_n_weeks`).

### Notas de comportamiento (punto 4)
- Hora se muestra SIEMPRE en daily/weekly/weekInterval/monthly/yearly. En frecuencias de intervalo
  (minute/minutes/hour/hours) NO hay campo de hora.
- Semanal usa la hora real (corre 1 vez/por día seleccionado, no cada minuto), aclarado con el usuario.

---

## 14. Modal usable (sin Drawer), variables SQL visibles y botón "Probar ejecución"

**Síntomas**: (a) el Drawer de Vaul (ítem 13) no resultó usable y el usuario pidió volver a un modal
que no se colapse; (b) las variables del SQL del reporte no se mostraban en el formulario de
programación para darles valor (sí se guardaban en BD); (c) pidió botón/acción para probar la
ejecución de una programación; (d) el modal de confirmación al eliminar una programación no aparecía.

### (a) Drawer → modal `Dialog` usable con footer fijo
- `ScheduleDrawer.tsx` (Vaul) eliminado; se recreó `components/ScheduleDialog.tsx` sobre
  `@/components/ui/dialog` (Radix). `DialogContent` con `flex flex-col sm:max-w-3xl max-h-[85vh]
  overflow-hidden`, **header fijo**, **body `flex-1 overflow-y-auto`** y **`DialogFooter` fijo**
  (Cancelar/Guardar) con `border-t`. Esto evita el colapso/desbordamiento del modal.
- Se eliminó `components/ui/drawer.tsx` (Vaul). El dep `vaul` queda en `package.json` pero sin uso
  (no se quitó con `pnpm remove` para no tocar el árbol de dependencias; si molesta, removerlo a la par).
- `page.tsx` importa `ScheduleDialog`.

### (b) Causa raíz: variables SQL no visibles (mismatch de formato)
- El backend envía cada parámetro del reporte como
  `{ type, id, attributes: { report_id, param_name, data_type } }` (`ParameterResource`).
- El frontend lo leía **en la raíz** (`p.param_name`), así que nunca encontraba el `param_name`
  → `reportParams=[]` → no se mostraban las variables (aunque la BD/API sí las traía).
- Fix:
  - `types/report-type.ts`: `ReportParameter` → `{ type; id; attributes: { report_id, param_name, data_type } }`.
  - `use-dry-run.ts:31`: `p.attributes.param_name`.
  - `ScheduleDialog.tsx` (`reportParams`): `p.attributes.param_name`.
- OJO: los parámetros de la **programación** (`ScheduleParameter`, `schedule.relationships.parameters`)
  SÍ vienen en la raíz (`{ id, param_name, param_value }` según `ReportScheduleResource`); ese tipo no se tocó.

### (c) Botón "Probar ejecución"
- **Backend**: `ReportScheduleController@run` (`POST report-schedules/{report_schedule}/run`) →
  `ReportGeneratorJob::dispatch($reportSchedule->id)` (colas `reports`), responde `202 Accepted`
  con `{ message }`. Ruta registrada en `routes/api/v1.php` tras el `apiResource`.
- **Frontend**: `components/ColumnsSchedule.tsx` gana `onRun`/`isRunningId` y un botón `Play`
  (spinner `Loader` mientras corre) en Acciones. Nuevo `hooks/use-run-schedule.ts` llama
  `runScheduleService(id)` y, en éxito, toast con action "Ver ejecuciones" → `/reports/executions`.
  Nuevo `schedule-service.ts runScheduleService`. `page.tsx` conecta `onRun`/`isRunning`.
- **Errores de ejecución**: el job registra `report_executions` (`status=processing` → `success|failed`,
  `error_log` en fallo, `ReportGeneratorService` l.56-59). El usuario sigue el estado/error en la
  pantalla **Ejecuciones de reportes** (`/reports/executions`): el badge "Fallido" es clickeable y abre
  `ErrorLogModal`. No se hace polling (el worker + BD remota `erp_postgres` no están disponibles en local).

### (d) Modal de eliminación no aparecía
- `AlertDeleteDialog` es **solo contenido** (un `<div>` sin overlay/portal). En otras páginas se
  envuelve en un `Dialog`/`TemplateDialog` para verse como modal; en `page.tsx` (schedule) se
  renderizaba **suelto**, por lo que nunca aparecía como diálogo.
- Fix: envolverlo en `TemplateDialog` (`@/components/common/templates/template-dialog`) con
  `open={Boolean(deleting)}`, `setOpen` que cierra y `className="sm:max-w-md"`.

### Verificación
- Frontend: `tsc --noEmit` EXIT 0; `eslint` EXIT 0 en archivos tocados.
- Backend: `php -l` OK en controller y rutas; `php artisan route:list --path=report-schedules`
  muestra `POST .../report-schedules/{report_schedule}/run`.
- Pendiente de probar contra entorno real (BD remota/SMTP/worker `reports`).

---

## 15. Ejecuciones: métricas, storage S3, descarga y errores de entrega descriptivos

Se enriqueció la trazabilidad de ejecuciones y se migró el storage de `local` a S3 (MinIO),
ya que los contenedores no tienen volumen persistente.

### Storage a S3 (MinIO)
- `config/filesystems.php` default = S3 (`.env`: `FILESYSTEM_DISK=s3`, bucket `test`,
  endpoint `http://minio:9000`, `use_path_style_endpoint=true`).
- `ReportGeneratorService` usaba `Storage::disk('local')` explícito → se reemplazó por el
  disco por defecto (S3) en: `storeText()`, `deliverViaFtp()` (lee con `Storage::get`),
  `deliverViaEmail()` (baja a temp local para adjuntar, porque `Storage::path()` en S3 no
  produce un archivo local legible), y el writer de Excel (`$this->excel->store(..., null, ...)`).
- **Fix encabezados encadenado**: nueva `app/Exports/ReportDataOnlyExport.php` (solo
  `FromArray`, sin `WithHeadings`). En `storeReport()`, si `include_headers` está desactivado
  se usa este exportador para que Maatwebsite NO escriba fila de encabezados.

### Métricas en `report_executions` (migración 000014)
- `row_count` (unsignedInteger nullable) — filas generadas.
- `file_size` (unsignedBigInteger nullable) — tamaño en bytes (`Storage::size`).
- `trigger_type` (string, default `scheduled`) — `manual` | `scheduled`.
- `generate(ReportSchedule $schedule, string $triggerType = 'scheduled')` las guarda en el
  `update()` de éxito. `ReportScheduleController@run` despacha con `'manual'`; el cron
  `RunConciliationCommand` deja el default `'scheduled'`.
- Se eliminó la doble llamada a `resolveParameters` (se calcula una vez).

### Descarga del archivo
- Nuevo `ReportExecutionController@download` (`GET report-executions/{report_execution}/download`,
  nombre de ruta `report-executions.download`): verifica `status=success` y que `Storage::exists`
  antes de `Storage::download`. → 404 si no.
- `ReportExecutionResource` expone además `row_count`, `file_size`, `trigger_type`, `duration`
  (segundos `finished_at - started_at`) y `download_url`.

### Errores de entrega descriptivos (reutilizando `error_log`, sin campo nuevo)
- `deliver()` ahora itera destinos con `try/catch` POR destino: si FTP falla, igual intenta email,
  y viceversa. Devuelve `{ success, failed }` y acumula en `$errorLog` un bloque descriptivo por
  cada destino fallido vía `formatDeliveryError()` (+ `summarizeDestination()` sin credenciales).
- Si TODOS fallan → `status=failed`; si al menos uno funciona → `status=failed` igualmente, pero
  `error_log` conserva las advertencias de los fallidos para debugging (la entrega incompleta se
  marca como fallo para que el usuario la vea).
- `Log::info/warning/error` en cada paso (inicio, filas, archivo, entrega por destino, resumen).
- `ReportGeneratorJob::failed()` ahora persiste un `ReportExecution` con `status=failed` si el job
  muere antes de que `generate()` cree/actualice el registro (antes solo logueaba).

### Frontend
- `types/execution-type.ts`: + `row_count`, `file_size`, `trigger_type`, `duration`, `download_url`.
- `ColumnsExecution.tsx`: columnas **Filas** (Intl), **Tamaño** (B/KB/MB), **Tipo** (badge
  Manual=Zap azul / Programado=Clock gris), **Duración** bajo Fecha, subtexto `Programación #id`,
  y botón de **descarga** (`Download`) cuando `status=success` y hay `download_url`.
- `page.tsx` (ejecuciones): segundo filtro por `trigger_type` + `handleClearFilters`.
- `execution-service.ts`: se eliminó `getExecutionByIdService` (código muerto).

### Verificación
- Backend: `php -l` OK en todos los archivos tocados; `route:list` muestra
  `GET .../report-executions/{id}/download` (nombre `report-executions.download`).
- Frontend: `tsc --noEmit` EXIT 0; `eslint` EXIT 0 en archivos tocados.
- Pendiente entorno real: `php artisan migrate` (000014) + probar generación con S3/MinIO,
  descarga, y entrega FTP/email (SMTP no disponible en local).

---

## 16. Rediseño del wizard de creación de reportes (4 pasos)

Wizard de 3 → 4 pasos: **Datos Generales → Consulta SQL → Mapeo de Encabezados → Resumen**.
Se añadieron catálogo jerárquico de categorías, editor SQL CodeMirror con autocompletado
de esquema, y se pulió el resumen.

### Catálogo de categorías jerárquico (NUEVO en backend)
- Tabla `report_categories` (migración `000015`): `name` (unique) + `parent_id` nullable
  self-FK (`nullOnDelete`). Modelo `ReportCategory` con `parent()`/`children()`/`reports()`,
  traits `HasCacheInvalidation`/`HasSearchable`.
- `ReportCategoryController` + `ReportCategoryService` (list plano con `parent` cargado,
  store/show/update/destroy) + `ReportCategoryResource` (JSON:API: `attributes.name`,
  `relationships.parent_id`/`parent`).
- `Request`s: `ReportCategoryStoreRequest` (name required unique), `ReportCategoryUpdateRequest`
  (unique ignorando self, `parent_id` no puede ser self).
- Ruta: `Route::apiResource('report-categories', ...)` en `api/v1.php`.
- Factory `ReportCategoryFactory`.

### Reporte: `category` string → `report_category_id` FK
- Migración `000016`: dropea `reports.category` (string) y añade `report_category_id`
  nullable FK a `report_categories` (`nullOnDelete`). ⚠️ Rompe datos previos (dev ok).
- `Report::category()` BelongsTo + `$fillable` += `report_category_id`.
- `ReportCreateRequest`/`ReportUpdateRequest`: `report_category_id` nullable exists (antes `category`).
- `ReportService`: filter `report_category_id`; carga `category`; factory usa `ReportCategory::factory()`.
- `ReportResource`: attributes ya NO traen `category` string → `relationships.category`
  (objeto `{id,name,parent_id}`) + `attributes.report_category_id`.

### Introspección de esquema (autocompletado) NUEVO
- `SchemaIntrospectionService::tablesAndColumns(DatabaseConnection)` con `Cache::remember`
  (TTL 600s, clave `report_schema_{id}`, invalida con `flush()`). Usa
  `DynamicConnectionService::withConnection()` y consultas por driver:
  - **MySQL**: `information_schema` (table_schema = conn db).
  - **PostgreSQL**: `information_schema` (table_schema = schema/`public`).
  - **Oracle**: `all_tables`/`all_tab_columns` (owner = `USER`).
  - No-soportado → `InvalidArgumentException` logueado.
- Endpoint `GET database-connections/{database_connection}/schema` en `DatabaseConnectionController`
  (inyecta `SchemaIntrospectionService`), responde `{ data: { type, id, attributes: { tables: [...] } } }`.
- Ruta registrada ANTES del `apiResource` de connections.

### Frontend
- Deps nuevas: `@uiw/react-codemirror`, `@codemirror/lang-sql`, `@codemirror/autocomplete`,
  `@codemirror/language`, `@lezer/highlight`.
- `components/ui/sql-editor.tsx`: CodeMirror SQL con `upperCaseKeywords`, dialect
  PostgreSQL opcional, y autocompletado custom (palabras clave + tablas/columnas del esquema,
  boost en tablas).
- `hooks/use-list-report-categories.ts`, `hooks/use-schema.ts`, `services/catalogs/report-category-service.ts`
  (CRUD), `services/catalogs/schema-service.ts`.
- `types/report-category-type.ts`, `types/schema-type.ts`, `types/report-type.ts` actualizado
  (category → `relationships.category` + `report_category_id`).
- `hooks/zustand/use-report-wizard-store.tsx`: `WizardStep` = `details|sql|headers|summary`;
  campo `reportCategoryId` + `setDetails`/`setSql`.
- `ReportWizard.tsx`: STEPS 4 pasos + prefill edit con `setState` (reportId, connectionId,
  reportCategoryId, name, description, sqlQuery).
- `StepDetails.tsx` (nuevo): nombre, categoría (react-select jerárquica: padres + hijos
  indentados + huérfanos), **driver badge** (tipo de conexión) de la conexión seleccionada,
  selector de conexión, descripción. Continuar → `setDetails` (no persiste aún).
- `StepSql.tsx` (reemplaza a `StepSqlConnection`): editor CodeMirror + `useSchema(connectionId)`;
  muestra driver; "Crear/Guardar y Validar" → `runPreview` → `saveReport` (con
  `report_category_id`) → `setReportId` → `setStep("headers")`. Se eliminó `StepSqlConnection.tsx`.
- `StepHeaderMapping`: botón Atrás → `setStep("sql")`.
- `StepSummary`: rediseño en tarjetas (encabezado con icono, 3 campos Conexión/Categoría/
  Columnas, bloque SQL oscuro, chips de columnas), categoría resuelta por catálogo.
- `ColumnsReport`: columna Categoría usa `relationships.category.name` (antes `attributes.category`).

### Verificación
- Backend: `php -l` OK en todos los tocados (migraciones, modelos, requests, resources,
  services, controllers, factories, rutas). `route:list` cuelga localmente (BD remota no
  alcanzable), rutas verificadas en código.
- Frontend: `tsc --noEmit` EXIT 0, `next build` EXIT 0, `eslint` sin errores (solo warning
  informativo de react-hook-form `watch` en StepDetails).
- Pendiente entorno real: `php artisan migrate` (000015, 000016) + seed de categorías;
  probar autocompletado con conexión real (requiere BD alcanzable).

---

## 17. CRUD jerárquico de categorías en `/settings/categories`

Pantalla de administración de categorías (catálogo jerárquico del wizard ítem 16) en
`app/(dashboard)/setting/categories/` (URL `/setting/categories`). Vista en **árbol
expandible** (no tabla).

### Backend (soporte de búsqueda/orden)
- `ReportCategoryService::list()` → usa `HasSearchable::search($request, ['parent'],
  filters: ['name'], sorts: ['name'])`. Soporta `filter[name]`, `sort`, `paginate`.
- `ReportCategoryController@index` → `list($request)` (antes `list($request->boolean('paginate'))`).
- El árbol se construye en el frontend con `paginate: false` (lista plana con `parent_id`).

### Frontend (estructura)
```
app/(dashboard)/setting/categories/
  page.tsx                                   ← header + SearchInput + botón + árbol
  constants/category-constants.ts            ← ModalsNameCategory{create,update,delete} + titles
  types/category-types.ts                    ← zod CategoryFormSchema{id,name,parent_id} + Values
  hooks/use-list-categories.ts               ← react-query ["report-categories"] (reusa requestAllReportCategories)
  hooks/use-category-actions.ts              ← save/update/delete + invalidate ["report-categories"]
  components/tree/buildCategoryTree.ts       ← buildCategoryTree / filterCategoryTree / collectSubtreeIds
  components/tree/CategoryTree.tsx           ← recorre raíces → CategoryTreeNodeView
  components/tree/CategoryTreeNode.tsx       ← fila recursiva (chevron, carpeta, nombre, acciones)
  components/form/CategoryForm.tsx           ← name + parent (react-select) con auto-exclusión
  components/dialog/GeneralDialogCategory.tsx← TemplateDialog create/update/delete
```

### Comportamiento del árbol
- **Construcción**: `buildCategoryTree` (agrupa por `parent_id`; raíces `parent_id == null`).
- **Fila por nodo** (`CategoryTreeNodeView`): indentación `padding-left = depth*20`, guía
  vertical `border-l` en los hijos, chevron (año/180° via `CollapsibleTrigger`) solo si
  tiene hijos, icono `Folder`/`FileText`, nombre, y **acciones hover**: `FolderPlus`
  (crear hijo con `parent` prellenado), `Pencil` (editar), `Trash2` (eliminar).
- **Búsqueda**: `SearchInput` (debounce 300ms) + `filterCategoryTree` (filtra client-side
  por `name`, conservando ancestros de coincidencias para mantener la jerarquía visible).
  Sin paginación server-side en esta vista.
- **Pedir padre**: `CategoryForm` con `parent` react-select (`isSelectClearable`); en modo
  edición excluye a la propia categoría **y a todos sus descendientes**
  (`collectSubtreeIds`) para evitar ciclos.

### Verificación
- Backend: `php -l` OK (service + controller).
- Frontend: `tsc --noEmit` EXIT 0, `next build` EXIT 0 (ruta `/setting/categories`
  registrada), `eslint` 0 errores en `app/(dashboard)/setting/categories`.
- Nota React Compiler: el `useMemo` de `formValues`/`parentOptions` se ajustó para respetar
  dependencias inferidas (sin errores).
- Pendiente entorno real: `php artisan migrate` (000015/000016) + seed; probar flujo árbol
  con datos jerárquicos reales.

---

## 18. Recurso `ReportCategory` completo + árbol lazy con paginación y búsqueda por nodo

Iteración sobre el ítem 17: el `ReportCategoryResource` expone `parent` como **resource
completo anidado** y el árbol carga **hijos bajo demanda** (lazy) con paginación y búsqueda
dentro de cada nodo.

### Contrato de API (3 endpoints)
| Endpoint | Uso | Comportamiento |
|---|---|---|
| `GET report-categories?paginate=false` | Form padre + wizard | Lista **plana completa**, filtrable `name`, con `parent` + `children_count` (sin `children`) |
| `GET report-categories?paginate=true` | Árbol nivel inicial | **Solo raíces** (`parent_id = null`), paginadas + filtro `name`, con `children_count` |
| `GET report-categories/{id}/children` | Árbol al expandir | **Hijos directos** del nodo, paginados + filtro `name`, con `children_count` |

### Backend
- `ReportCategoryResource`: `parent` → `new ReportCategoryResource($this->parent)`
  (recursivo **un solo nivel**; se corta porque el eager-load no trae `parent.parent`);
  `relationships.children_count` (int, vía `withCount('children')`). No emite `children`.
- `ReportCategoryService`: 3 métodos — `listRoots(Request)` (raíces paginadas), `listFlat`
  (completa, sin paginar), `children(int $parentId, Request)` (hijos paginados). Todos usan
  `HasSearchable::search` con `callback: fn($q)=>$q->withCount('children')`; `listRoots` y
  `children` añaden `whereNull('parent_id')` / `where('parent_id', $parentId)`.
- `ReportCategoryController@index`: si `paginate=true` → `listRoots`, si no → `listFlat`.
  Nuevo `children(Request, ReportCategory)` → `children(id, $request)`. `show/store/update`
  → `loadCount('children')`.
- `routes/api/v1.php`: `Route::get('report-categories/{report_category}/children', ...)`
  ANTES del `apiResource`.

### Frontend
- `types/report-category-type.ts`: `parent: ReportCategory | null` (recursivo shallow);
  `relationships.children_count: number`.
- `services/.../report-category-service.ts`: nuevo `requestReportCategoryChildren({id, params})`.
  `requestPaginatedReportCategories` ahora mapea a raíces paginadas (index/paginate=true);
  `requestAllReportCategories` → flat (sin cambios).
- `hooks/use-list-categories.ts`: raíces paginadas, `queryKey ["report-categories","roots",params]`,
  `keepPreviousData`. `hooks/useListCategoryChildren(id, enabled, params)`: hijos por nodo,
  `queryKey ["report-categories","children",id,params]`, `enabled` = nodo abierto.
- `CategoryTreeNode.tsx` (auto-recursivo vía `import CategoryTreeNodeRecursive from "./CategoryTreeNode"`):
  - Chevron/folder según `children_count > 0`; cuenta a la derecha del nombre.
  - Al abrir: `useListCategoryChildren` (solo si `open`). Header de búsqueda **dentro del
    nodo** (debounce 300ms, resetea page=1) + paginación hijos (chevron izquierda/derecha,
    `childPage / last_page`).
  - Acciones hover: `FolderPlus` (crear hijo), `Pencil`, `Trash2` (igual que antes).
- `CategoryTree.tsx`: recibe `ReportCategory[]` (raíces) y renderiza `CategoryTreeNodeView
  depth=0`; ya NO construye árbol en frontend.
- `buildCategoryTree.ts`: se reduce a `collectSubtreeIds(categories: ReportCategory[], rootId)`
  que calcula descendientes desde la **lista plana** (para excluir self+descendientes en el
  form). Se eliminaron `buildCategoryTree`/`filterCategoryTree`.
- `CategoryForm`: usa `useListReportCategories` (flat completo) para el selector de padre
  (antes `useListCategories`, que ahora es raíces paginadas). `collectSubtreeIds(flat, id)`.
- `page.tsx`: `useListCategories({filter:{name}, page})` + `PaginationButtons` (raíces) +
  `useResetPageOnEmpty`. Ya no usa `buildCategoryTree`/`filterCategoryTree`.
- Corrección: texto de delete cambia — con FK `nullOnDelete`, al eliminar una categoría sus
  **hijos pasan a ser raíces** (no se borran), y así lo aclara el `AlertDeleteDialog`.

### Notas / decisiones
- Paginación default: `$request->limit ?? 10` (10/página) del `HasSearchable`.
- Búsqueda de raíces global (server-side) y búsqueda de hijos **por nodo**; no hay búsqueda
  global que aplane el árbol.
- `ReportResource.category` NO se tocó (sigue inline `{id,name,parent_id}`).

### Verificación
- Backend: `php -l` OK (resource, service, controller, rutas).
- Frontend: `tsc --noEmit` EXIT 0, `eslint` 0 errores, `next build` EXIT 0 (ruta
  `/setting/categories` compila).
- Pendiente entorno real: `php artisan migrate` (000015/000016) + seed; probar paginación y
  búsqueda por nodo contra BD real.

---

## 19. Fix backend: adjuntos de email en blanco (bug de `deliverViaEmail`)

**Síntoma:** la programación guarda el archivo en S3 correctamente, pero al entregarlo por
email el adjunto llega **vacío** (en blanco). FTP y el módulo de descarga sí funcionan.

**Causa raíz** en `sdi_dynamic-reports-service/app/Services/ReportGeneratorService.php`
(`deliverViaEmail`): `tempnam()` devuelve ruta **absoluta** (`/tmp/report_XXXX`), pero
`Storage::disk('local')->put($tmpPath, ...)` trata esa ruta como **relativa** al root del
disco local (`storage/app/private/`). El contenido real quedaba en
`storage/app/private/tmp/report_XXXX`, mientras el email adjuntaba `/tmp/report_XXXX` (el
placeholder vacío de tempnam). El limpiado `Storage::disk('local')->delete($tmpPath)`
también apuntaba mal (dejaba huérfano el archivo real).

**Fix aplicado (Opción A):** escribir el contenido directamente al archivo temporal que se
adjunta, sin la abstracción de disco:
- `$bytes = Storage::get($relativePath)`; si viene vacío → `RuntimeException` clara (en vez
  de adjuntar un archivo vacío silenciosamente) + limpieza.
- `file_put_contents($tmpPath, $bytes)` y adjuntar `$tmpPath`.
- `finally { @unlink($tmpPath); }` (se quitó `Storage::disk('local')->delete(...)`).
- Import añadido: `use RuntimeException;`.

**Verificación:** `php -l` EXIT 0.

---

## 20. Ejecución en caliente de consultas SQL con modal de parámetros y tabla de resultados

**Objetivo**: En el paso 2 del wizard (`StepSql`), permitir ejecutar la consulta en caliente contra la conexión seleccionada. Si la consulta incluye parámetros nombrados (`:nombre`), abrir un modal solicitando los valores según la naturaleza del campo (Fecha, Número, Booleano, Texto). Los resultados se visualizan en una tabla directamente debajo del editor con métricas de tiempo y filas.

### Backend (`sdi_dynamic-reports-service`)
- `ReportExecuteRequest.php`: valida `database_connection_id` (exists), `sql_query`, `values` (array opcional) y `limit` (int 1 a 200, default 50).
- `DynamicConnectionService::wrapWithLimit(DatabaseConnection $connection, string $sql, int $limit = 50)`: envuelve la consulta en un subselect con límite (`LIMIT {$limit}` para Postgres/MySQL o `ROWNUM <= {$limit}` para Oracle) retirando el `;` final. `wrapForDryRun` ahora reutiliza este método con límite 1.
- `ReportService::executeQuery(int $connectionId, string $sqlQuery, array $values = [], int $limit = 50)`:
  - Extrae parámetros y asocia valores provistos o fallbacks con `dummyValue()`.
  - Mide tiempo de ejecución (`microtime(true)`).
  - Ejecuta con `runQuery()` envuelto en límite de seguridad (default 50 filas).
  - Si arroja 0 filas, resuelve columnas vía `dryRunColumns` (metadatos del driver).
  - Devuelve `['columns' => [...], 'rows' => [...], 'row_count' => int, 'execution_time_ms' => float]`.
- `ReportController::execute(ReportExecuteRequest $request)`: captura cualquier `Throwable` y responde `422 { message }` para exponer el error exacto del motor BD sin romper la API.
- Ruta `POST api/v1/reports/execute` registrada antes de `apiResource('reports')`.

### Frontend (`sdi_app-dynamic-reports`)
- `types/query-execute-type.ts`: `QueryParamType = "text" | "number" | "date" | "datetime-local" | "boolean"`, `QueryExecutionResult`, `DetectedParam`.
- `utils/sql-param-utils.ts`:
  - `extractSqlParameters(sql)` con regex `/(?<!:):([a-zA-Z0-9_]+)\b/g` que evita falsos positivos con casteos de PostgreSQL (`::date`, `::int`).
  - `inferParamType(paramName)`: infiere `date` (`fecha|date|desde|hasta|inicio|fin`), `datetime-local` (`hora|time|datetime`), `number` (`id|cantidad|monto|total|precio|num`), `boolean` (`is_|es_|activo`), o `text`.
  - `getDefaultParamValue(type)` y `mergeDetectedParams(sql, existingMap)` (preserva valores ya ingresados en memoria).
- `services/report-service.ts`: `executeReportQueryService` apuntando a `POST /reports/execute`.
- `hooks/use-execute-query.ts`: gestiona la mutación, resultados, mensajes de error y toasts con tiempos.
- `components/wizard/QueryParamsModal.tsx`: diálogo que muestra cada parámetro con selector manual de tipo si se desea cambiar la inferencia, y el control correspondiente (`<input type="date">`, `<input type="number">`, `<input type="text">`, select booleano).
- `components/wizard/QueryResultsTable.tsx`: barra superior con filas devueltas, badge de tiempo (`⏱️ X ms`), botón para reabrir parámetros y botón cerrar; tabla shadcn con scroll horizontal/vertical (`max-h-72`), formato amigable de celdas (`null`, booleano, objetos) y alerta de error legible si la BD falla.
- `components/wizard/StepSql.tsx`: incorpora barra de herramientas con badges de parámetros detectados, botón "Parámetros", botón "Ejecutar consulta" (Play/Loader), tabla `QueryResultsTable` y modal `QueryParamsModal`.

### Verificación
- Backend: `php -l` EXIT 0 en request, service, dynamic service, controller y rutas.
- Frontend: `npx tsc --noEmit` EXIT 0; `npx next build` EXIT 0 (todas las rutas compilaron).

---

## 21. Mapeo de cabeceras: selector maestro (todas/ninguna) y validación de mínimo una columna requerida

**Objetivo**: En el paso 3 del wizard (`StepHeaderMapping`), permitir seleccionar o deseleccionar todas las columnas con una sola acción y deshabilitar el botón de continuar si no hay ninguna seleccionada.

### Frontend (`sdi_app-dynamic-reports`)
- `components/ui/checkbox.tsx`: se amplió el soporte para el estado `indeterminate` (`checked="indeterminate"`), renderizando `MinusIcon` de `lucide-react` con los estilos primarios de Radix/shadcn.
- `app/(dashboard)/reports/components/wizard/StepHeaderMapping.tsx`:
  - Se agregó `allSelected`, `someSelected` y función `toggleSelectAll()`.
  - Checkbox maestro en el encabezado de la tabla (`TableHead` de la columna "Incluir") con soporte para estado parcial (`indeterminate`).
  - Botón de acción rápida "Seleccionar todas" / "Deseleccionar todas" en la barra superior.
  - El botón "Guardar y continuar" se deshabilita cuando `selectedCount === 0` (`disabled={isLoading || selectedCount === 0}`).
  - Mensaje de validación en rojo: *"Debes seleccionar al menos una columna para continuar"* cuando no hay selección.
  - Guardia de seguridad en `handleSave` para evitar peticiones sin columnas seleccionadas.
  - Deshabilitación visual del input de nombre personalizado cuando una columna no está incluida.

### Verificación
- Frontend: `npx tsc --noEmit` EXIT 0; `npx next build` EXIT 0.

---

## 22. Scroll y contención de desbordamiento en el modal de conexiones

**Problema**: Al abrir el modal de creación/edición de conexiones a base de datos (`GeneralDialogConnection`), el formulario con los campos dinámicos del driver (host, puerto, db_name, schema, usuario, contraseña o TNS) sobrepasaba la altura de la pantalla y se desbordaba sin barra de desplazamiento.

### Causa raíz
`TemplateDialog` contenía un `<div>` con `max-h-[500px]` pero **sin `overflow-y-auto`**; en CSS un `max-height` sin propiedad de desbordamiento permite que los elementos hijos se salgan del contenedor. Además, `GeneralDialogConnection` utilizaba una clase no estándar `w-150`.

### Cambios realizados
- `components/common/templates/template-dialog.tsx`:
  - `DialogContent`: agregado `max-h-[90vh] flex flex-col overflow-hidden` para asegurar que el modal se adapte a cualquier resolución vertical sin salirse del viewport.
  - Contenedor de contenido: reemplazado `max-h-[500px]` por `flex-1 overflow-y-auto max-h-[calc(90vh-7rem)] px-2`, garantizando scroll vertical automático para todos los modales que usen la plantilla.
- `app/(dashboard)/setting/connections/components/dialog/GeneralDialogConnection.tsx`:
  - Ajustado a `sm:max-w-2xl flex flex-col` y `ClassNameContainer="pr-2 py-1"`.
- `app/(dashboard)/setting/connections/components/form/ConnectionFormInner.tsx`:
  - Barra de acciones (Cancelar, Probar conexión, Crear/Actualizar) configurada como `sticky bottom-0 bg-background/95 backdrop-blur py-2 border-t mt-2 z-10`, manteniéndose siempre accesible a la vista mientras el formulario se desplaza.

### Verificación
- Frontend: `npx tsc --noEmit` EXIT 0; `npx next build` EXIT 0.

---

## 23. Fix Oracle: `Undefined constant "Yajra\Pdo\OCI_DEFAULT"` (extensiones OCI8 y PDO_OCI en Docker)

**Error**: `{"message":"Undefined constant \"Yajra\\Pdo\\OCI_DEFAULT\""}` al probar o crear una conexión con driver Oracle.

### Causa raíz
El paquete `yajra/laravel-pdo-via-oci8` utiliza internamente la extensión nativa `oci8` de PHP (`OCI_DEFAULT` es una constante global provista por la extensión `oci8`).
El contenedor Docker de backend (`service_dynamic_report`) se construye sobre `deploy/local/Dockerfile.local`, el cual utilizaba `install-php-extensions` pero **no incluía `oci8` ni `pdo_oci`** en la lista de extensiones compiladas. En PHP 8+, al no existir la extensión, la constante no está definida y PHP lanza un `Error: Undefined constant "Yajra\Pdo\OCI_DEFAULT"`.

### Solución aplicada
1. **Instalación en caliente en el contenedor:**
   Se ejecutó `install-php-extensions oci8 pdo_oci` dentro del contenedor `service_dynamic_report`, compilando las extensiones con las librerías de Oracle Instant Client.
2. **Persistencia en Dockerfile:**
   Se actualizó [deploy/local/Dockerfile.local](file:///home/ubuntu/projects/sdi/sdi_dynamic-reports-service/deploy/local/Dockerfile.local#L34) añadiendo `oci8 pdo_oci` a la instrucción `RUN install-php-extensions` para que futuros rebuilds (`docker compose build`) conserven el soporte.
3. **Reinicio de procesos:**
   Se reinició el contenedor `service_dynamic_report` para que los procesos de `php artisan serve` y workers de colas carguen las nuevas extensiones dinámicas.

### Verificación
- `docker exec service_dynamic_report php -m | grep -i oci` devuelve `oci8` y `PDO_OCI`.
- `docker exec service_dynamic_report php -r 'echo defined("OCI_DEFAULT");'` devuelve `DEFINED: 0`.
- Instanciación de `Yajra\Pdo\Oci8` conecta directamente con el driver OCI sin el error de constante no definida.

---

## 24. Fix Oracle: `ORA-02248: invalid option for ALTER SESSION` (eliminación de `edition`)

**Error**: `Error Code: 2248 - ORA-02248: invalid option for ALTER SESSION` en posición 231 (`... NLS_NUMERIC_CHARACTERS = '.,' EDITION = ora$base`).

### Causa raíz
`OracleConnectionBuilder.php` incluía por defecto `'edition' => 'ora$base'` en el array de configuración de la conexión.
Al inicializar la conexión, el proveedor de servicio de Yajra (`Oci8ServiceProvider`) verifica `if (isset($config['edition']))` y agrega `EDITION = $config['edition']` al comando `ALTER SESSION SET ...`. En Oracle SQL, `EDITION` no es una opción válida para ser concatenada de esa forma dentro del `ALTER SESSION SET`, o la base de datos no tiene habilitado el soporte de Edition-Based Redefinition (EBR), disparando el error `ORA-02248`.

### Solución aplicada
- Se eliminó la clave `'edition' => 'ora$base'` de [OracleConnectionBuilder.php](file:///home/ubuntu/projects/sdi/sdi_dynamic-reports-service/app/Connections/OracleConnectionBuilder.php#L31).
- Al no estar presente en `$config`, `isset($config['edition'])` evalúa a `false`, por lo que Yajra ejecuta únicamente la configuración estándar de variables NLS (`NLS_TIME_FORMAT`, `NLS_DATE_FORMAT`, etc.) sin incluir la cláusula problemática.
- Se reinició el contenedor `service_dynamic_report` para actualizar el opcache.

### Verificación
- `php -l app/Connections/OracleConnectionBuilder.php` EXIT 0.
- Ejecución de prueba con `OracleConnectionBuilder` confirma `Has edition: NO`.
- La sentencia `ALTER SESSION` ya no contiene `EDITION = ora$base`.

---

## 25. Fix edición de reportes: navegación sin bloqueo en Paso 1 y merge inteligente de cabeceras en Paso 3

**Problemas**:
1. Al editar un reporte en el paso 1, el botón "Continuar" estaba deshabilitado (`disabled={!form.formState.isDirty}`). El usuario no podía avanzar a los siguientes pasos sin alterar la información.
2. Al ingresar al paso 3 (mapeo), no aparecían seleccionadas las columnas previamente guardadas ni se conservaban los nombres personalizados (`display_name`).

### Causa raíz
1. `StepDetails.tsx` requería que el formulario fuera `isDirty` para habilitar el botón "Continuar", pero en edición los valores iniciales coinciden con los guardados (`isDirty = false`). Además, la barra de pasos de `ReportWizard` limitaba el salto solo a pasos anteriores (`index < currentIndex`).
2. En `ReportWizard.tsx` y `types/report-type.ts`, las cabeceras se intentaban leer con `h.original_column`, `h.display_name`, `h.is_selected`, pero el backend (`HeaderResource`) las serializa dentro de `h.attributes`.
3. En `StepHeaderMapping.tsx`, al recibir `dryRunColumns` de la consulta, se mapeaban todas con `is_selected: true` y `display_name: col.attributes.label`, sobreescribiendo destructivamente cualquier configuración previa.

### Solución aplicada
- `types/report-type.ts`: actualizada la interfaz `ReportHeader` con `type`, `id` y `attributes: { report_id, original_column, display_name, is_selected }`.
- `app/(dashboard)/reports/components/wizard/ReportWizard.tsx`:
  - Hidratación resiliente de `headers` desde `h.attributes.*` o plano.
  - En `mode === "update"`, la barra de navegación permite hacer clic y saltar libremente a cualquiera de los 4 pasos.
  - Se pasa `report` a `StepHeaderMapping`.
- `app/(dashboard)/reports/components/wizard/StepDetails.tsx`:
  - Eliminada restricción `disabled={!form.formState.isDirty}`; habilitado inmediatamente si `name` y `database_connection_id` están presentes.
  - En `handleContinue`, si `form.formState.isDirty` en edición, guarda en backend (`saveReport`); si no, solo avanza en el store a `sql`.
  - Sincronización en tiempo real al store con `form.watch()`.
- `app/(dashboard)/reports/components/wizard/StepSql.tsx`:
  - En modo edición, se agrega botón "Continuar" hacia `headers` cuando la consulta no ha cambiado, evitando forzar una re-ejecución innecesaria.
  - Sincronización de `sql` en store al cambiar y al presionar "Atrás".
- `app/(dashboard)/reports/components/wizard/StepHeaderMapping.tsx`:
  - Algoritmo de merge inteligente: al detectar `dryRunColumns`, busca cada columna en las cabeceras previas para **preservar `is_selected` y `display_name`**. Las columnas nuevas se agregan con valor por defecto. Si no hubo dry-run, carga directamente las cabeceras guardadas.
  - Sincronización interactiva al store al alternar checkboxes, editar nombres y presionar "Atrás".

### Verificación
- `npx tsc --noEmit` EXIT 0.
- `npx next build` EXIT 0 (14/14 rutas generadas).

---

## 26. Fix React: `Cannot update a component (StepHeaderMapping) while rendering a different component`

**Error**: Al presionar seleccionar/deseleccionar todas las columnas (o modificar un checkbox) en el paso 3 del asistente, React lanzaba error de consola:
`Cannot update a component (StepHeaderMapping) while rendering a different component (StepHeaderMapping). at setHeaders (use-report-wizard-store.tsx:76:28)`

### Causa raíz
Dentro de los callbacks actualizadores de estado `setLocalHeaders((prev) => { ... })` de `toggleSelectAll` y `updateHeader`, se invocaba directamente la función `setHeaders(next)` del store externo de Zustand. Al actualizar Zustand sincrónicamente durante el procesamiento del estado de React, se disparaba una notificación de render cruzado hacia componentes suscritos mientras `StepHeaderMapping` estaba en transición de render.

### Solución aplicada
- Se desacopló la mutación del store Zustand dentro del callback funcional de `setLocalHeaders`: ahora `toggleSelectAll` y `updateHeader` modifican únicamente el estado local puro de React.
- Se implementó sincronización segura del estado hacia Zustand mediante `localHeadersRef` al desmontar el componente (`useEffect` cleanup), al presionar "Atrás" y al hacer clic en "Guardar y continuar" utilizando `useReportWizardStore.getState().setHeaders(...)`.

### Verificación
- `npx tsc --noEmit` EXIT 0.
- `npx next build` EXIT 0.

---

## 27. Fix carga inmediata de SQL en edición del reporte

**Error**: Al ingresar a editar un reporte por primera vez y avanzar al Paso 2 ("Consulta SQL"), la consulta SQL aparecía vacía y requería recargar la página varias veces para que cargara.

### Causa raíz
1. **Condición de carrera en ciclo de vida React / Zustand**:
   En `app/(dashboard)/reports/[id]/edit/page.tsx`, se ejecutaba `reset()` dentro de un `useEffect(..., [])`. En React, el `useEffect` de los componentes hijos (`ReportWizard`) se ejecuta antes que el `useEffect` del padre (`EditReportPage`). Cuando los datos del reporte ya estaban cacheados en React Query, `ReportWizard` montaba e hidrataba el store con `sqlQuery`. Inmediatamente después, el `useEffect` de `EditReportPage` corría y llamaba a `reset()`, borrando `sqlQuery: ""` y `connectionId: null`.
2. **Estado local en `StepSql`**:
   `useState(sqlQuery)` se evalúa únicamente al montar. Si en ese instante el store estaba vacío o aún resolviendo la petición asíncrona, el estado local quedaba en blanco de forma permanente al no tener fallback ni un `useEffect` reactivo de sincronización.

### Solución aplicada
- `app/(dashboard)/reports/[id]/edit/page.tsx`:
  - Se removió la llamada destructiva `reset()` en `EditReportPage`.
- `app/(dashboard)/reports/components/wizard/ReportWizard.tsx`:
  - Se eliminó el `reset()` redundante justo antes de la sincronización en el `useEffect([report?.id])`.
- `app/(dashboard)/reports/components/wizard/StepSql.tsx`:
  - Se añadió fallback directo a `report?.attributes.sql_query` tanto para `connectionId` como para la inicialización de `sql`: `storeSqlQuery || report?.attributes.sql_query || ""`.
  - Se agregó un `useEffect` que sincroniza el estado local y el store Zustand en cuanto `storeSqlQuery` o `report?.attributes.sql_query` estén disponibles.

### Verificación
- `npx tsc --noEmit` EXIT 0.
- `npx next build` EXIT 0 (14/14 rutas generadas).

---

## 28. Soporte para generación y envío de reportes en PDF

**Objetivo**: Permitir generar y entregar (email, FTP, descarga directa) reportes dinámicos en formato PDF.

### Backend (`sdi_dynamic-reports-service`)
- **Dependencia instalada**: `barryvdh/laravel-dompdf` (v3.1.2) con `dompdf/dompdf` (v3.1.6).
- **Plantilla Blade estilizada** (`resources/views/reports/pdf.blade.php`):
  - Encabezado con título del reporte, descripción, badge de categoría, fecha y hora de generación y total de registros.
  - Bloque visual de parámetros aplicados (`:param = valor`) cuando existan.
  - Tabla de datos con cabeceras fijas por página (`thead { display: table-header-group; }`), alternancia de filas (striped) y numeración correlativa.
  - Respeta la configuración `include_headers` de la programación (omite el encabezado de la tabla si está deshabilitado).
- **Generación en `ReportGeneratorService`**:
  - `storeReport`: extensión `'pdf' => 'pdf'`, despacha a `storePdf`.
  - `storePdf`: orientación adaptativa (horizontal/`landscape` si tiene más de 5 columnas para evitar que se amontonen, o `portrait` si son 5 o menos).
  - Numeración dinámica en el canvas de Dompdf ("Página X de Y" y membrete "SDI Dynamic Reports").
  - Almacena el binario en el disco S3/MinIO con `Storage::put`.
- **Entrega por email (`deliverViaEmail`)**:
  - Resolución dinámica del tipo MIME según la extensión del archivo (`pdf` $\rightarrow$ `application/pdf`, `xlsx` $\rightarrow$ OpenXML, etc.), permitiendo que clientes de correo reconozcan y previsualicen el adjunto nativamente.
- **Descarga directa**:
  - `ReportExecutionController@download` sirve el `.pdf` mediante `Storage::download` con Content-Type y filename correctos.
- **Tests unitarios**:
  - `tests/Unit/ReportPdfGenerationTest.php` verificando generación exitosa de `%PDF-` con y sin cabeceras, parámetros y filas vacías. 33 tests pasando en Pest.

### Frontend (`sdi_app-dynamic-reports`)
- `ColumnsSchedule.tsx`: insignia de formato con icono representativo según tipo (`FileSpreadsheet` para Excel/CSV, `FileType` para PDF y `FileText` para TXT).
- Compatible de forma nativa con el catálogo de formatos (`code = "pdf"`), `ScheduleDialog`, `ColumnsExecution` y el visor/descarga de ejecuciones.

### Verificación
- Backend: Pest `33 passed (69 assertions)` EXIT 0; `php -l` EXIT 0.
- Frontend: `npx tsc --noEmit` EXIT 0; `npx next build` EXIT 0 (14/14 rutas).

---

## 29. Selector jerárquico desplegable de categorías en el Wizard

**Objetivo**: Reemplazar el selector plano anterior por un componente desplegable interactivo (`CategoryTreeSelect`) que muestre inicialmente las categorías padre y permita desplegar/colapsar sucesivamente los niveles de subcategorías con iconos visuales, búsqueda y auto-expansión.

### Frontend (`sdi_app-dynamic-reports`)
- **Nuevo componente `CategoryTreeSelect.tsx`** (`app/(dashboard)/reports/components/wizard/CategoryTreeSelect.tsx`):
  - Popover adaptativo con botón trigger estilo input, icono de carpeta, nombre de la categoría seleccionada, ruta de ancestros (`(Padre > Hijo)`) y botón `X` para limpiar selección.
  - Árbol recursivo con navegación colapsable:
    - Inicialmente muestra solo las categorías raíz (padres sin `parent_id`).
    - Nodos con hijos muestran un botón chevron interactivo (`ChevronRight` colapsado / `ChevronDown` desplegado) e icono `Folder` / `FolderOpen`.
    - Al hacer clic en el chevron, despliega sus hijos directos con sangría y línea guía vertical (`border-l border-slate-200`).
    - Nodos terminales (sin hijos) muestran espaciador e icono `FileText`, indicando que no son expandibles.
    - Clic en la fila/nombre selecciona la categoría (sea padre o hija), actualiza el formulario y cierra el popover.
    - Opción superior "Ninguna (Sin categoría)" para desasociar categoría.
    - Campo de búsqueda en tiempo real que filtra por nombre y auto-despliega los ancestros de las coincidencias.
    - Auto-expansión en modo edición: al abrir el selector, abre automáticamente la cadena de ancestros de la categoría guardada para ubicarla en el árbol.
- **Integración en `StepDetails.tsx`**:
  - Reemplazo de `FormFieldInput` (react-select plano con `  └ `) por `Controller` de `react-hook-form` con `CategoryTreeSelect`.
  - Eliminación de la función obsoleta `buildCategoryOptions`.

### Verificación
- `npx tsc --noEmit` EXIT 0.
- `npx next build` EXIT 0 (14/14 rutas compiladas).

---

## 30. Implementación Integral de Doc Studio / Doc Builder (PDF y Word)

- **Ramas activas**: `doc_builder` en backend (`sdi_dynamic-reports-service`) y frontend (`sdi_app-dynamic-reports`).
- **Objetivo**: Estudio visual de diseño de documentos corporativos con exportación dual a PDF y Word (.docx), integración con reportes dinámicos para alimentar tablas y gráficas, y vinculación directa con programaciones (`report_schedules`).

### Backend (`sdi_dynamic-reports-service`):
- Instalación de `phpoffice/phpword` (^1.4) para generación nativa de documentos `.docx`.
- Actualización de `database/seeders/FileFormatSeeder.php` con formato `docx`.
- Migraciones:
  - `2026_09_03_000017_create_documents_table.php`: `name`, `description`, `category_id`, `page_settings`, `content`.
  - `2026_09_03_000018_add_document_template_id_to_report_schedules_table.php`: llave foránea opcional `document_template_id` en `report_schedules`.
- Modelos y Recursos:
  - `app/Models/Document.php` con `HasCacheInvalidation`, `HasSearchable`, casts para `page_settings` y `content`.
  - `app/Models/ReportSchedule.php`: campo `$fillable` `document_template_id` y relación `documentTemplate()`.
  - `app/Http/Resources/Document/DocumentResource.php`.
  - `app/Http/Resources/ReportSchedule/ReportScheduleResource.php`: incluye `document_template_id` y relación `document_template`.
  - `app/Http/Requests/Document/DocumentStoreRequest.php` y `DocumentUpdateRequest.php`.
- Servicios de Exportación:
  - `app/Services/DocumentPdfExportService.php`: generación en servidor con Dompdf, CSS `@page` exacto, numeración de páginas vía canvas (`Página {PAGE_NUM} de {PAGE_COUNT}`).
  - `resources/views/documents/pdf.blade.php`: plantilla Blade estilizada con soporte para filas multiculumna, textos enriquecidos, imágenes, tablas con bordes/zebra y gráficas.
  - `app/Services/DocumentWordExportService.php`: construcción nativa con PhpWord (secciones en twips, tablas sin borde para layout multiculumna, tablas de datos sombreadas, párrafos con estilos y formato).
  - `app/Services/DocumentService.php`: operaciones CRUD con caché y métodos de exportación.
  - `app/Http/Controllers/Api/v1/Document/DocumentController.php`: endpoints CRUD (`/documents`) + exportaciones (`exportPdf`, `exportWord`, `previewExportPdf`, `previewExportWord`).
  - `app/Services/ReportGeneratorService.php`: si la programación tiene `document_template_id`, inyecta dinámicamente las filas de la consulta SQL y parámetros (`{{report.name}}`, `{{date.today}}`, `{{rowCount}}`, `{{param:*}}`) en la plantilla de Doc Studio y exporta en PDF o Word. Soporta además entrega por email con MIME type exacto para `.docx`.
- Rutas: registradas bajo `/documents` en `routes/api/v1.php`.
- Pruebas Backend:
  - `tests/Unit/DocumentExportTest.php` (PDF y DOCX) → PASS.
  - `tests/Feature/DocumentApiTest.php` (CRUD y previews) → PASS.

### Frontend (`sdi_app-dynamic-reports`):
- Tipos y Servicios:
  - `types/document-type.ts`: `PageSettings`, `DocumentBlock`, `DocumentRow`, `DocumentColumn`, `DocumentSchema`, `DocumentItem`.
  - `types/schedule-type.ts`: actualizado con `document_template_id` y relación `document_template`.
  - `types/catalog-type.ts`: agregado código `docx` a `FileFormatCode`.
  - `services/document-service.ts`: API client con métodos CRUD, previews directos y exportación de blobs.
  - `services/schedule-service.ts`: actualizado `ScheduleFormValues` con `document_template_id`.
- Estado Global (Zustand):
  - `hooks/zustand/use-doc-studio-store.ts`: gestión reactiva del canvas en tiempo real (filas, partición de columnas 100%, 50/50, 70/30, 33%, 25%, bloques, selección, vista previa, configuración de página, dirty check).
- Componentes de Doc Studio (`app/(dashboard)/documents/components/studio/`):
  - `StudioHeader.tsx`: nombre editable, indicador de guardado, configuración de página, conmutador de vista previa, programar envío, menú de exportación (PDF / Word) y botón guardar.
  - `StudioSidebar.tsx`: paleta interactiva de filas y bloques (texto enriquecido, imagen, separador, salto de página, tabla dinámica, gráfica dinámica).
  - `StudioCanvas.tsx`: hoja virtual proporcional según tamaño (A4, A5, Carta, Oficio) y orientación (vertical/horizontal) con márgenes escalados y encabezado/pie de página.
  - `RowContainer.tsx` & `ColumnContainer.tsx`: partición flexible de columnas, reordenamiento arriba/abajo y eliminación.
  - `BlockRenderer.tsx`: enrutador visual con controles contextuales.
  - Bloques especializados:
    - `TextBlockView.tsx`: editor con barra flotante (H1-H4, párrafo, cita, negrita, cursiva, subrayado, alineación, color).
    - `ImageBlockView.tsx`: subida de imagen local (Data URI) o URL, controles de ancho (25%, 50%, 75%, 100%), alineación y leyendas.
    - `ChartBlockView.tsx`: gráficas SVG nativas interactivas (Barras, Líneas, Pastel/Dona) con edición manual o vinculación a reportes dinámicos.
    - `TableBlockView.tsx`: tabla con estilos zebra y bordes, edición de celdas manuales o vinculación a encabezados de reportes.
    - `DividerBlockView.tsx` & `PageBreakBlockView.tsx`.
  - `PageSettingsModal.tsx`: modal para configuración de papel, orientación, márgenes (con presets normal, estrecho, ancho) y encabezados/pies de página.
  - `ReportDataModal.tsx`: asistente modal para vincular tablas o gráficas con reportes dinámicos existentes y mapear columnas X e Y.
- Páginas y Navegación:
  - `app/(dashboard)/documents/page.tsx`: catálogo y galería de plantillas con búsqueda, tarjetas informativas, acciones rápidas de edición, exportación y programación.
  - `app/(dashboard)/documents/studio/page.tsx`: creación de nuevo documento.
  - `app/(dashboard)/documents/studio/[id]/page.tsx`: edición y rehidratación de documento existente.
  - `components/ui/app-sidebar.tsx`: enlace directo a "Doc Studio" en la navegación principal.
  - `app/(dashboard)/reports/schedule/components/ScheduleDialog.tsx`: selector de plantilla corporativa de Doc Studio cuando el formato elegido es PDF o Word.
  - `app/(dashboard)/reports/schedule/components/ColumnsSchedule.tsx`: badge con nombre de la plantilla en la tabla de programaciones.
  - `app/(dashboard)/reports/page.tsx`: estado vacío enriquecido cuando no hay ningún reporte registrado en el sistema, mostrando icono ilustrativo grande, texto llamativo y botón de acción principal *"Crear mi primer reporte"* redirigiendo a `/reports/new`.
  - `app/(dashboard)/setting/connections/page.tsx`: estado vacío enriquecido cuando no hay conexiones a bases de datos, con icono grande `Database`, texto llamativo y botón *"Crear mi primera conexión"* que abre el modal in situ.
  - `app/(dashboard)/setting/categories/page.tsx`: estado vacío enriquecido cuando no hay categorías, con icono grande `FolderTree`, texto llamativo y botón *"Crear mi primera categoría"* que abre el modal in situ.

### Verificación:
- Frontend: `npx tsc --noEmit` EXIT 0. `npx next build` EXIT 0 (16/16 páginas generadas exitosamente).
- Backend: `pest tests/Unit/DocumentExportTest.php` EXIT 0. `pest tests/Feature/DocumentApiTest.php` EXIT 0.

---

## 18. Wizard de Requisitos Previos en `/reports/new` (Conexiones y Categorías)

- **Objetivo**: Si un usuario ingresa a `/reports/new` y aún no existen conexiones a bases de datos o categorías de reportes registradas, no mostrar directamente el formulario vacío del reporte. En su lugar, guiar al usuario mediante un asistente interactivo (`ReportPrerequisitesWizard`) reutilizando los modales de creación en la misma página (`in situ`), desbloqueando el asistente del reporte en cuanto se cumplan ambos requisitos.
- **Implementación**:
  - `app/(dashboard)/reports/components/wizard/ReportPrerequisitesWizard.tsx`: Stepper visual de 3 pasos (1: Conexión a BD, 2: Categoría, 3: Creador de Reporte bloqueado). Tarjetas de acción con iconos llamativos (`Database` y `FolderTree` con badges), botón de acción directa "Crear mi primera conexión" y "Crear mi primera categoría", y estado completado cuando el usuario registra cada elemento.
  - `app/(dashboard)/reports/new/page.tsx`: Consulta `useListConnections` y `useListReportCategories`. Si falta algún requisito, renderiza `ReportPrerequisitesWizard` e integra `<GeneralDialogConnection />` y `<GeneralDialogCategory />`. React Query invalida la caché y actualiza la vista reactivamente al guardar.
  - `app/(dashboard)/reports/components/wizard/StepDetails.tsx`: Efecto de preselección inteligente que asigna automáticamente la conexión y/o categoría cuando solo existe 1 opción disponible en el sistema.

---

## 19. Corrección de Modales Duplicados y en Blanco (useModalActionStore)

- **Problema**: Al coexistir múltiples diálogos generales (`GeneralDialogConnection` y `GeneralDialogCategory`) en una misma página como `/reports/new`, al abrir un modal (`createConnection`), ambos componentes leían `open === true` del store de Zustand. El diálogo que no correspondía no encontraba su formulario y renderizaba un modal vacío superpuesto o en segundo plano.
- **Solución**: Se agregaron guardas estrictas de renderizado en `GeneralDialogConnection`, `GeneralDialogCategory` y `GeneralDialogExample`:
  - Solo renderizan si `open === true` y además el `name` del store pertenece a su respectivo `enum` (`ModalsNameConnection`, `ModalsNameCategory`, `ModalsNameExample`), retornando `null` en caso contrario.

---

## 20. Doc Studio a Pantalla Completa (Full-Screen Workspace)

- **Objetivo**: Hacer que el estudio de documentos (`/documents/studio` y `/documents/studio/[id]`) aproveche el 100% del viewport sin estar restringido por el encabezado gris de 64px, el sidebar lateral de la aplicación ni el padding interior de 20px.
- **Implementación**:
  - `app/(dashboard)/layout.tsx`: Detecta con `usePathname()` si la ruta actual inicia con `/documents/studio`. En dicho caso, no renderiza `AppSidebar`, ni el header del dashboard ni el wrapper con padding; renderiza directamente un `<main className="h-screen w-screen overflow-hidden bg-background">` con auth y storage checks intactos.
  - `app/(dashboard)/documents/components/studio/DocStudio.tsx`: Se adaptó a `h-screen w-screen`. Se integró el estado de apertura del panel lateral de herramientas (`isSidebarOpen`) para permitir ocultarlo/mostrarlo dinámicamente.
  - `app/(dashboard)/documents/components/studio/StudioHeader.tsx`:
    - Botón para colapsar/expandir el panel lateral (`PanelLeftClose` / `PanelLeftOpen`), otorgando el 100% del ancho horizontal a la hoja del documento.
    - Botón de pantalla completa del navegador (`Maximize2` / `Minimize2`) mediante `requestFullscreen()` y `exitFullscreen()`.
  - `app/(dashboard)/documents/studio/[id]/page.tsx`: Actualizado el estado de carga a `h-screen w-screen`.

---

## 21. Renderizado Inmediato de Tablas y Mapeo de Columnas Renombradas en Doc Studio

- **Problemas resueltos**:
  1. **Tablas vacías**: Al vincular una consulta SQL a un bloque de tipo tabla en Doc Studio, solo se guardaban los encabezados (`headers`), dejando `rows` en blanco (`[]`), requiriendo recargas o exportaciones externas para ver los datos.
  2. **Gráficas con etiqueta "Item"**: Si las columnas del reporte tenían un `display_name` renombrado (ej. `"Producto"` en vez de `cod_prod`), el bloque de gráfica buscaba `r[xAxisKey]` usando el nombre renombrado mientras que los registros de base de datos venían indexados con el nombre de columna original, cayendo en el fallback genérico `"Item"`.
- **Implementación**:
  - `app/(dashboard)/documents/components/studio/ReportDataModal.tsx`:
    - Función universal `getRowValue(row, columnKey, columnMappings)` que resuelve valores por clave directa, insensible a mayúsculas, o mediante el mapeo bidireccional `original_column <-> display_name`.
    - Guarda `columnMappings` en la definición del bloque (`reportQueryConfig.columnMappings`).
    - Al vincular a una **tabla**: ejecuta inmediatamente `executeReportQueryService(limit: 15)` y mapea las filas devueltas a `block.rows`.
    - Al vincular a una **gráfica**: ejecuta `executeReportQueryService(limit: 10)` y transforma las filas con `getRowValue` para poblar `label` (valor real de base de datos) y `value` (métrica numérica).
  - `app/(dashboard)/documents/components/studio/blocks/TableBlockView.tsx`:
    - Botón de recarga en vivo con `RefreshCw` que consulta la base de datos y refresca las filas en el canvas.
    - Estado vacío interactivo con botón directo de recarga si no hay filas cargadas.
  - `app/(dashboard)/documents/components/studio/blocks/ChartBlockView.tsx`:
    - Botón de actualización de datos en vivo con `RefreshCw` para re-ejecutar la consulta y refrescar las métricas.
    - Muestra un badge con las columnas vinculadas (`Eje X` y `Métrica`).
  - **Backend** (`sdi_dynamic-reports-service`):
    - `app/Services/ReportGeneratorService.php`:
      - Se implementó `extractRowVal(array $rArr, ?string $key, ?ReportSchedule $schedule)` para resolver claves exactas, insensibles a mayúsculas y mapeadas a través de `$schedule->report->headers`.
      - Se actualizó el bloque de gráfica en `storeWithDocumentTemplate` para usar `extractRowVal`, asegurando que las exportaciones en PDF y Word reflejen los valores reales independientemente de si la columna fue renombrada.
    - `tests/Unit/DocumentExportTest.php`:
      - Añadida prueba unitaria `test_it_resolves_renamed_columns_for_charts` que valida la resolución directa, insensible a mayúsculas y mapeada.

---

## 22. Límite de Filas en Canvas vs Exportación Completa, Reordenación de Columnas y Widget de Imagen en Doc Studio

- **Requerimientos**:
  1. Configurar el número máximo de filas a mostrar en el editor/canvas para tablas (`maxRows`), pero en la exportación (PDF y Word) exportar todos los registros de la consulta.
  2. Permitir reordenar las columnas de las tablas con sincronización de celdas.
  3. Soporte para widget de imagen con guardado en el filesystem por defecto del sistema (`.env` / `FILESYSTEM_DISK`).
- **Implementación**:
  - **Backend** (`sdi_dynamic-reports-service`):
    - `routes/api/v1.php`: Nuevas rutas `POST /documents/upload-image` y `GET /documents/image/{path}`.
    - `app/Http/Controllers/Api/v1/Document/DocumentController.php`:
      - `uploadImage`: Guarda la imagen mediante `Storage::putFile('documents/images', $file)` utilizando el disco por defecto de Laravel (`FILESYSTEM_DISK`). Devuelve `{ path, url, filename, size }`.
      - `getImage`: Transmite la imagen con `Storage::response($path)`.
    - `app/Services/DocumentService.php`:
      - `hydrateDocumentData`: En exportaciones directas de Doc Studio (`exportPdf`, `exportWord`), ejecuta la consulta del reporte en caliente contra su conexión sin límite de canvas e inyecta la totalidad de los registros de BD en `$block['rows']`.
    - `app/Services/ReportGeneratorService.php`:
      - En exportaciones programadas (`storeWithDocumentTemplate`), se eliminó la restricción por `$block['maxRows']`, exportando la totalidad de registros de la consulta.
      - Se respeta el orden de columnas configurado por el usuario en `$block['headers']`, mapeando celdas con `extractRowVal`.
    - `app/Services/DocumentPdfExportService.php` y `app/Services/DocumentWordExportService.php`:
      - En PDF: Convierte imágenes de `Storage` a Base64 Data URI en memoria para que Dompdf las dibuje instantáneamente sin peticiones HTTP.
      - En Word: Si el bloque cuenta con `path`, lee el archivo directamente desde `Storage::get($path)`.
    - Pruebas añadidas: `test_can_upload_and_stream_image` en `DocumentApiTest.php`.
  - **Frontend** (`sdi_app-dynamic-reports`):
    - `types/document-type.ts`: `ImageBlock` extendido con `path`, `filename`, `size`. `TableBlock` con `maxRows` y `columnMappings`.
    - `services/document-service.ts`: `uploadDocumentImage(file)` enviando multipart/form-data.
    - `app/(dashboard)/documents/components/studio/blocks/ImageBlockView.tsx`:
      - Carga real de imágenes en backend con spinner (`isUploading`), Drag & Drop interactivo, guardado de `url` y `path`, y controles de ancho, alineación, leyenda y eliminación.
    - `app/(dashboard)/documents/components/studio/blocks/TableBlockView.tsx`:
      - Selector de `maxRows` en la barra de control (5, 10, 15, 25, 50, 100).
      - Renderizado en canvas limitado a `rows.slice(0, maxRows)`.
      - Badge informativo con filas mostradas vs totales.
      - Reordenación de columnas mediante flechas `ChevronLeft` y `ChevronRight` inline en cada `<th>`, y modal completo "Reordenar Columnas" con lista y botones subir/bajar.
      - Sincronización estricta de encabezados y celdas al reordenar.
    - `app/(dashboard)/documents/components/studio/ReportDataModal.tsx`:
      - Selector de filas iniciales para el editor y persistencia de `maxRows`.

---

## 23. Refactorización de Subida de Imágenes (FormRequest, Service, Resource, URLs S3) y UX Doc Studio (Drawer de Propiedades, Zoom y Deshacer/Rehacer)

- **Requerimientos**:
  1. Backend: Refactorizar la subida de imágenes creando un `FormRequest` (`DocumentImageUploadRequest`) para validar parámetros, mover la lógica de negocio a `DocumentService@uploadImage`, retornar un `JsonResource` (`DocumentImageResource`) y devolver la URL directa de S3 (`Storage::url($path)`), dado que la carpeta del bucket cuenta con permisos públicos de visualización.
  2. Frontend: Evitar el desbordamiento de controles y barras de herramientas dentro de los widgets en columnas estrechas (diseños de 2, 3 o 4 columnas), moviendo la configuración a un Drawer / Inspector lateral derecho al seleccionar cualquier bloque.
  3. Frontend: Añadir controles interactivos de Zoom en el canvas (Zoom In, Zoom Out, escala porcentual 50% - 200% y reset a 100%).
  4. Frontend: Añadir historial de Deshacer y Rehacer (Undo / Redo) con atajos de teclado (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`) y botones dedicados en el header.

- **Implementación**:
  - **Backend** (`sdi_dynamic-reports-service`):
    - `app/Http/Requests/Document/DocumentImageUploadRequest.php`:
      - Valida el archivo `image` como requerido, tipo imagen, mimes permitidos (`jpeg,png,jpg,gif,svg,webp`) y tamaño máximo de 10 MB (10240 KB), con mensajes en español y `failedValidation` arrojando `HttpResponseException(422)`.
    - `app/Http/Resources/Document/DocumentImageResource.php`:
      - Transforma el array devuelto por el servicio a `{ path, url, filename, size, mime_type }`.
    - `app/Services/DocumentService.php`:
      - Método `uploadImage(UploadedFile $file): array`:
        - Almacena el archivo con `Storage::putFile('documents/images', $file)`.
        - Resuelve la URL pública con `Storage::url($path)`.
        - Retorna los metadatos completos para el Resource.
    - `app/Http/Controllers/Api/v1/Document/DocumentController.php`:
      - `uploadImage(DocumentImageUploadRequest $request)` orquesta la validación, delega en `DocumentService` y responde con `DocumentImageResource` en HTTP 201 Created.
    - `tests/Feature/DocumentApiTest.php`:
      - Prueba `test_can_upload_and_stream_image` actualizada para verificar el nuevo schema con `mime_type` y respuesta 201 Created.
  - **Frontend** (`sdi_app-dynamic-reports`):
    - `hooks/zustand/use-doc-studio-store.ts`:
      - Añadida interfaz `HistorySnapshot` (`rows`, `pageSettings`, `name`).
      - Implementados estados `past`, `future`, `canUndo`, `canRedo` y acciones `takeSnapshot`, `undo`, `redo`.
      - Captura de snapshots automáticos en todas las mutaciones de filas, columnas y bloques.
      - Añadido control de Zoom: estado `zoom` (porcentaje numérico), y acciones `setZoom`, `zoomIn`, `zoomOut`, `resetZoom`.
    - `app/(dashboard)/documents/components/studio/StudioPropertiesDrawer.tsx` (Nuevo):
      - Inspector lateral derecho unificado (`w-80 border-l`) que se abre al seleccionar un bloque:
        - **ImageBlock**: Preview, badges con nombre y tamaño, botón para reemplazar/subir imagen a S3, selector de ancho porcentual (25%, 50%, 75%, 100%), alineación (izquierda, centro, derecha), campo de leyenda y botón de eliminación.
        - **TableBlock**: Selector de origen (manual vs reporte), selector de reporte vinculado, botón de recarga en caliente de la consulta, selector de `maxRows` visibles en canvas, reordenador de columnas con flechas mover arriba/abajo, y toggles de estilo (filas alternadas, bordes).
        - **ChartBlock**: Selector de tipo de gráfica (barras, líneas, pastel), título, reporte vinculado, refrescar consulta y editor de puntos manuales (etiqueta y valor).
        - **TextBlock**: Selectores de jerarquía tipográfica (`h1`-`h4`, `p`, `quote`), formatos de texto (negrita, cursiva, subrayado), alineaciones y editor de área de texto ampliado.
        - **DividerBlock** y **PageBreakBlock**: Detalles e información descriptiva del separador y salto de página.
    - `app/(dashboard)/documents/components/studio/blocks/`:
      - `ImageBlockView.tsx`, `TableBlockView.tsx`, `ChartBlockView.tsx`, `TextBlockView.tsx`: Eliminadas todas las barras flotantes y controles superpuestos que desbordaban en columnas angostas. El canvas ahora ofrece una visualización limpia, precisa y 100% WYSIWYG.
    - `app/(dashboard)/documents/components/studio/StudioCanvas.tsx`:
      - Hoja del documento escalada fluidamente con `transform: scale(zoom / 100)` y centrado dinámico.
      - Añadido widget pill flotante en esquina inferior derecha con controles `-`, indicador porcentual interactivo y `+`.
    - `app/(dashboard)/documents/components/studio/StudioHeader.tsx`:
      - Añadidos botones Deshacer (`Undo2`) y Rehacer (`Redo2`) con estado deshabilitado reactivo según `canUndo`/`canRedo`.
      - Menú desplegable con niveles de zoom predefinidos (50%, 75%, 90%, 100%, 125%, 150%, 200%).
    - `app/(dashboard)/documents/components/studio/DocStudio.tsx`:
      - Integración de `StudioPropertiesDrawer` en el layout general del Studio.
      - Atajos de teclado universales: `Ctrl+Z` / `Cmd+Z` para Deshacer, `Ctrl+Y` / `Ctrl+Shift+Z` para Rehacer, y `Escape` para cerrar el drawer deseleccionando el bloque actual.

---

## 24. Corrección de Carga de Imágenes en Exportación a PDF y Word (S3, Base64 y Conversión WebP)

- **Problema**: Al exportar documentos de Doc Studio tanto a PDF como a Word, las imágenes no se mostraban (imágenes rotas o descartadas).
- **Causas Raíz**:
  1. La expresión regular en `DocumentPdfExportService` y `DocumentWordExportService` buscaba `#documents/image/(.+)$#` (el endpoint anterior), mientras que en S3/MinIO los archivos se almacenan en `documents/images/...` (plural). Al no coincidir, nunca extraía la ruta de almacenamiento relativa.
  2. En el entorno Docker, la URL pública `http://127.0.0.1:9000/test/documents/images/...` no es alcanzable internamente desde el contenedor de Laravel (`Connection refused`), ya que MinIO corre en el host `minio:9000` de la red Docker.
  3. `PhpWord` no admite imágenes WebP de forma nativa (solo JPEG, PNG, GIF, BMP) y fallaba al procesar imágenes WebP subidas.
  4. En PHP, el bucle anidado con `foreach ($row['columns'] ?? [] as &$col)` operaba sobre copias temporales creadas por el operador `??`, impidiendo mutar `$docRows` correctamente.
- **Implementación**:
  - **Backend** (`sdi_dynamic-reports-service`):
    - `app/Traits/ResolvesDocumentImages.php` [NEW]:
      - Trait centralizado con el método `resolveImageBinary(array $block): ?array`.
      - Soporta Data URIs Base64 nativos (`data:image/...;base64,...`).
      - Extrae la ruta de almacenamiento desde URLs completas de S3 o relativas con regex flexible `#(?:\b|/)(documents/images?/[^?\#\s]+)#i`.
      - Lee los bytes directamente de los discos configurados (`s3`, `config('filesystems.default')`, `public`, `local`).
      - Para URLs HTTP que apunten a `127.0.0.1:9000`, las redirige automáticamente al endpoint interno de Docker (`http://minio:9000`).
      - Detecta el tipo MIME mediante `finfo(FILEINFO_MIME_TYPE)` garantizando exactitud.
    - `app/Services/DocumentPdfExportService.php` [MODIFIED]:
      - Utiliza `ResolvesDocumentImages`.
      - En `normalizeDocumentData`, muta mediante asignación directa por índices `$docRows[$rIdx]['columns'][$cIdx]['blocks'][$bIdx]['url']` transformando cada imagen a Data URI Base64 en memoria (`data:<mime>;base64,...`).
      - Dompdf dibuja las imágenes 100% en memoria sin requerir peticiones de red HTTP.
    - `app/Services/DocumentWordExportService.php` [MODIFIED]:
      - Utiliza `ResolvesDocumentImages`.
      - En `renderImageBlock`, si la imagen es WebP, la convierte en memoria a PNG mediante GD (`imagecreatefromstring` e `imagepng`) permitiendo compatibilidad total con `PhpWord`.
      - Escribe un archivo temporal con extensión adecuada, la inserta en el contenedor con su ancho y alineación, y limpia el temporal en bloque `finally`.
    - `resources/views/documents/pdf.blade.php` [MODIFIED]:
      - Ajustados estilos de `<img>` a `style="width: {{ $imgWidth }}%; max-width: 100%; height: auto;"`.
    - `tests/Unit/DocumentExportTest.php` [MODIFIED]:
      - Añadida prueba `test_it_exports_document_with_real_s3_image_to_pdf_and_word` que valida exportación a PDF y Word con imagen en S3, extracción desde URL pura sin path, transformación a Base64 y Data URIs.
      - **5 passed (22 assertions)**.

---

## 25. Corrección de Imágenes en Word (.docx) y Generación Visual de Gráficas como Imágenes en PDF y Word

- **Problemas**:
  1. En PDF las imágenes cargaban correctamente, pero en Word (.docx) las imágenes no aparecían en el documento generado.
  2. Los widgets de gráficas (barras, líneas, pastel) se renderizaban como tablas de texto en Word o barras HTML simplificadas en PDF en lugar de verse como la gráfica visual del lienzo de Doc Studio.
- **Causas Raíz**:
  - En `PhpWord`, el método `$container->addImage($tmpFile)` no copia los bytes de la imagen a memoria de inmediato; solo guarda la ruta de origen en la estructura del objeto. Al llamar a `@unlink($tmpFile)` en el bloque `finally` inmediato de `renderImageBlock`, el archivo desaparecía del disco antes de que el `$writer->save($tempFile)` final empaquetara el archivo `.docx` (formato ZIP), haciendo que la imagen se descartara silenciosamente.
  - No existía un mecanismo para convertir las gráficas SVG de Doc Studio en imágenes visuales reales (PNG) para incrustarlas en los documentos Word y PDF.
- **Implementación**:
  - **Backend** (`sdi_dynamic-reports-service`):
    - `app/Services/DocumentWordExportService.php` [MODIFIED]:
      - Eliminado el `@unlink($tmpFile)` prematuro de `renderImageBlock`. Los archivos temporales se encolan en `$this->temporaryFiles[]` y se limpian de manera segura en el `finally` de `export()` **después** de invocar `$writer->save($tempFile)`. Con esto, `PhpWord` empaqueta con éxito las imágenes en `word/media/image*.png`.
      - `renderChartBlock` actualizado: Si viene `chartImage` (Base64 desde el canvas del frontend) o si se genera vía `ChartImageService`, se incrusta como imagen real en el documento Word.
    - `app/Services/ChartImageService.php` [NEW]:
      - Servicio de generación de gráficas visuales en PNG usando PHP GD completo con antialiasing y fuentes DejaVu Sans (`/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`).
      - Soporta tipos `bar`, `line` y `pie` con paleta corporativa idéntica al frontend, grillas y etiquetas. Sirve como generador autónomo para envíos programados / API sin navegador.
    - `app/Services/DocumentPdfExportService.php` [MODIFIED]:
      - En `normalizeDocumentData`, si el bloque es `chart`, resuelve su imagen (usando `chartImage` o generándola con `ChartImageService`) y la convierte a Data URI Base64.
    - `resources/views/documents/pdf.blade.php` [MODIFIED]:
      - En `@elseif($type === 'chart')`, renderiza la imagen `<img>` con `width: 100%; max-width: 100%; height: auto;` manteniendo fallback a barras HTML.
    - `tests/Unit/DocumentExportTest.php` [MODIFIED]:
      - Añadida prueba `test_it_exports_charts_as_images_to_pdf_and_word` que verifica la generación de gráficas como imagen en PDF y valida con `ZipArchive` que el `.docx` contiene la imagen generada en `word/media/`.
      - **6 passed (31 assertions)** en backend.
  - **Frontend** (`sdi_app-dynamic-reports`):
    - `lib/chart-rasterizer.ts` [NEW]:
      - Helper `enrichSchemaWithChartImages(schema: DocumentSchema)`: Localiza los elementos `<svg id="chart-svg-{id}">` en el DOM, los rasteriza con fondo blanco y escala 2x (HiDPI) a través de un `<canvas>` fuera de pantalla, dibuja el título centrado en la parte superior y devuelve el esquema con `chartImage: "data:image/png;base64,..."`.
    - `app/(dashboard)/documents/components/studio/blocks/ChartBlockView.tsx` [MODIFIED]:
      - Asignado ID único `id={`chart-svg-${block.id}`}` a los SVGs de barras, líneas y pastel.
      - En gráfico de pastel (`pie`), la leyenda ahora se dibuja directamente dentro del SVG garantizando que al exportar la imagen incluya tanto el donut como sus etiquetas y porcentajes.
    - `app/(dashboard)/documents/components/studio/DocStudio.tsx` [MODIFIED]:
      - En `handleExportPdf` y `handleExportWord`, invoca `enrichSchemaWithChartImages(getSchema())` antes de solicitar la descarga, garantizando un resultado WYSIWYG idéntico al lienzo.
    - `types/document-type.ts` [MODIFIED]:
      - Añadido `chartImage?: string | null;` a la interfaz `ChartBlock`.

---

## 26. Fix selección activa de pestañas (tabs) en `/reports`

- **Problema**: En la vista de reportes (`/reports`), al navegar a otras pestañas como "Programación" (`/reports/schedule`) o "Historial de ejecuciones" (`/reports/executions`), la pestaña "Reportes" permanecía permanentemente seleccionada como activa al mismo tiempo que la pestaña actual.
- **Causa Raíz**:
  - En `app/(dashboard)/reports/layout.tsx`, la condición de activación evaluaba `const active = pathname.startsWith(element.path)`.
  - Dado que las rutas de las otras pestañas (`/reports/schedule` y `/reports/executions`) comienzan literalmente con la cadena `"/reports"`, la condición `pathname.startsWith("/reports")` siempre devolvía `true` en todas las pantallas del módulo de reportes.
- **Solución**:
  - Se implementó un selector de ruta por especificidad máxima (la ruta coincidente más larga):
    ```tsx
    const matchingRoutes = routes.filter(
      (r) => pathname === r.path || pathname.startsWith(`${r.path}/`)
    );
    const activeRoute = matchingRoutes.reduce<(typeof routes)[0] | null>(
      (best, r) => (!best || r.path.length > best.path.length ? r : best),
      null
    );
    const active = activeRoute?.path === element.path;
    ```
  - Se replicó la misma protección en `components/ui/page-tabs.tsx` para evitar regresiones análogas en el componente genérico.
- **Verificado**: `npx tsc --noEmit` exit 0. Al estar en `/reports/schedule`, únicamente "Programación" queda activa; al estar en `/reports/executions`, únicamente "Historial de ejecuciones" queda activa; y al estar en `/reports` (o `/reports/new` / `/reports/[id]/edit`), la pestaña "Reportes" es la única activa.

---

## 27. Soporte para Oracle en la API para entornos de despliegue dev y prod

**Contexto**:
La API de reportes dinámicos contaba con soporte de código para Oracle (`yajra/laravel-oci8`, `OracleConnectionBuilder`, `OracleColumnRetriever`) y en el entorno local (`deploy/local/Dockerfile.local` con Debian Bookworm + `install-php-extensions oci8 pdo_oci`). Sin embargo, los entornos de despliegue `dev` (`deploy/dev/Dockerfile.dev`) y `prod` (`deploy/prod/Dockerfile.prod`) estaban construidos sobre `php:8.4-fpm-alpine`, el cual carecía de Oracle Instant Client, `oci8` y `pdo_oci`, y presentaba incompatibilidades críticas de runtime debido a `musl libc`.

**Solución aplicada**:
1. **Migración de Dockerfiles de Dev y Prod a Debian Bookworm**:
   - `sdi_dynamic-reports-service/deploy/dev/Dockerfile.dev` y `sdi_dynamic-reports-service/deploy/prod/Dockerfile.prod` migrados a base `php:8.4-fpm-bookworm`.
   - Instalación de librerías del sistema para Oracle (`libaio1`), Nginx, Supervisor, Git, Curl y Unzip.
   - Instalación automatizada mediante `install-php-extensions`: `pdo_pgsql`, `pgsql`, `pdo_mysql`, `gd`, `zip`, `bcmath`, `pcntl`, `opcache`, `redis`, `rdkafka`, `opentelemetry`, `oci8`, `pdo_oci`.
   - OPcache ajustado para desarrollo (`validate_timestamps=1`) y producción (`validate_timestamps=0`, 256M buffer).
2. **Creación de descriptores Docker Compose para Dev y Prod**:
   - Creado `sdi_dynamic-reports-service/docker-compose-dev.yaml` (`service_dynamic_report_dev` en puerto 8087 en `dokploy-network`).
   - Creado `sdi_dynamic-reports-service/docker-compose-prod.yaml` (`service_dynamic_report_prod` en puerto 8087 en `dokploy-network`).
   - Registrado `sdi_dynamic-reports-service` en `/home/ubuntu/projects/sdi/deploy/docker-compose_services.dev.yaml`.
3. **Configuración de base de datos**:
   - Registrada la conexión `'oracle'` en `sdi_dynamic-reports-service/config/database.php` con mapeo a variables `DB_ORACLE_*`.
   - Documentadas las variables de entorno Oracle en `sdi_dynamic-reports-service/.env.example`.

---

## 28. Gestión de Usuarios (CRUD sin "C"), Sincronización con Auth Service y Asignación de Reportes

- **Contexto**:
  La plataforma requiere gestionar usuarios autorizados para acceder a los reportes dinámicos. Dado que los usuarios se originan en el servicio central de autenticación (`sdi_auth-service`), no existe la acción de "Crear" (CRUD sin la C). Los usuarios se sincronizan automáticamente con base en sus permisos para la aplicación de reportes y se gestiona una relación N:M para autorizar la descarga de reportes específicos por usuario.

- **Backend (`sdi_dynamic-reports-service`)**:
  - **Migraciones**:
    - `2026_09_04_000019_add_user_auth_id_to_users_table.php`: Agrega columna indexada `user_auth_id` y permite `password` nulo.
    - `2026_09_04_000020_create_report_user_table.php`: Tabla pivote `report_user` (`user_id`, `report_id`, unique, cascada onDelete).
  - **Modelos**:
    - `App\Models\User`: Agregado `user_auth_id` a `$fillable` y `$casts`, relación `reports(): BelongsToMany`, método `canDownloadReport(int|Report $report)`.
    - `App\Models\Report`: Relación `users(): BelongsToMany`.
  - **Configuración Dinámica por Variables de Entorno**:
    - `config/services.php`: Entrada `sdi_auth_service` con `base_url` (`SDI_AUTH_SERVICE_URL`), `application_id` (`SDI_AUTH_APPLICATION_ID`, defecto 9 para "Reportes"), y `users_endpoint` (`SDI_AUTH_USERS_ENDPOINT`).
  - **Sincronización (Job & Comando Artisan)**:
    - `App\Jobs\User\SyncUsersJob`: Job que consulta el endpoint del Auth Service (`http://sdi_auth-service/api/v1/applications/{application_id}/users`), procesa la respuesta JSON:API y realiza un `User::updateOrCreate(['user_auth_id' => $authId], ['name' => ..., 'email' => ...])`.
    - `App\Console\Commands\SyncUsersCommand`: Comando `reports:sync-users {--application-id=} {--url=} {--sync}` para disparar la sincronización manual o programada por cola/síncrona.
  - **API & Controlador**:
    - `app/Http/Controllers/Api/v1/User/UserController.php`: Implementa `index`, `show`, `update`, `destroy`, `syncUsers`, `getReports`, `assignReports`. Sin método `store`.
    - `app/Http/Requests/User/AssignReportsRequest.php`: Validación para asignación de IDs de reportes (`report_ids.*`).
    - `app/Http/Requests/User/UserListRequest.php`: Filtro por `user_auth_id`, `name`, `email`.
    - `app/Http/Requests/User/UserUpdateRequest.php`: Edición de nombre, correo y reportes opcionales.
    - `app/Http/Resources/User/UserResource.php`: Expone `user_auth_id`, `reports_count`, y relación `reports` condicional.
    - `routes/api/v1.php`:
      - `POST api/v1/users/sync`
      - `GET api/v1/users/{user}/reports`
      - `PUT api/v1/users/{user}/reports`
      - `apiResource('users', UserController::class)->except(['store'])`
  - **Tests**:
    - `tests/Feature/UserManagementTest.php`: 6 pruebas automáticas pasando (100% éxito: listado, show, update, asignación de reportes, sincronización HTTP mockeada, y eliminación con desvinculación).

- **Frontend (`sdi_app-dynamic-reports`)**:
  - **Autenticación en cliente HTTP**:
    - `lib/request-report.ts`: Inyecta el token Bearer (`Authorization: Bearer <token>`) desde `storage.get(ACCESS_TOKEN)` para peticiones a la API de reportes.
  - **Ruta `/users` y Módulo**:
    - `app/(dashboard)/users/page.tsx`:
      - Encabezado con `CardHomePage title="Gestión de Usuarios"`.
      - Buscador en tiempo real con debounce.
      - Botón "Sincronizar con Auth" con spinner interactivo (`useUserActions@syncUsers`).
      - Tabla de usuarios con avatares, nombre, correo, ID de Auth central, badge de reportes asignados y fecha de registro.
      - Estados vacíos ilustrados (sin usuarios en el sistema o búsqueda sin coincidencias).
    - `app/(dashboard)/users/components/dialog/AssignReportsModal.tsx`:
      - Modal de asignación múltiple de reportes a un usuario.
      - Muestra tarjetas de reporte con categoría y conexión.
      - Buscador interno de reportes y botón "Marcar todos / Deseleccionar".
      - Contador reactivo de reportes seleccionados y guardado en un solo clic.
    - `app/(dashboard)/users/components/dialog/EditUserModal.tsx`:
      - Edición de nombre y email con ID de autenticación en modo solo lectura.
    - `app/(dashboard)/users/components/dialog/GeneralDialogUser.tsx`:
      - Integración de modales de edición, asignación y alerta de confirmación para eliminación.
    - `app/(dashboard)/users/services/user-service.ts`:
      - Métodos CRUD (sin create), sincronización y asignación de reportes.
    - `app/(dashboard)/users/hooks/`:
      - `use-list-users.ts`: React Query paginado para la lista de usuarios.
      - `use-user-actions.ts`: Mutaciones para actualizar, eliminar, asignar reportes y sincronizar con Auth Service.
  - **Navegación**:
    - La ruta `/users` es resuelta de manera transparente por `AppSidebar` a partir de los módulos devueltos por `useSidebar()` del servicio central de autenticación.

- **Módulos "Mis Reportes" (`/my-reports`) y "Descargas" (`/downloads`)**:
  - **Backend (`sdi_dynamic-reports-service`)**:
    - Migración `2026_09_04_000021_add_on_demand_fields_to_report_executions.php` ejecutada. Agrega `report_id`, `user_id`, `delivery_type`, `destination_email`, `file_format`, `download_id` a `report_executions` y hace `report_schedule_id` nullable.
    - Modelos actualizados: `ReportExecution` (`report()`, `user()`, nuevos campos en `$fillable`), `User` (`executions()`), `Report` (`executions()`).
    - `ReportGeneratorService`: añadido soporte on-demand `generateOnDemand(...)` con ejecución dinámica, aplicación de encabezados, exportación (XLSX, CSV, PDF, DOCX, TXT), almacenamiento en disco S3/MinIO, entrega por correo y notificación HTTP PUT a SDI Auth Service (`/api/v1/downloads/{downloadId}`) con fallback directo en tabla `users.downloads`.
    - `GenerateUserReportJob`: Job en cola `reports` para generación asíncrona no bloqueante de reportes bajo demanda.
    - `GenerateMyReportRequest`: FormRequest con validación para generación bajo demanda (formatos soportados, tipo de entrega, email de destino, download_id, etc.).
    - `MyReportController`: endpoints `GET api/v1/my-reports`, `GET api/v1/my-reports/{report}` y `POST api/v1/my-reports/{report}/generate` con resolución resiliente de usuario vía Bearer Token (`/api/v1/me`) y header `X-User-Auth-Id`.
    - Pruebas automatizadas: `tests/Feature/MyReportsModuleTest.php` (4/4 tests aprobados).
  - **Frontend (`sdi_app-dynamic-reports`)**:
    - **Módulo Descargas (`/downloads`)**:
      - `types/download-types.ts`: Tipos `DownloadType`, `FilterDownloadType`, `PrepareDownloadPayload`.
      - `services/download-service.ts`: Integración completa con `sdi_auth-service` (`${WEB_URL}/auth/api/v1/downloads`) para listar, descargar archivo como Blob vía `URL.createObjectURL`, eliminar y preparar descarga.
      - `hooks/use-list-downloads.ts`: Consulta React Query con **sondeo inteligente (polling cada 4 segundos)** mientras haya elementos con `status_code === 0` (*Procesando*), y notificación interactiva (Toast) con botón "Descargar" al completarse.
      - `hooks/use-download-actions.ts`: Manejo de streaming de descargas y borrado de archivos.
      - `components/(table)/ColumnsDownload.tsx` y `ActionsDownload.tsx`: Badges de estado (*Procesando* animado, *Completado* verde, *Fallida* rojo, *Pendiente* amarillo), badge de formato y acciones contextuales.
      - `page.tsx`: Vista completa con filtros de búsqueda por nombre, selector de formato, estados vacíos estilizados y tabla paginada.
    - **Módulo Mis Reportes (`/my-reports`)**:
      - `types/my-report-types.ts`: Tipos para reportes asignados, parámetros y payloads.
      - `services/my-report-service.ts`: Consumo de `api/v1/my-reports` en el backend.
      - `hooks/use-my-reports.ts`: Listado de reportes asignados al usuario autenticado.
      - `hooks/use-generate-report.ts`: Orquestación completa. En modo descarga: genera slug y nombre de archivo con timestamp, registra la descarga en `sdi_auth-service` (`POST /api/v1/downloads`), envía la solicitud al backend (`POST /api/v1/my-reports/{id}/generate`) y notifica al usuario con acceso directo a `/downloads`.
      - `components/GenerateReportModal.tsx`: Diálogo para configurar parámetros dinámicos (detecta campos de fecha y tipos), seleccionar formato (Excel, CSV, PDF, Word, Texto) y método de entrega (Descarga directa o Enviar por correo con input de email). Soporta tanto estructura JSON:API estándar (`param.attributes.param_name`) como aplanada, con guardas defensivas para prevenir `TypeError: undefined.toLowerCase()`.
      - `components/ReportGridCard.tsx`: Tarjeta moderna con insignias de categoría, motor de base de datos, contador de parámetros y botón de acción directa "Generar".
      - `page.tsx`: Grid interactivo de tarjetas de reportes, búsqueda reactiva, paginación y accesos directos a descargas.
    - **Navegación**:
      - `components/ui/app-sidebar.tsx`: Enlaces de respaldo en el menú lateral para `/my-reports` ("Mis reportes") y `/downloads` ("Descargas").

---

# Verificación general

- **Frontend**: `npx tsc --noEmit` → EXIT 0. `npx eslint .` → 11 errores + 16 warnings,
  **todos preexistentes** en archivos no tocados por esta sesión
  (`use-list-example.ts`, `layout.tsx` PermissionProvider, `reports/page.tsx` setSort,
  `ConnectionForm.tsx`/`use-list-connections.ts`, `calendar.tsx`, `data-table.tsx`,
  `sidebar.tsx` Math.random, `team-switcher.tsx`, `use-auth.tsx`, `use-form-error-handler.tsx`,
  `use-mobile.tsx`, `useSidebar.tsx`, `application-type.ts`). No bloquean el build de esta
  sesión. `npx next build` → EXIT 0, con rutas registradas: `/reports`, `/reports/new`,
  `/reports/[id]/edit`, `/reports/schedule`, `/reports/executions`, `/setting/connections`,
  `/overview`.
- **Backend**: `php -l` sobre archivos tocados → sin errores de sintaxis;
  `php artisan route:list` confirma las rutas nuevas:
  `POST .../database-connections/test` y `POST .../reports/dry-run` (preview)
  registradas antes de los `apiResource` correspondientes.

## Pendiente / notas para el siguiente agente

- Warning de lint preexistente (no error): `setSort` asignado pero no usado en
  `reports/page.tsx`.
- `useDryRun`/`runDryRun` (`dryRunReportService`, `reports/{id}/dry-run`) quedó
  sin consumirse desde el wizard (ahora se usa `useReportPreview`/`reports/dry-run`),
  pero se mantuvo por si otro flujo lo necesita y para compatibilidad.
- La caché de modelos (`findCached`) guarda atributos, no instancias; las relaciones
  se cargan SIEMPRE fuera de caché con `load()`. No añadir `warmCache` de un modelo
  con relaciones precargadas sin revisar la rehidratación.
- **Migración pendiente en entorno con BD**: `php artisan migrate` (aplica `include_headers`/
  `delimiter` del ítem 11 y `every_n_weeks` del ítem 13) + `php artisan db:seed --class=FileFormatSeeder`
  (inserta `code=txt`).
- Verificación manual sugerida (no automatizada):
  - flujo create: validar SQL → si falla no guarda y queda en la vista; si OK guarda y
    avanza a headers → summary → ir a edit (`/reports/{id}/edit`).
  - flujo update: "Finalizar → volver a `/reports`".
  - SQL que termina en `;` debe validar sin 500 y guardarse sin el `;`.
  - responsividad móvil del wizard, y prueba de conexión en creación/edición.
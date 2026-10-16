<?php

namespace App\Services;

use App\Models\Cycle;
use App\Models\Module;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\Release;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemType;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ProjectJsonImporterService
{
    /**
     * Importa y acomoda el dataset JSON dentro del modelo relacional del proyecto.
     *
     * @param  string  $jsonFilePath  Ruta absoluta o relativa del archivo JSON
     * @param  string  $workspaceSlug  Slug del espacio de trabajo objetivo (ej: "univalle")
     * @param  string  $ownerEmail  Correo electrónico del usuario responsable / líder
     * @param  bool  $forceClean  Si es true, elimina registros previos del proyecto si existiera
     * @return array Resumen de la importación realizada
     */
    public function import(
        string $jsonFilePath,
        string $workspaceSlug = 'univalle',
        string $ownerEmail = 'joe.valencia@correounivalle.edu.co',
        bool $forceClean = false
    ): array {
        // 1. Resolver y validar archivo JSON
        $data = $this->loadJsonData($jsonFilePath);

        if (empty($data)) {
            throw new \InvalidArgumentException("El archivo JSON no contiene elementos o está vacío: {$jsonFilePath}");
        }

        return DB::transaction(function () use ($data, $workspaceSlug, $ownerEmail, $forceClean) {
            // 2. Resolver o aprovisionar usuario principal y colaboradores
            $ownerUser = $this->resolveOwnerUser($ownerEmail);

            // 3. Resolver o crear Workspace
            $workspace = $this->resolveWorkspace($workspaceSlug, $ownerUser);

            // Establecer contexto activo en contenedor
            app()->instance('current_workspace_id', $workspace->id);
            app()->instance('current_workspace', $workspace);

            // 4. Resolver o crear Proyecto
            $firstItem = $data[0] ?? [];
            $projectName = $firstItem['project_name'] ?? 'Helpdesk IA';
            $projectIdentifier = strtoupper($firstItem['project_identifier'] ?? 'JSVRC');

            $project = Project::withoutGlobalScopes()
                ->where('workspace_id', $workspace->id)
                ->where('identifier', $projectIdentifier)
                ->first();

            if ($project && $forceClean) {
                $project->delete();
                $project = null;
            }

            if (! $project) {
                $project = Project::create([
                    'workspace_id' => $workspace->id,
                    'name' => $projectName,
                    'identifier' => $projectIdentifier,
                    'description' => 'Sistema Helpdesk Inteligente con IA (Maestría en Ingeniería de Sistemas)',
                    'icon' => '🤖',
                    'lead_id' => $ownerUser->id,
                    'is_public' => false,
                    'estimate_system' => 'POINTS',
                    'start_date' => '2026-02-09',
                    'target_date' => '2026-11-14',
                ]);
            }

            // Membresía del proyecto
            ProjectMember::updateOrCreate(
                ['project_id' => $project->id, 'user_id' => $ownerUser->id],
                ['role' => 'ADMIN']
            );

            // Vincular usuarios de desarrollo adicionales si existen
            $additionalEmails = ['stiwart94@gmail.com', 'stiwart94@hotmail.com', 'admin@plane.local'];
            foreach ($additionalEmails as $extraEmail) {
                $extraUser = User::where('email', $extraEmail)->first();
                if ($extraUser) {
                    WorkspaceMember::firstOrCreate(
                        ['workspace_id' => $workspace->id, 'user_id' => $extraUser->id],
                        ['role' => 'ADMIN']
                    );
                    ProjectMember::firstOrCreate(
                        ['project_id' => $project->id, 'user_id' => $extraUser->id],
                        ['role' => 'ADMIN']
                    );
                }
            }

            // 5. Estados del flujo de trabajo (Workflow States)
            $stateMap = $this->ensureProjectStates($project);

            // 6. Tipos de Work Items
            $typeMap = $this->ensureWorkItemTypes($project);

            // 7. Sprints / Ciclos
            $cycleMap = $this->ensureCycles($project, $data, $ownerUser);

            // 8. Módulos Funcionales
            $moduleMap = $this->ensureModules($project, $data, $ownerUser);

            // 9. Versión / Release
            $release = $this->ensureRelease($project, $ownerUser);

            // 10. Inserción de Work Items (Fase 1: Registros con sequence_id exacto)
            $createdItems = [];
            $bySequence = [];

            foreach ($data as $itemData) {
                $identifier = $itemData['identifier'] ?? '';
                $seqParts = explode('-', $identifier);
                $sequenceId = (int) end($seqParts);

                $title = trim($itemData['name'] ?? 'Sin título');
                $stateName = trim($itemData['state_name'] ?? 'Backlog');
                $stateId = $stateMap[strtolower($stateName)] ?? $stateMap['backlog'];

                $priority = strtoupper($itemData['priority'] ?? 'NONE');
                if (! in_array($priority, ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'], true)) {
                    $priority = 'NONE';
                }

                $typeId = $this->determineTypeId($itemData, $typeMap);

                $estimateRaw = $itemData['estimate'] ?? '';
                $estimatePoints = is_numeric($estimateRaw) ? (float) $estimateRaw : null;
                $estimateValue = is_numeric($estimateRaw) ? (string) $estimateRaw : null;

                $completedAt = null;
                if (! empty($itemData['completed_at'])) {
                    $completedAt = Carbon::parse($itemData['completed_at']);
                } elseif (isset($stateMap['done']) && $stateId === $stateMap['done']) {
                    $completedAt = Carbon::parse($itemData['updated_at'] ?? now());
                }

                $createdAt = ! empty($itemData['created_at']) ? Carbon::parse($itemData['created_at']) : now();
                $updatedAt = ! empty($itemData['updated_at']) ? Carbon::parse($itemData['updated_at']) : now();

                $descriptionHtml = $this->convertDescriptionToHtml($itemData['description'] ?? '');

                $workItem = WorkItem::withoutGlobalScopes()->updateOrCreate(
                    [
                        'project_id' => $project->id,
                        'sequence_id' => $sequenceId,
                    ],
                    [
                        'workspace_id' => $workspace->id,
                        'title' => $title,
                        'description_html' => $descriptionHtml,
                        'description_json' => $descriptionHtml ? ['html' => $descriptionHtml] : null,
                        'state_id' => $stateId,
                        'type_id' => $typeId,
                        'priority' => $priority,
                        'lead_id' => $ownerUser->id,
                        'estimate_points' => $estimatePoints,
                        'estimate_value' => $estimateValue,
                        'completed_at' => $completedAt,
                        'created_by' => $ownerUser->id,
                        'created_at' => $createdAt,
                        'updated_at' => $updatedAt,
                    ]
                );

                $createdItems[] = $workItem;
                $bySequence[$sequenceId] = $workItem;
            }

            // 11. Inserción de Work Items (Fase 2: Resolución de Jerarquía Parent-Child)
            $parentsLinkedCount = 0;
            foreach ($data as $itemData) {
                $parentIdent = trim($itemData['parent'] ?? '');
                if (empty($parentIdent)) {
                    continue;
                }

                $childParts = explode('-', $itemData['identifier'] ?? '');
                $childSeq = (int) end($childParts);

                $parentParts = explode('-', $parentIdent);
                $parentSeq = (int) end($parentParts);

                $child = $bySequence[$childSeq] ?? null;
                $parent = $bySequence[$parentSeq] ?? null;

                if ($child && $parent) {
                    $child->update(['parent_id' => $parent->id]);
                    $parentsLinkedCount++;
                }
            }

            // 12. Inserción de Work Items (Fase 3: Vinculación con Sprints, Módulos y Release)
            $cyclesAttachedCount = 0;
            $modulesAttachedCount = 0;

            foreach ($data as $itemData) {
                $childParts = explode('-', $itemData['identifier'] ?? '');
                $childSeq = (int) end($childParts);
                $workItem = $bySequence[$childSeq] ?? null;

                if (! $workItem) {
                    continue;
                }

                // Asignar al creador
                $workItem->assignees()->syncWithoutDetaching([$ownerUser->id]);

                // Asociar Sprint / Cycle
                if (! empty($itemData['cycle_name'])) {
                    $cycleName = trim($itemData['cycle_name']);
                    if (isset($cycleMap[$cycleName])) {
                        $cycle = $cycleMap[$cycleName];
                        $workItem->cycles()->syncWithoutDetaching([$cycle->id]);
                        $cyclesAttachedCount++;
                    }
                }

                // Asociar Módulo
                if (! empty($itemData['module_name'])) {
                    $moduleName = trim($itemData['module_name']);
                    if (isset($moduleMap[$moduleName])) {
                        $mod = $moduleMap[$moduleName];
                        $workItem->modules()->syncWithoutDetaching([$mod->id]);
                        $modulesAttachedCount++;
                    }
                }

                // Asociar Release si aplica
                if (! empty($itemData['initiatives']) && $release) {
                    $release->workItems()->syncWithoutDetaching([$workItem->id]);
                }
            }

            // 13. Invalidar Caché de Eloquent
            try {
                Cache::tags(['workspaces', 'projects', 'work_items', 'cycles', 'modules'])->flush();
            } catch (\Throwable) {
                // Si el driver de caché no soporta tags (ej: file/array sin tag store)
                Cache::flush();
            }

            return [
                'workspace' => [
                    'id' => $workspace->id,
                    'name' => $workspace->name,
                    'slug' => $workspace->slug,
                ],
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'identifier' => $project->identifier,
                ],
                'owner' => [
                    'id' => $ownerUser->id,
                    'name' => $ownerUser->name,
                    'email' => $ownerUser->email,
                ],
                'total_work_items' => count($createdItems),
                'parents_linked' => $parentsLinkedCount,
                'cycles_count' => count($cycleMap),
                'cycles_work_items_linked' => $cyclesAttachedCount,
                'modules_count' => count($moduleMap),
                'modules_work_items_linked' => $modulesAttachedCount,
            ];
        });
    }

    /**
     * Carga y deserializa el archivo JSON soportando múltiples ubicaciones de fallback.
     */
    protected function loadJsonData(string $filePath): array
    {
        $candidatePaths = [
            $filePath,
            storage_path('app/imports/jsvr_coding.json'),
            base_path('storage/app/imports/jsvr_coding.json'),
            '/home/ubuntu/maestria/jsvr_coding.json',
            base_path('../../maestria/jsvr_coding.json'),
        ];

        $resolvedPath = null;
        foreach ($candidatePaths as $candidate) {
            if (file_exists($candidate) && is_readable($candidate)) {
                $resolvedPath = $candidate;
                break;
            }
        }

        if (! $resolvedPath) {
            throw new \RuntimeException("No se pudo localizar el archivo JSON en ninguna de las rutas esperadas. Ruta solicitada: {$filePath}");
        }

        $content = file_get_contents($resolvedPath);
        $decoded = json_decode($content, true);

        if (! is_array($decoded)) {
            throw new \RuntimeException('Error al decodificar formato JSON: '.json_last_error_msg());
        }

        return $decoded;
    }

    /**
     * Resuelve o aprovisiona el usuario propietario principal.
     */
    protected function resolveOwnerUser(string $email): User
    {
        return User::firstOrCreate(
            ['email' => strtolower(trim($email))],
            [
                'name' => 'Joe stwart Valencia VALENCIA RENTERIA',
                'password' => Hash::make('password'),
                'is_instance_admin' => true,
                'email_verified_at' => now(),
            ]
        );
    }

    /**
     * Resuelve o crea el Workspace con las membresías correspondientes.
     */
    protected function resolveWorkspace(string $slug, User $owner): Workspace
    {
        $slug = Str::slug($slug);
        $name = ucwords(str_replace('-', ' ', $slug));

        $workspace = Workspace::firstOrCreate(
            ['slug' => $slug],
            [
                'name' => $name,
                'owner_id' => $owner->id,
            ]
        );

        WorkspaceMember::firstOrCreate(
            ['workspace_id' => $workspace->id, 'user_id' => $owner->id],
            ['role' => 'OWNER']
        );

        return $workspace;
    }

    /**
     * Asegura los estados estándar del proyecto (Backlog, Todo, In Progress, Done, Cancelled).
     *
     * @return array<string, int> Mapa de nombre de estado en minúsculas a ID
     */
    protected function ensureProjectStates(Project $project): array
    {
        $definitions = [
            ['name' => 'Backlog', 'group' => 'BACKLOG', 'color' => '#94A3B8', 'sequence' => 0, 'is_default' => true],
            ['name' => 'To Do', 'group' => 'UNSTARTED', 'color' => '#60A5FA', 'sequence' => 1, 'is_default' => false],
            ['name' => 'In Progress', 'group' => 'STARTED', 'color' => '#F59E0B', 'sequence' => 2, 'is_default' => false],
            ['name' => 'Done', 'group' => 'COMPLETED', 'color' => '#10B981', 'sequence' => 3, 'is_default' => false],
            ['name' => 'Cancelled', 'group' => 'CANCELLED', 'color' => '#EF4444', 'sequence' => 4, 'is_default' => false],
        ];

        $map = [];
        foreach ($definitions as $def) {
            $state = State::withoutGlobalScopes()
                ->where('project_id', $project->id)
                ->where('name', $def['name'])
                ->first();

            if (! $state) {
                $state = State::create(array_merge($def, [
                    'workspace_id' => $project->workspace_id,
                    'project_id' => $project->id,
                ]));
            }

            $map[strtolower($def['name'])] = $state->id;
            $map[strtolower($def['group'])] = $state->id;
        }

        // Aliases comunes
        $map['todo'] = $map['to do'] ?? $map['unstarted'];

        return $map;
    }

    /**
     * Asegura los tipos de tareas estándar (Épica, Historia, Tarea, Bug).
     *
     * @return array<string, int>
     */
    protected function ensureWorkItemTypes(Project $project): array
    {
        $types = [
            ['name' => 'Épica', 'icon' => 'zap', 'color' => '#8B5CF6'],
            ['name' => 'Historia', 'icon' => 'bookmark', 'color' => '#F59E0B'],
            ['name' => 'Tarea', 'icon' => 'check-square', 'color' => '#3B82F6', 'is_default' => true],
            ['name' => 'Bug', 'icon' => 'alert-circle', 'color' => '#EF4444'],
        ];

        $map = [];
        foreach ($types as $t) {
            $typeModel = WorkItemType::withoutGlobalScopes()
                ->where('workspace_id', $project->workspace_id)
                ->where(function ($q) use ($project) {
                    $q->whereNull('project_id')->orWhere('project_id', $project->id);
                })
                ->where('name', $t['name'])
                ->first();

            if (! $typeModel) {
                $typeModel = WorkItemType::create([
                    'workspace_id' => $project->workspace_id,
                    'project_id' => $project->id,
                    'name' => $t['name'],
                    'icon' => $t['icon'],
                    'color' => $t['color'],
                    'is_default' => $t['is_default'] ?? false,
                ]);
            }

            $map[strtolower($t['name'])] = $typeModel->id;
        }

        return $map;
    }

    /**
     * Determina el type_id de acuerdo al issue_type y nombre del elemento.
     */
    protected function determineTypeId(array $itemData, array $typeMap): int
    {
        $issueType = strtolower(trim($itemData['issue_type'] ?? 'task'));
        $name = trim($itemData['name'] ?? '');

        if ($issueType === 'epic') {
            return $typeMap['épica'] ?? reset($typeMap);
        }

        // Si inicia con HU o HU- es una Historia de Usuario
        if (preg_match('/^HU[\s\-_]/i', $name)) {
            return $typeMap['historia'] ?? $typeMap['tarea'] ?? reset($typeMap);
        }

        return $typeMap['tarea'] ?? reset($typeMap);
    }

    /**
     * Asegura los Sprints / Ciclos a partir de las fechas y nombres en el JSON.
     *
     * @return array<string, Cycle>
     */
    protected function ensureCycles(Project $project, array $data, User $owner): array
    {
        $cyclesMap = [];

        foreach ($data as $item) {
            $name = trim($item['cycle_name'] ?? '');
            if (empty($name)) {
                continue;
            }

            if (isset($cyclesMap[$name])) {
                continue;
            }

            $startDate = ! empty($item['cycle_start_date']) ? Carbon::parse($item['cycle_start_date']) : null;
            $endDate = ! empty($item['cycle_end_date']) ? Carbon::parse($item['cycle_end_date']) : null;

            $status = 'UPCOMING';
            $today = Carbon::today();
            if ($endDate && $endDate->isPast()) {
                $status = 'COMPLETED';
            } elseif ($startDate && $endDate && $today->between($startDate, $endDate)) {
                $status = 'CURRENT';
            }

            $cycle = Cycle::withoutGlobalScopes()
                ->where('project_id', $project->id)
                ->where('name', $name)
                ->first();

            if (! $cycle) {
                $cycle = Cycle::create([
                    'workspace_id' => $project->workspace_id,
                    'project_id' => $project->id,
                    'name' => $name,
                    'description' => "Ciclo de desarrollo {$name}",
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'status' => $status,
                    'owned_by' => $owner->id,
                ]);
            }

            $cyclesMap[$name] = $cycle;
        }

        return $cyclesMap;
    }

    /**
     * Asegura los Módulos a partir de los datos del JSON.
     *
     * @return array<string, Module>
     */
    protected function ensureModules(Project $project, array $data, User $owner): array
    {
        $modulesMap = [];

        foreach ($data as $item) {
            $name = trim($item['module_name'] ?? '');
            if (empty($name)) {
                continue;
            }

            if (isset($modulesMap[$name])) {
                continue;
            }

            $mod = Module::withoutGlobalScopes()
                ->where('project_id', $project->id)
                ->where('name', $name)
                ->first();

            if (! $mod) {
                $mod = Module::create([
                    'workspace_id' => $project->workspace_id,
                    'project_id' => $project->id,
                    'name' => $name,
                    'description' => "Módulo funcional: {$name}",
                    'status' => 'IN_PROGRESS',
                    'lead_id' => $owner->id,
                ]);
            }

            $modulesMap[$name] = $mod;
        }

        return $modulesMap;
    }

    /**
     * Asegura el registro de la versión / entrega Release V0.1.0.
     */
    protected function ensureRelease(Project $project, User $owner): ?Release
    {
        $release = Release::withoutGlobalScopes()
            ->where('project_id', $project->id)
            ->where('version', 'v0.1.0')
            ->first();

        if (! $release) {
            $release = Release::create([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'name' => 'Entrega versión V0.1.0',
                'version' => 'v0.1.0',
                'description' => 'Primera entrega funcional del MVP Helpdesk IA',
                'status' => 'PUBLISHED',
                'published_at' => Carbon::parse('2026-04-19'),
                'created_by' => $owner->id,
            ]);
        }

        return $release;
    }

    /**
     * Convierte el texto estructurado de una Historia de Usuario en HTML semántico limpio para RichTextEditor.
     */
    public function convertDescriptionToHtml(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        $trimmed = trim($text);
        if (empty($trimmed)) {
            return null;
        }

        // Si ya contiene etiquetas HTML completas
        if (preg_match('/<[a-z][\s\S]*>/i', $trimmed)) {
            return $trimmed;
        }

        $lines = array_map('trim', explode("\n", $trimmed));
        $lines = array_values(array_filter($lines, fn ($l) => $l !== ''));

        $htmlParts = [];
        $i = 0;
        $total = count($lines);

        $knownHeaders = ['ID-HU', 'Rol', 'Funcionalidad', 'Razón / Resultado', 'Razón/Resultado', 'Criterios de aceptación', 'Criterios de Aceptación', 'Definition of Done (DoD)'];

        while ($i < $total) {
            $line = $lines[$i];

            if ($line === 'ID-HU' && $i + 1 < $total) {
                $htmlParts[] = '<p><strong>ID-HU:</strong> '.e($lines[$i + 1]).'</p>';
                $i += 2;

                continue;
            }

            if ($line === 'Rol' && $i + 1 < $total) {
                $htmlParts[] = '<p><strong>Rol:</strong> '.e($lines[$i + 1]).'</p>';
                $i += 2;

                continue;
            }

            if ($line === 'Funcionalidad' && $i + 1 < $total) {
                $htmlParts[] = '<p><strong>Funcionalidad:</strong> '.e($lines[$i + 1]).'</p>';
                $i += 2;

                continue;
            }

            if (($line === 'Razón / Resultado' || $line === 'Razón/Resultado') && $i + 1 < $total) {
                $htmlParts[] = '<p><strong>Razón / Resultado:</strong> '.e($lines[$i + 1]).'</p>';
                $i += 2;

                continue;
            }

            if ($line === 'Criterios de aceptación' || $line === 'Criterios de Aceptación') {
                $htmlParts[] = '<h3>Criterios de aceptación</h3>';
                $i++;
                $listItems = [];
                while ($i < $total && ! in_array($lines[$i], $knownHeaders, true)) {
                    $item = ltrim($lines[$i], '-*• ');
                    if (! empty($item)) {
                        $listItems[] = '<li>'.e($item).'</li>';
                    }
                    $i++;
                }
                if (! empty($listItems)) {
                    $htmlParts[] = '<ul>'.implode('', $listItems).'</ul>';
                }

                continue;
            }

            if ($line === 'Definition of Done (DoD)') {
                $htmlParts[] = '<h3>Definition of Done (DoD)</h3>';
                $i++;
                $listItems = [];
                while ($i < $total && ! in_array($lines[$i], $knownHeaders, true)) {
                    $item = ltrim($lines[$i], '-*• ');
                    if (! empty($item)) {
                        $listItems[] = '<li>'.e($item).'</li>';
                    }
                    $i++;
                }
                if (! empty($listItems)) {
                    $htmlParts[] = '<ul>'.implode('', $listItems).'</ul>';
                }

                continue;
            }

            $htmlParts[] = '<p>'.e($line).'</p>';
            $i++;
        }

        return ! empty($htmlParts) ? implode('', $htmlParts) : null;
    }
}

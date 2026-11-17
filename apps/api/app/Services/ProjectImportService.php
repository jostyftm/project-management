<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Cycle;
use App\Models\Label;
use App\Models\Milestone;
use App\Models\Module;
use App\Models\Page;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\Release;
use App\Models\State;
use App\Models\User;
use App\Models\View;
use App\Models\WorkItem;
use App\Models\WorkItemDeliverable;
use App\Models\WorkItemDodItem;
use App\Models\WorkItemRelation;
use App\Models\WorkItemType;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ProjectImportService
{
    /**
     * Importa un proyecto completo desde una estructura de datos (JSON) a un Workspace.
     *
     * @param  array  $data  Estructura de datos (canónica v1.0 o lista plana)
     * @param  Workspace  $workspace  Espacio de trabajo destino
     * @param  User  $actor  Usuario que ejecuta la importación
     * @param  array  $options  Opciones adicionales: name, identifier, force
     */
    public function import(array $data, Workspace $workspace, User $actor, array $options = []): array
    {
        if (empty($data)) {
            throw new \InvalidArgumentException('El contenido JSON a importar está vacío.');
        }

        return DB::transaction(function () use ($data, $workspace, $actor, $options) {
            // Contexto activo para el contenedor
            app()->instance('current_workspace_id', $workspace->id);
            app()->instance('current_workspace', $workspace);

            // Asegurar membresía del usuario actor en el workspace
            WorkspaceMember::firstOrCreate(
                ['workspace_id' => $workspace->id, 'user_id' => $actor->id],
                ['role' => 'ADMIN']
            );

            // Si es formato canónico (contiene clave 'project' o 'version')
            if (isset($data['project']) || isset($data['version'])) {
                return $this->importCanonicalProject($data, $workspace, $actor, $options);
            }

            // Si es una lista plana indexada (formato legacy / jsvr_coding)
            if (isset($data[0]) && is_array($data[0])) {
                return $this->importFlatListProject($data, $workspace, $actor, $options);
            }

            throw new \InvalidArgumentException('El formato del archivo JSON no es reconocido como un proyecto exportado válido.');
        });
    }

    /**
     * Importa proyecto en formato canónico v1.0.
     */
    protected function importCanonicalProject(array $data, Workspace $workspace, User $actor, array $options): array
    {
        $projectMeta = $data['project'] ?? [];

        // 1. Determinar Nombre e Identificador
        $targetName = trim($options['name'] ?? $projectMeta['name'] ?? 'Proyecto Importado');
        $baseIdentifier = strtoupper(trim($options['identifier'] ?? $projectMeta['identifier'] ?? 'PRJ'));
        $force = ! empty($options['force']);

        $identifier = $this->resolveProjectIdentifier($workspace->id, $baseIdentifier, $force);

        // 2. Resolver Lead del Proyecto
        $leadUser = $this->resolveUserByEmail($projectMeta['lead_email'] ?? null, $workspace, $actor);

        // 3. Crear Proyecto preservando timestamps históricos
        $projectCreatedAt = ! empty($projectMeta['created_at']) ? Carbon::parse($projectMeta['created_at']) : null;

        $project = new Project();
        $project->timestamps = false;
        $project->fill([
            'workspace_id' => $workspace->id,
            'name' => $targetName,
            'identifier' => $identifier,
            'description' => $projectMeta['description'] ?? null,
            'icon' => $projectMeta['icon'] ?? '📁',
            'is_public' => $projectMeta['is_public'] ?? false,
            'is_archived' => $projectMeta['is_archived'] ?? false,
            'lead_id' => $leadUser->id,
            'estimate_system' => $projectMeta['estimate_system'] ?? 'FIBONACCI',
            'start_date' => $projectMeta['start_date'] ?? null,
            'target_date' => $projectMeta['target_date'] ?? null,
            'auto_rollup_parent' => $projectMeta['auto_rollup_parent'] ?? true,
            'aging_threshold_days' => $projectMeta['aging_threshold_days'] ?? 14,
            'require_evidence_to_complete' => $projectMeta['require_evidence_to_complete'] ?? false,
        ]);
        if ($projectCreatedAt) {
            $project->created_at = $projectCreatedAt;
            $project->updated_at = $projectCreatedAt;
        } else {
            $project->created_at = now();
            $project->updated_at = now();
        }
        $project->save();

        // 4. Miembros del Proyecto (Equipo)
        $this->importMembers($project, $data['members'] ?? [], $workspace, $actor, $leadUser);

        // 5. Estados del Flujo de Trabajo
        $stateMap = $this->importStates($project, $data['states'] ?? []);

        // 6. Etiquetas (Labels)
        $labelMap = $this->importLabels($project, $data['labels'] ?? []);

        // 7. Tipos de Work Items
        $typeMap = $this->importWorkItemTypes($project, $data['work_item_types'] ?? []);

        // 8. Ciclos / Sprints
        $cycleMap = $this->importCycles($project, $data['cycles'] ?? [], $actor);

        // 9. Módulos Funcionales
        $moduleMap = $this->importModules($project, $data['modules'] ?? [], $workspace, $actor);

        // 10. Hitos (Milestones)
        $milestoneMap = $this->importMilestones($project, $data['milestones'] ?? []);

        // 11. Versiones / Releases
        $releaseMap = $this->importReleases($project, $data['releases'] ?? [], $actor);

        // 12. Páginas / Wiki
        $this->importPages($project, $data['pages'] ?? [], $actor);

        // 13. Vistas Personalizadas
        $this->importViews($project, $data['views'] ?? [], $actor);

        // 14. Work Items (2 Pasadas: creación y resolución de relaciones)
        $workItemsResult = $this->importWorkItems(
            project: $project,
            workItemsData: $data['work_items'] ?? [],
            workspace: $workspace,
            actor: $actor,
            stateMap: $stateMap,
            typeMap: $typeMap,
            labelMap: $labelMap,
            cycleMap: $cycleMap,
            moduleMap: $moduleMap,
            milestoneMap: $milestoneMap
        );

        // 15. Actividades del Proyecto
        $this->importActivities(
            project: $project,
            activitiesData: $data['activities'] ?? [],
            bySequence: $workItemsResult['by_sequence'] ?? [],
            workspace: $workspace,
            actor: $actor
        );

        // Limpiar caché
        Cache::tags(['projects', 'workspace_'.$workspace->id])->flush();

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
            'lead' => [
                'id' => $leadUser->id,
                'name' => $leadUser->name,
                'email' => $leadUser->email,
            ],
            'counts' => [
                'states' => count($stateMap),
                'labels' => count($labelMap),
                'work_item_types' => count($typeMap),
                'cycles' => count($cycleMap),
                'modules' => count($moduleMap),
                'milestones' => count($milestoneMap),
                'releases' => count($releaseMap),
                'work_items' => $workItemsResult['total_items'],
                'parents_linked' => $workItemsResult['parents_linked'],
                'relations_created' => $workItemsResult['relations_created'],
                'dod_items_created' => $workItemsResult['dod_items_created'],
            ],
        ];
    }

    /**
     * Importa miembros y asigna roles en el proyecto.
     */
    protected function importMembers(Project $project, array $membersData, Workspace $workspace, User $actor, User $leadUser): void
    {
        // Asegurar membresía de proyecto para actor y lead
        ProjectMember::firstOrCreate(
            ['project_id' => $project->id, 'user_id' => $actor->id],
            ['role' => 'ADMIN']
        );
        if ($leadUser->id !== $actor->id) {
            ProjectMember::firstOrCreate(
                ['project_id' => $project->id, 'user_id' => $leadUser->id],
                ['role' => 'ADMIN']
            );
        }

        foreach ($membersData as $m) {
            $email = is_array($m) ? ($m['email'] ?? null) : (string) $m;
            if (empty($email)) {
                continue;
            }

            $user = $this->resolveUserByEmail($email, $workspace, $actor);
            $role = is_array($m) ? ($m['role'] ?? 'MEMBER') : 'MEMBER';
            $capacity = is_array($m) ? ($m['capacity_points'] ?? null) : null;

            ProjectMember::firstOrCreate(
                ['project_id' => $project->id, 'user_id' => $user->id],
                ['role' => $role, 'capacity_points' => $capacity]
            );
        }
    }

    /**
     * Importa dataset de lista plana (retrocompatibilidad).
     */
    protected function importFlatListProject(array $data, Workspace $workspace, User $actor, array $options): array
    {
        $firstItem = $data[0] ?? [];
        $targetName = trim($options['name'] ?? $firstItem['project_name'] ?? 'Proyecto Importado');
        $baseIdentifier = strtoupper(trim($options['identifier'] ?? $firstItem['project_identifier'] ?? 'PRJ'));
        $force = ! empty($options['force']);

        $identifier = $this->resolveProjectIdentifier($workspace->id, $baseIdentifier, $force);

        $project = Project::withoutGlobalScopes()->create([
            'workspace_id' => $workspace->id,
            'name' => $targetName,
            'identifier' => $identifier,
            'description' => 'Proyecto importado desde lista plana JSON',
            'icon' => '📁',
            'is_public' => false,
            'lead_id' => $actor->id,
            'estimate_system' => 'POINTS',
        ]);

        ProjectMember::firstOrCreate(
            ['project_id' => $project->id, 'user_id' => $actor->id],
            ['role' => 'ADMIN']
        );

        // Crear estados por defecto
        $stateMap = $this->importStates($project, []);
        $typeMap = $this->importWorkItemTypes($project, []);

        // Recolectar ciclos y módulos únicos desde los items
        $cycleNames = collect($data)->pluck('sprint')->filter()->unique()->values()->all();
        $cycleMap = [];
        foreach ($cycleNames as $cName) {
            $cycle = Cycle::create([
                'workspace_id' => $workspace->id,
                'project_id' => $project->id,
                'name' => $cName,
                'status' => 'UPCOMING',
                'owned_by' => $actor->id,
            ]);
            $cycleMap[strtolower($cName)] = $cycle;
        }

        $moduleNames = collect($data)->pluck('module')->filter()->unique()->values()->all();
        $moduleMap = [];
        foreach ($moduleNames as $mName) {
            $module = Module::create([
                'workspace_id' => $workspace->id,
                'project_id' => $project->id,
                'name' => $mName,
                'status' => 'PLANNED',
                'lead_id' => $actor->id,
            ]);
            $moduleMap[strtolower($mName)] = $module;
        }

        $createdItems = [];
        $bySequence = [];

        foreach ($data as $itemData) {
            $ident = $itemData['identifier'] ?? '';
            $parts = explode('-', $ident);
            $sequenceId = (int) end($parts);
            if ($sequenceId <= 0) {
                $sequenceId = count($createdItems) + 1;
            }

            $stateName = strtolower(trim($itemData['state_name'] ?? 'backlog'));
            $stateId = $stateMap[$stateName]->id ?? $stateMap['backlog']->id ?? array_values($stateMap)[0]->id;

            $priority = strtoupper($itemData['priority'] ?? 'NONE');
            if (! in_array($priority, ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'], true)) {
                $priority = 'NONE';
            }

            $estimateRaw = $itemData['estimate'] ?? null;
            $estimatePoints = is_numeric($estimateRaw) ? (float) $estimateRaw : null;
            $estimateValue = is_numeric($estimateRaw) ? (string) $estimateRaw : null;

            $descriptionHtml = isset($itemData['description']) ? nl2br(e($itemData['description'])) : null;
            $createdAt = ! empty($itemData['created_at']) ? Carbon::parse($itemData['created_at']) : now();
            $updatedAt = ! empty($itemData['updated_at']) ? Carbon::parse($itemData['updated_at']) : now();

            $workItem = new WorkItem();
            $workItem->timestamps = false;
            $workItem->fill([
                'workspace_id' => $workspace->id,
                'project_id' => $project->id,
                'sequence_id' => $sequenceId,
                'title' => trim($itemData['name'] ?? 'Sin título'),
                'description_html' => $descriptionHtml,
                'description_json' => $descriptionHtml ? ['html' => $descriptionHtml] : null,
                'state_id' => $stateId,
                'type_id' => array_values($typeMap)[0]->id ?? null,
                'priority' => $priority,
                'lead_id' => $actor->id,
                'estimate_points' => $estimatePoints,
                'estimate_value' => $estimateValue,
                'created_by' => $actor->id,
            ]);
            $workItem->created_at = $createdAt;
            $workItem->updated_at = $updatedAt;
            $workItem->save();

            // Vincular ciclo con timestamp para cálculo de analíticas
            $sprintName = strtolower(trim($itemData['sprint'] ?? ''));
            if (! empty($sprintName) && isset($cycleMap[$sprintName])) {
                $cycleModel = $cycleMap[$sprintName];
                $addedAt = $cycleModel->start_date ? Carbon::parse($cycleModel->start_date)->startOfDay() : $createdAt;

                DB::table('cycle_work_items')->updateOrInsert(
                    [
                        'cycle_id' => $cycleModel->id,
                        'work_item_id' => $workItem->id,
                    ],
                    [
                        'created_at' => $addedAt,
                        'updated_at' => $addedAt,
                    ]
                );
            }

            // Vincular módulo
            $modName = strtolower(trim($itemData['module'] ?? ''));
            if (! empty($modName) && isset($moduleMap[$modName])) {
                $workItem->modules()->attach($moduleMap[$modName]->id);
            }

            $createdItems[] = $workItem;
            $bySequence[$sequenceId] = $workItem;
        }

        // Enlazar jerarquía de padres
        $parentsLinked = 0;
        foreach ($data as $itemData) {
            $parentIdent = trim($itemData['parent'] ?? '');
            if (empty($parentIdent)) {
                continue;
            }

            $childParts = explode('-', $itemData['identifier'] ?? '');
            $childSeq = (int) end($childParts);

            $parentParts = explode('-', $parentIdent);
            $parentSeq = (int) end($parentParts);

            if (isset($bySequence[$childSeq], $bySequence[$parentSeq])) {
                $bySequence[$childSeq]->parent_id = $bySequence[$parentSeq]->id;
                $bySequence[$childSeq]->save();
                $parentsLinked++;
            }
        }

        Cache::tags(['projects', 'workspace_'.$workspace->id])->flush();

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
            'lead' => [
                'id' => $actor->id,
                'name' => $actor->name,
                'email' => $actor->email,
            ],
            'counts' => [
                'states' => count($stateMap),
                'labels' => 0,
                'work_item_types' => count($typeMap),
                'cycles' => count($cycleMap),
                'modules' => count($moduleMap),
                'milestones' => 0,
                'releases' => 0,
                'work_items' => count($createdItems),
                'parents_linked' => $parentsLinked,
                'relations_created' => 0,
                'dod_items_created' => 0,
            ],
        ];
    }

    /**
     * Resuelve un identificador único para el proyecto en el workspace.
     */
    protected function resolveProjectIdentifier(int $workspaceId, string $baseIdentifier, bool $force): string
    {
        $identifier = $baseIdentifier;

        if ($force) {
            $existing = Project::withoutGlobalScopes()
                ->where('workspace_id', $workspaceId)
                ->where('identifier', $identifier)
                ->first();
            if ($existing) {
                $existing->delete();
            }

            return $identifier;
        }

        $counter = 1;
        while (Project::withoutGlobalScopes()->where('workspace_id', $workspaceId)->where('identifier', $identifier)->exists()) {
            $counter++;
            $cleanPrefix = substr($baseIdentifier, 0, 4);
            $identifier = $cleanPrefix.$counter;
        }

        return $identifier;
    }

    /**
     * Resuelve usuario por email o hace fallback al actor.
     */
    protected function resolveUserByEmail(?string $email, Workspace $workspace, User $actor): User
    {
        if (empty($email)) {
            return $actor;
        }

        $user = User::where('email', $email)->first();
        if ($user) {
            WorkspaceMember::firstOrCreate(
                ['workspace_id' => $workspace->id, 'user_id' => $user->id],
                ['role' => 'MEMBER']
            );

            return $user;
        }

        return $actor;
    }

    /**
     * Crea estados o aplica los 5 por defecto si la lista está vacía.
     */
    protected function importStates(Project $project, array $statesData): array
    {
        $map = [];

        if (empty($statesData)) {
            $defaultStates = [
                ['name' => 'Backlog', 'color' => '#94A3B8', 'group' => 'backlog', 'sequence' => 0, 'is_default' => true],
                ['name' => 'To Do', 'color' => '#60A5FA', 'group' => 'unstarted', 'sequence' => 1, 'is_default' => true],
                ['name' => 'In Progress', 'color' => '#F59E0B', 'group' => 'started', 'sequence' => 2, 'is_default' => true],
                ['name' => 'Done', 'color' => '#10B981', 'group' => 'completed', 'sequence' => 3, 'is_default' => true],
                ['name' => 'Cancelled', 'color' => '#EF4444', 'group' => 'cancelled', 'sequence' => 4, 'is_default' => true],
            ];
            $statesData = $defaultStates;
        }

        foreach ($statesData as $st) {
            $state = State::create([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'name' => $st['name'],
                'group' => strtolower($st['group'] ?? 'unstarted'),
                'color' => $st['color'] ?? '#60A5FA',
                'sequence' => $st['sequence'] ?? count($map),
                'is_default' => ! empty($st['is_default']),
                'description' => $st['description'] ?? null,
            ]);

            $map[strtolower($st['name'])] = $state;
            $groupKey = strtolower($st['group'] ?? '');
            if (! isset($map['group_'.$groupKey])) {
                $map['group_'.$groupKey] = $state;
            }
        }

        return $map;
    }

    /**
     * Crea etiquetas del proyecto.
     */
    protected function importLabels(Project $project, array $labelsData): array
    {
        $map = [];
        foreach ($labelsData as $lbl) {
            $label = Label::create([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'name' => $lbl['name'],
                'color' => $lbl['color'] ?? '#3B82F6',
                'description' => $lbl['description'] ?? null,
            ]);
            $map[strtolower($lbl['name'])] = $label;
        }

        return $map;
    }

    /**
     * Crea tipos de work items del proyecto.
     */
    protected function importWorkItemTypes(Project $project, array $typesData): array
    {
        $map = [];
        if (empty($typesData)) {
            $typesData = [
                ['name' => 'Issue', 'description' => 'Tarea general', 'icon' => 'check-circle-2', 'color' => '#3B82F6'],
                ['name' => 'Bug', 'description' => 'Error o incidencia', 'icon' => 'bug', 'color' => '#EF4444'],
                ['name' => 'Feature', 'description' => 'Nueva funcionalidad', 'icon' => 'sparkles', 'color' => '#8B5CF6'],
            ];
        }

        foreach ($typesData as $t) {
            $type = WorkItemType::create([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'name' => $t['name'],
                'description' => $t['description'] ?? null,
                'icon' => $t['icon'] ?? 'check-circle-2',
                'color' => $t['color'] ?? '#3B82F6',
            ]);
            $map[strtolower($t['name'])] = $type;
        }

        return $map;
    }

    /**
     * Crea ciclos / sprints preservando fechas de inicio, fin y timestamps.
     */
    protected function importCycles(Project $project, array $cyclesData, User $actor): array
    {
        $map = [];
        foreach ($cyclesData as $c) {
            $createdAt = ! empty($c['created_at']) ? Carbon::parse($c['created_at']) : null;
            $updatedAt = ! empty($c['updated_at']) ? Carbon::parse($c['updated_at']) : null;

            $cycle = new Cycle();
            $cycle->timestamps = false;
            $cycle->fill([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'name' => $c['name'],
                'description' => $c['description'] ?? null,
                'sprint_goal' => $c['sprint_goal'] ?? null,
                'capacity_points' => $c['capacity_points'] ?? null,
                'start_date' => $c['start_date'] ?? null,
                'end_date' => $c['end_date'] ?? null,
                'status' => $c['status'] ?? 'UPCOMING',
                'owned_by' => $actor->id,
            ]);
            if ($createdAt) {
                $cycle->created_at = $createdAt;
                $cycle->updated_at = $updatedAt ?? $createdAt;
            } else {
                $cycle->created_at = now();
                $cycle->updated_at = now();
            }
            $cycle->save();

            $map[strtolower($c['name'])] = $cycle;
        }

        return $map;
    }

    /**
     * Crea módulos funcionales.
     */
    protected function importModules(Project $project, array $modulesData, Workspace $workspace, User $actor): array
    {
        $map = [];
        foreach ($modulesData as $m) {
            $moduleLead = $this->resolveUserByEmail($m['lead_email'] ?? null, $workspace, $actor);
            $createdAt = ! empty($m['created_at']) ? Carbon::parse($m['created_at']) : null;
            $updatedAt = ! empty($m['updated_at']) ? Carbon::parse($m['updated_at']) : null;

            $module = new Module();
            $module->timestamps = false;
            $module->fill([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'name' => $m['name'],
                'description' => $m['description'] ?? null,
                'status' => $m['status'] ?? 'PLANNED',
                'start_date' => $m['start_date'] ?? null,
                'target_date' => $m['target_date'] ?? null,
                'lead_id' => $moduleLead->id,
            ]);
            if ($createdAt) {
                $module->created_at = $createdAt;
                $module->updated_at = $updatedAt ?? $createdAt;
            } else {
                $module->created_at = now();
                $module->updated_at = now();
            }
            $module->save();

            $map[strtolower($m['name'])] = $module;
        }

        return $map;
    }

    /**
     * Crea hitos (milestones).
     */
    protected function importMilestones(Project $project, array $milestonesData): array
    {
        $map = [];
        foreach ($milestonesData as $m) {
            $createdAt = ! empty($m['created_at']) ? Carbon::parse($m['created_at']) : null;
            $updatedAt = ! empty($m['updated_at']) ? Carbon::parse($m['updated_at']) : null;

            $milestone = new Milestone();
            $milestone->timestamps = false;
            $milestone->fill([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'title' => $m['title'],
                'description' => $m['description'] ?? null,
                'target_date' => $m['target_date'] ?? null,
                'status' => $m['status'] ?? 'UPCOMING',
                'completed_at' => ! empty($m['completed_at']) ? Carbon::parse($m['completed_at']) : null,
            ]);
            if ($createdAt) {
                $milestone->created_at = $createdAt;
                $milestone->updated_at = $updatedAt ?? $createdAt;
            } else {
                $milestone->created_at = now();
                $milestone->updated_at = now();
            }
            $milestone->save();

            $map[strtolower($m['title'])] = $milestone;
        }

        return $map;
    }

    /**
     * Crea versiones (releases).
     */
    protected function importReleases(Project $project, array $releasesData, User $actor): array
    {
        $map = [];
        foreach ($releasesData as $r) {
            $createdAt = ! empty($r['created_at']) ? Carbon::parse($r['created_at']) : null;
            $updatedAt = ! empty($r['updated_at']) ? Carbon::parse($r['updated_at']) : null;

            $release = new Release();
            $release->timestamps = false;
            $release->fill([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'name' => $r['name'],
                'version' => $r['version'],
                'description' => $r['description'] ?? null,
                'changelog' => $r['changelog'] ?? null,
                'status' => $r['status'] ?? 'PLANNED',
                'published_at' => ! empty($r['published_at']) ? Carbon::parse($r['published_at']) : null,
                'created_by' => $actor->id,
            ]);
            if ($createdAt) {
                $release->created_at = $createdAt;
                $release->updated_at = $updatedAt ?? $createdAt;
            } else {
                $release->created_at = now();
                $release->updated_at = now();
            }
            $release->save();

            $map[strtolower($r['version'])] = $release;
        }

        return $map;
    }

    /**
     * Crea páginas y documentación.
     */
    protected function importPages(Project $project, array $pagesData, User $actor): void
    {
        foreach ($pagesData as $p) {
            $createdAt = ! empty($p['created_at']) ? Carbon::parse($p['created_at']) : null;
            $updatedAt = ! empty($p['updated_at']) ? Carbon::parse($p['updated_at']) : null;

            $page = new Page();
            $page->timestamps = false;
            $page->fill([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'title' => $p['title'],
                'content_json' => $p['content_json'] ?? null,
                'is_published' => ! empty($p['is_published']),
                'is_locked' => ! empty($p['is_locked']),
                'access' => $p['access'] ?? 'PUBLIC',
                'icon' => $p['icon'] ?? null,
                'color' => $p['color'] ?? null,
                'order' => $p['order'] ?? 0,
                'created_by' => $actor->id,
                'last_edited_by' => $actor->id,
            ]);
            if ($createdAt) {
                $page->created_at = $createdAt;
                $page->updated_at = $updatedAt ?? $createdAt;
            } else {
                $page->created_at = now();
                $page->updated_at = now();
            }
            $page->save();
        }
    }

    /**
     * Crea vistas personalizadas.
     */
    protected function importViews(Project $project, array $viewsData, User $actor): void
    {
        foreach ($viewsData as $v) {
            View::create([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'name' => $v['name'],
                'description' => $v['description'] ?? null,
                'filters' => $v['filters'] ?? [],
                'display_filters' => $v['display_filters'] ?? [],
                'created_by' => $actor->id,
            ]);
        }
    }

    /**
     * Importa la colección de work items en 2 pasadas, preservando timestamps y asignaciones.
     */
    protected function importWorkItems(
        Project $project,
        array $workItemsData,
        Workspace $workspace,
        User $actor,
        array $stateMap,
        array $typeMap,
        array $labelMap,
        array $cycleMap,
        array $moduleMap,
        array $milestoneMap
    ): array {
        $bySequence = [];
        $dodItemsCreated = 0;
        $parentsLinked = 0;
        $relationsCreated = 0;

        $firstState = array_values($stateMap)[0] ?? null;
        $firstType = array_values($typeMap)[0] ?? null;

        // Pasada 1: Crear Work Items y relaciones directas
        foreach ($workItemsData as $idx => $itemData) {
            $seqId = (int) ($itemData['sequence_id'] ?? ($idx + 1));

            // Resolver Estado
            $stateName = strtolower(trim($itemData['state_name'] ?? ''));
            $stateGroup = strtolower(trim($itemData['state_group'] ?? ''));
            $state = $stateMap[$stateName]
                ?? $stateMap['group_'.$stateGroup]
                ?? $firstState;

            // Resolver Tipo
            $typeName = strtolower(trim($itemData['type_name'] ?? ''));
            $type = $typeMap[$typeName] ?? $firstType;

            // Resolver Milestone
            $msTitle = strtolower(trim($itemData['milestone_title'] ?? ''));
            $milestone = $milestoneMap[$msTitle] ?? null;

            // Resolver Lead
            $itemLead = $this->resolveUserByEmail($itemData['lead_email'] ?? null, $workspace, $actor);

            $priority = strtoupper($itemData['priority'] ?? 'NONE');
            if (! in_array($priority, ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'], true)) {
                $priority = 'NONE';
            }

            $descriptionHtml = $itemData['description_html'] ?? null;
            $descriptionJson = $itemData['description_json'] ?? ($descriptionHtml ? ['html' => $descriptionHtml] : null);

            $createdAt = ! empty($itemData['created_at']) ? Carbon::parse($itemData['created_at']) : null;
            $updatedAt = ! empty($itemData['updated_at']) ? Carbon::parse($itemData['updated_at']) : null;
            $completedAt = ! empty($itemData['completed_at']) ? Carbon::parse($itemData['completed_at']) : null;
            $stateChangedAt = ! empty($itemData['state_changed_at']) ? Carbon::parse($itemData['state_changed_at']) : null;

            $workItem = new WorkItem();
            $workItem->timestamps = false;
            $workItem->fill([
                'workspace_id' => $workspace->id,
                'project_id' => $project->id,
                'sequence_id' => $seqId,
                'title' => trim($itemData['title'] ?? 'Sin título'),
                'description_html' => $descriptionHtml,
                'description_json' => $descriptionJson,
                'state_id' => $state?->id,
                'type_id' => $type?->id,
                'milestone_id' => $milestone?->id,
                'priority' => $priority,
                'sort_order' => $itemData['sort_order'] ?? $seqId,
                'estimate_points' => $itemData['estimate_points'] ?? null,
                'estimate_value' => $itemData['estimate_value'] ?? null,
                'start_date' => $itemData['start_date'] ?? null,
                'target_date' => $itemData['target_date'] ?? null,
                'completed_at' => $completedAt,
                'state_changed_at' => $stateChangedAt ?? ($state?->group === 'completed' ? $completedAt : null),
                'is_draft' => ! empty($itemData['is_draft']),
                'is_blocked' => ! empty($itemData['is_blocked']),
                'blocked_reason' => $itemData['blocked_reason'] ?? null,
                'lead_id' => $itemLead->id,
                'created_by' => $actor->id,
            ]);

            if ($createdAt) {
                $workItem->created_at = $createdAt;
                $workItem->updated_at = $updatedAt ?? $createdAt;
            } else {
                $workItem->created_at = now();
                $workItem->updated_at = now();
            }
            $workItem->save();

            // Asignar Responsables / Assignees
            $assigneeList = $itemData['assignees'] ?? $itemData['assignee_emails'] ?? [];
            if (! empty($assigneeList) && is_array($assigneeList)) {
                $assigneeIds = [];
                foreach ($assigneeList as $a) {
                    $email = is_array($a) ? ($a['email'] ?? null) : (string) $a;
                    if ($email) {
                        $assigneeUser = $this->resolveUserByEmail($email, $workspace, $actor);
                        $assigneeIds[] = $assigneeUser->id;
                    }
                }
                if (! empty($assigneeIds)) {
                    $workItem->assignees()->syncWithoutDetaching($assigneeIds);
                }
            }

            // Asignar Ciclos con timestamps precisos en cycle_work_items
            if (! empty($itemData['cycles']) && is_array($itemData['cycles'])) {
                foreach ($itemData['cycles'] as $cycleEntry) {
                    $cName = is_array($cycleEntry) ? ($cycleEntry['name'] ?? '') : (string) $cycleEntry;
                    $key = strtolower(trim($cName));
                    if (! isset($cycleMap[$key])) {
                        continue;
                    }

                    $cycleModel = $cycleMap[$key];
                    $addedAt = null;
                    if (is_array($cycleEntry) && ! empty($cycleEntry['added_at'])) {
                        $addedAt = Carbon::parse($cycleEntry['added_at']);
                    } elseif ($cycleModel->start_date) {
                        $addedAt = Carbon::parse($cycleModel->start_date)->startOfDay();
                    } elseif ($createdAt) {
                        $addedAt = $createdAt;
                    } else {
                        $addedAt = now();
                    }

                    $statusAtComp = is_array($cycleEntry) ? ($cycleEntry['status_at_completion'] ?? null) : null;
                    $transferredTo = is_array($cycleEntry) ? ($cycleEntry['transferred_to_cycle_id'] ?? null) : null;

                    DB::table('cycle_work_items')->updateOrInsert(
                        [
                            'cycle_id' => $cycleModel->id,
                            'work_item_id' => $workItem->id,
                        ],
                        [
                            'status_at_completion' => $statusAtComp,
                            'transferred_to_cycle_id' => $transferredTo,
                            'created_at' => $addedAt,
                            'updated_at' => $addedAt,
                        ]
                    );
                }
            }

            // Asignar Módulos
            if (! empty($itemData['modules']) && is_array($itemData['modules'])) {
                foreach ($itemData['modules'] as $mName) {
                    $key = strtolower(trim($mName));
                    if (isset($moduleMap[$key])) {
                        $workItem->modules()->syncWithoutDetaching([$moduleMap[$key]->id]);
                    }
                }
            }

            // Asignar Etiquetas
            if (! empty($itemData['labels']) && is_array($itemData['labels'])) {
                foreach ($itemData['labels'] as $lName) {
                    $key = strtolower(trim($lName));
                    if (isset($labelMap[$key])) {
                        $workItem->labels()->syncWithoutDetaching([$labelMap[$key]->id]);
                    }
                }
            }

            // Deliverables
            if (! empty($itemData['deliverables']) && is_array($itemData['deliverables'])) {
                foreach ($itemData['deliverables'] as $del) {
                    $delModel = new WorkItemDeliverable();
                    $delModel->timestamps = false;
                    $delModel->fill([
                        'workspace_id' => $workspace->id,
                        'project_id' => $project->id,
                        'work_item_id' => $workItem->id,
                        'created_by' => $actor->id,
                        'title' => trim($del['title'] ?? ''),
                        'type' => $del['type'] ?? 'LINK',
                        'url' => $del['url'] ?? null,
                        'file_name' => $del['file_name'] ?? null,
                        'file_size' => $del['file_size'] ?? null,
                        'file_mime' => $del['file_mime'] ?? null,
                        'description' => $del['description'] ?? null,
                        'status' => $del['status'] ?? 'PENDING',
                        'reviewed_at' => ! empty($del['reviewed_at']) ? Carbon::parse($del['reviewed_at']) : null,
                        'review_notes' => $del['review_notes'] ?? null,
                    ]);
                    if (! empty($del['created_at'])) {
                        $delModel->created_at = Carbon::parse($del['created_at']);
                        $delModel->updated_at = Carbon::parse($del['created_at']);
                    } else {
                        $delModel->created_at = now();
                        $delModel->updated_at = now();
                    }
                    $delModel->save();
                }
            }

            // Criterios de Aceptación / DoD
            if (! empty($itemData['dod_items']) && is_array($itemData['dod_items'])) {
                foreach ($itemData['dod_items'] as $dod) {
                    WorkItemDodItem::create([
                        'work_item_id' => $workItem->id,
                        'title' => trim($dod['title'] ?? ''),
                        'is_completed' => ! empty($dod['is_completed']),
                        'completed_at' => ! empty($dod['completed_at']) ? Carbon::parse($dod['completed_at']) : null,
                        'completed_by' => ! empty($dod['is_completed']) ? $actor->id : null,
                    ]);
                    $dodItemsCreated++;
                }
            }

            $bySequence[$seqId] = $workItem;
        }

        // Pasada 2: Jerarquía Padres y Relaciones
        foreach ($workItemsData as $itemData) {
            $seqId = (int) ($itemData['sequence_id'] ?? 0);
            if (! isset($bySequence[$seqId])) {
                continue;
            }

            $currentWorkItem = $bySequence[$seqId];

            // Enlazar Padre
            $parentSeqId = (int) ($itemData['parent_sequence_id'] ?? 0);
            if ($parentSeqId > 0 && isset($bySequence[$parentSeqId])) {
                $currentWorkItem->parent_id = $bySequence[$parentSeqId]->id;
                $currentWorkItem->save();
                $parentsLinked++;
            }

            // Enlazar Relaciones
            if (! empty($itemData['relations']) && is_array($itemData['relations'])) {
                foreach ($itemData['relations'] as $rel) {
                    $targetSeqId = (int) ($rel['target_sequence_id'] ?? 0);
                    if ($targetSeqId > 0 && isset($bySequence[$targetSeqId])) {
                        WorkItemRelation::firstOrCreate([
                            'workspace_id' => $workspace->id,
                            'source_id' => $currentWorkItem->id,
                            'target_id' => $bySequence[$targetSeqId]->id,
                            'relation_type' => $rel['relation_type'] ?? 'RELATES_TO',
                        ]);
                        $relationsCreated++;
                    }
                }
            }
        }

        return [
            'total_items' => count($bySequence),
            'by_sequence' => $bySequence,
            'parents_linked' => $parentsLinked,
            'relations_created' => $relationsCreated,
            'dod_items_created' => $dodItemsCreated,
        ];
    }

    /**
     * Importa actividades recientes del proyecto y crea log de importación.
     */
    protected function importActivities(Project $project, array $activitiesData, array $bySequence, Workspace $workspace, User $actor): void
    {
        foreach ($activitiesData as $actData) {
            $actorUser = $this->resolveUserByEmail($actData['actor_email'] ?? null, $workspace, $actor);
            $entityType = $actData['entity_type'] ?? 'PROJECT';
            $entityId = $project->id;

            if ($entityType === 'WORK_ITEM') {
                $seqId = $actData['entity_sequence_id'] ?? null;
                if ($seqId && isset($bySequence[$seqId])) {
                    $entityId = $bySequence[$seqId]->id;
                } else {
                    continue;
                }
            }

            $activity = new Activity();
            $activity->timestamps = false;
            $activity->fill([
                'workspace_id' => $workspace->id,
                'project_id' => $project->id,
                'actor_id' => $actorUser->id,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'action' => $actData['action'] ?? 'UPDATED',
                'changes_diff' => $actData['changes_diff'] ?? null,
            ]);
            if (! empty($actData['created_at'])) {
                $activity->created_at = Carbon::parse($actData['created_at']);
                $activity->updated_at = Carbon::parse($actData['created_at']);
            } else {
                $activity->created_at = now();
                $activity->updated_at = now();
            }
            $activity->save();
        }

        // Registrar actividad de importación del proyecto
        $importActivity = new Activity();
        $importActivity->fill([
            'workspace_id' => $workspace->id,
            'project_id' => $project->id,
            'actor_id' => $actor->id,
            'entity_type' => 'PROJECT',
            'entity_id' => $project->id,
            'action' => 'PROJECT_IMPORTED',
            'changes_diff' => [
                'imported_by' => $actor->name,
                'project_name' => $project->name,
            ],
        ]);
        $importActivity->save();
    }
}

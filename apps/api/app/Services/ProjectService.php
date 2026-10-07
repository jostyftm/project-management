<?php

namespace App\Services;

use App\Models\Label;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\State;
use App\Models\WorkItemDeliverable;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProjectService
{
    /**
     * Lista los proyectos del workspace activo.
     */
    public function list(Request $request): Collection|AbstractPaginator
    {
        $user = $request->user();
        $workspace = app()->has('current_workspace')
            ? app('current_workspace')
            : ($request->attributes->get('workspace') ?? \App\Models\Workspace::find(app('current_workspace_id')));

        return (new Project)->search(
            request: $request,
            relationships: ['lead', 'states', 'labels', 'members'],
            callback: function ($builder) use ($user, $workspace) {
                if (! $user) {
                    $builder->whereRaw('1 = 0');
                    return;
                }

                // Superadministrador de la instancia y Dueño del Workspace ven todos los proyectos del workspace
                if ($user->is_instance_admin || ($workspace && (int) $workspace->owner_id === (int) $user->id)) {
                    return;
                }

                // Miembros regulares solo ven los proyectos donde están registrados en project_members
                $builder->whereHas('members', function ($query) use ($user) {
                    $query->where('users.id', $user->id);
                });
            },
            filters: ['name', 'identifier', 'is_archived'],
            sorts: ['created_at', 'name', 'identifier']
        );
    }

    /**
     * Obtiene un proyecto con sus estados y etiquetas.
     */
    public function get(Project $project): Project
    {
        return $project->load(['lead', 'states', 'labels', 'members']);
    }

    /**
     * Crea un proyecto con sus estados y etiquetas por defecto.
     */
    public function save(Request $request): Project
    {
        $data = $request->validated();
        $user = $request->user();
        $workspaceId = app('current_workspace_id');

        if (! $workspaceId) {
            throw ValidationException::withMessages([
                'workspace_id' => ['Se requiere un workspace activo para crear proyectos.'],
            ]);
        }

        $existingIdentifier = Project::withoutGlobalScopes()
            ->where('workspace_id', $workspaceId)
            ->where('identifier', strtoupper($data['identifier']))
            ->exists();

        if ($existingIdentifier) {
            throw ValidationException::withMessages([
                'identifier' => ['El identificador ya está en uso en este workspace.'],
            ]);
        }

        return DB::transaction(function () use ($data, $user, $workspaceId) {
            $project = Project::create([
                'workspace_id' => $workspaceId,
                'name' => $data['name'],
                'identifier' => strtoupper($data['identifier']),
                'description' => $data['description'] ?? null,
                'icon' => $data['icon'] ?? '📁',
                'is_public' => $data['is_public'] ?? false,
                'lead_id' => $user->id,
                'start_date' => $data['start_date'] ?? null,
                'target_date' => $data['target_date'] ?? null,
            ]);

            // Asignar creador como Project ADMIN
            ProjectMember::create([
                'project_id' => $project->id,
                'user_id' => $user->id,
                'role' => 'ADMIN',
            ]);

            // Crear 5 estados por defecto (Plane Specification)
            $defaultStates = [
                ['name' => 'Backlog', 'color' => '#94A3B8', 'group' => 'BACKLOG', 'sequence' => 0, 'is_default' => true],
                ['name' => 'To Do', 'color' => '#60A5FA', 'group' => 'UNSTARTED', 'sequence' => 1, 'is_default' => true],
                ['name' => 'In Progress', 'color' => '#F59E0B', 'group' => 'STARTED', 'sequence' => 2, 'is_default' => true],
                ['name' => 'Done', 'color' => '#10B981', 'group' => 'COMPLETED', 'sequence' => 3, 'is_default' => true],
                ['name' => 'Cancelled', 'color' => '#EF4444', 'group' => 'CANCELLED', 'sequence' => 4, 'is_default' => true],
            ];

            foreach ($defaultStates as $st) {
                State::create(array_merge($st, [
                    'workspace_id' => $workspaceId,
                    'project_id' => $project->id,
                ]));
            }

            // Crear etiquetas por defecto
            $defaultLabels = [
                ['name' => 'Bug', 'color' => '#EF4444', 'description' => 'Incidencias y errores'],
                ['name' => 'Feature', 'color' => '#8B5CF6', 'description' => 'Nueva funcionalidad'],
                ['name' => 'Improvement', 'color' => '#3B82F6', 'description' => 'Mejoras y refactor'],
            ];

            foreach ($defaultLabels as $lb) {
                Label::create(array_merge($lb, [
                    'workspace_id' => $workspaceId,
                    'project_id' => $project->id,
                ]));
            }

            // Crear tipos de work items por defecto (Tarea, Bug, Historia, Épica)
            (new WorkItemTypeService)->seedDefaultTypes($project);

            return $project->load(['states', 'labels', 'lead', 'workItemTypes']);
        });
    }

    /**
     * Actualiza propiedades del proyecto.
     */
    public function update(Request $request, Project $project): Project
    {
        $data = $request->validated();
        $project->update($data);

        return $project->load(['states', 'labels', 'lead']);
    }

    /**
     * Elimina el proyecto y sus dependencias.
     */
    public function delete(Project $project): void
    {
        // Limpiar archivos físicos de entregables asociados al proyecto
        $deliverables = WorkItemDeliverable::where('project_id', $project->id)
            ->whereNotNull('file_path')
            ->get();

        foreach ($deliverables as $deliverable) {
            if (! str_starts_with($deliverable->file_path, 'http://') && ! str_starts_with($deliverable->file_path, 'https://')) {
                $disk = $deliverable->disk ?? config('filesystems.default');
                try {
                    Storage::disk($disk)->delete($deliverable->file_path);
                } catch (\Throwable) {
                    // Prevenir interrupciones si el archivo ya no existe físicamente
                }
            }
        }

        $project->delete();
    }

    /**
     * Crea un estado personalizado para el proyecto.
     */
    public function createState(Request $request, Project $project): State
    {
        $data = $request->validated();

        return State::create([
            'workspace_id' => $project->workspace_id,
            'project_id' => $project->id,
            'name' => $data['name'],
            'color' => $data['color'] ?? '#60A5FA',
            'group' => $data['group'],
            'sequence' => $data['sequence'] ?? 10,
            'is_default' => $data['is_default'] ?? false,
        ]);
    }

    /**
     * Crea una etiqueta para el proyecto.
     */
    public function createLabel(Request $request, Project $project): Label
    {
        $data = $request->validated();

        return Label::create([
            'workspace_id' => $project->workspace_id,
            'project_id' => $project->id,
            'name' => $data['name'],
            'color' => $data['color'] ?? '#EF4444',
            'description' => $data['description'] ?? null,
        ]);
    }
}

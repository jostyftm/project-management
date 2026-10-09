<?php

namespace App\Services;

use App\Models\Project;
use App\Models\WorkItemType;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class WorkItemTypeService
{
    /**
     * Lista los tipos de work items disponibles para un proyecto o workspace.
     */
    public function list(Request $request, ?Project $project = null): Collection
    {
        $workspaceId = app('current_workspace_id');

        $query = WorkItemType::where('workspace_id', $workspaceId);

        if ($project) {
            $query->where(function ($q) use ($project) {
                $q->whereNull('project_id')
                    ->orWhere('project_id', $project->id);
            });
        }

        return $query->orderBy('is_default', 'desc')->orderBy('name')->get();
    }

    /**
     * Crea un tipo de work item.
     */
    public function save(Request $request, ?Project $project = null): WorkItemType
    {
        $data = $request->validated();
        $workspaceId = app('current_workspace_id');

        return WorkItemType::create([
            'workspace_id' => $workspaceId,
            'project_id' => $project?->id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'icon' => $data['icon'] ?? 'check-square',
            'color' => $data['color'] ?? '#6366f1',
            'is_default' => $data['is_default'] ?? false,
        ]);
    }

    /**
     * Inicializa los tipos de work items estándar de Plane al crear un proyecto.
     */
    public function seedDefaultTypes(Project $project): void
    {
        $defaults = [
            ['name' => 'Tarea', 'icon' => 'check-square', 'color' => '#3b82f6', 'is_default' => true],
            ['name' => 'Bug', 'icon' => 'alert-circle', 'color' => '#ef4444', 'is_default' => false],
            ['name' => 'Historia', 'icon' => 'bookmark', 'color' => '#f59e0b', 'is_default' => false],
            ['name' => 'Épica', 'icon' => 'zap', 'color' => '#8b5cf6', 'is_default' => false],
        ];

        foreach ($defaults as $type) {
            WorkItemType::create([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'name' => $type['name'],
                'icon' => $type['icon'],
                'color' => $type['color'],
                'is_default' => $type['is_default'],
            ]);
        }
    }
}

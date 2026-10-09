<?php

namespace App\Services;

use App\Models\Module;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;

class ModuleService
{
    /**
     * Lista módulos para un proyecto con filtros.
     */
    public function list(Request $request, Project $project): Collection|AbstractPaginator
    {
        return (new Module)->search(
            request: $request,
            relationships: ['lead', 'workItems.state'],
            callback: function ($query) use ($project) {
                $query->where('project_id', $project->id);
            },
            filters: ['name', 'status'],
            sorts: ['created_at', 'start_date', 'target_date']
        );
    }

    /**
     * Obtiene un módulo con sus work items y responsable.
     */
    public function get(Module $module): Module
    {
        return $module->load(['lead', 'workItems.state', 'workItems.type', 'workItems.assignees']);
    }

    /**
     * Crea un nuevo módulo.
     */
    public function save(Request $request, Project $project): Module
    {
        $data = $request->validated();
        $user = $request->user();
        $workspaceId = app('current_workspace_id');

        return Module::create([
            'workspace_id' => $workspaceId,
            'project_id' => $project->id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'PLANNED',
            'lead_id' => $data['lead_id'] ?? $user?->id,
            'start_date' => $data['start_date'] ?? null,
            'target_date' => $data['target_date'] ?? null,
        ]);
    }

    /**
     * Actualiza un módulo existente.
     */
    public function update(Request $request, Module $module): Module
    {
        $data = $request->validated();
        $module->update($data);

        return $module->load(['lead', 'workItems']);
    }

    /**
     * Sincroniza work items asociados al módulo.
     */
    public function syncWorkItems(Module $module, array $workItemIds): Module
    {
        $module->workItems()->sync($workItemIds);

        return $module->load('workItems');
    }

    /**
     * Calcula desglose de progreso agregado del módulo.
     */
    public function getProgress(Module $module): array
    {
        $module->load(['workItems.state']);

        $total = $module->workItems->count();
        $breakdown = [
            'backlog' => 0,
            'unstarted' => 0,
            'started' => 0,
            'completed' => 0,
            'cancelled' => 0,
        ];

        foreach ($module->workItems as $item) {
            $group = strtolower($item->state?->group ?? 'unstarted');
            if (isset($breakdown[$group])) {
                $breakdown[$group]++;
            } else {
                $breakdown['unstarted']++;
            }
        }

        $completedCount = $breakdown['completed'];
        $percentage = $total > 0 ? round(($completedCount / $total) * 100, 1) : 0;

        return [
            'module_id' => $module->id,
            'name' => $module->name,
            'status' => $module->status,
            'total_items' => $total,
            'completed_items' => $completedCount,
            'progress_percentage' => $percentage,
            'breakdown' => $breakdown,
        ];
    }
}

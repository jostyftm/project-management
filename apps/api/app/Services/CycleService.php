<?php

namespace App\Services;

use App\Models\Cycle;
use App\Models\CycleWorkItem;
use App\Models\Project;
use App\Models\State;
use App\Models\WorkItem;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CycleService
{
    /**
     * Lista ciclos para un proyecto con filtros de estado.
     */
    public function list(Request $request, Project $project): Collection|AbstractPaginator
    {
        return (new Cycle)->search(
            request: $request,
            relationships: ['owner', 'workItems.state'],
            callback: function ($query) use ($project) {
                $query->where('project_id', $project->id);
            },
            filters: ['name', 'status'],
            sorts: ['created_at', 'start_date', 'end_date']
        );
    }

    /**
     * Obtiene un ciclo con sus work items.
     */
    public function get(Cycle $cycle): Cycle
    {
        return $cycle->load(['owner', 'workItems.state', 'workItems.type', 'workItems.assignees']);
    }

    /**
     * Crea un nuevo ciclo.
     */
    public function save(Request $request, Project $project): Cycle
    {
        $data = $request->validated();
        $user = $request->user();
        $workspaceId = app('current_workspace_id');

        return Cycle::create([
            'workspace_id' => $workspaceId,
            'project_id' => $project->id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null,
            'status' => $data['status'] ?? 'UPCOMING',
            'owned_by' => $data['owned_by'] ?? $user?->id,
        ]);
    }

    /**
     * Actualiza un ciclo existente.
     */
    public function update(Request $request, Cycle $cycle): Cycle
    {
        $data = $request->validated();
        $cycle->update($data);
        return $cycle->load(['owner', 'workItems']);
    }

    /**
     * Asocia work items al ciclo.
     */
    public function addWorkItems(Cycle $cycle, array $workItemIds): Cycle
    {
        $cycle->workItems()->syncWithoutDetaching($workItemIds);
        return $cycle->load('workItems');
    }

    /**
     * Remueve un work item del ciclo.
     */
    public function removeWorkItem(Cycle $cycle, WorkItem $workItem): void
    {
        $cycle->workItems()->detach($workItem->id);
    }

    /**
     * Finaliza un ciclo de trabajo:
     * - Registra el status_at_completion de cada item.
     * - Por defecto transfiere los items pendientes de vuelta al Backlog (conservando la auditoría).
     */
    public function completeCycle(Cycle $cycle, ?string $transferTarget = 'BACKLOG', ?int $targetCycleId = null): Cycle
    {
        return DB::transaction(function () use ($cycle, $transferTarget, $targetCycleId) {
            $cycle->load(['workItems.state', 'project.states']);
            $project = $cycle->project;

            // Encontrar el estado backlog del proyecto para items devueltos
            $backlogState = $project->states->firstWhere('group', 'BACKLOG')
                ?? $project->states->firstWhere('group', 'UNSTARTED')
                ?? $project->states->first();

            foreach ($cycle->workItems as $item) {
                $isCompleted = in_array($item->state?->group, ['COMPLETED', 'CANCELLED']);

                if ($isCompleted) {
                    CycleWorkItem::where('cycle_id', $cycle->id)
                        ->where('work_item_id', $item->id)
                        ->update(['status_at_completion' => 'COMPLETED']);
                } else {
                    // Item no completado: registrar snapshot para estadísticas
                    CycleWorkItem::where('cycle_id', $cycle->id)
                        ->where('work_item_id', $item->id)
                        ->update([
                            'status_at_completion' => 'TRANSFERRED_TO_BACKLOG',
                            'transferred_to_cycle_id' => $targetCycleId,
                        ]);

                    // Si la regla es regresar al backlog, mover el estado del item
                    if ($transferTarget === 'BACKLOG' && $backlogState) {
                        $item->update(['state_id' => $backlogState->id]);
                    } elseif ($targetCycleId) {
                        // Transferir al siguiente ciclo activo
                        DB::table('cycle_work_items')->insertOrIgnore([
                            'cycle_id' => $targetCycleId,
                            'work_item_id' => $item->id,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }

            $cycle->update(['status' => 'COMPLETED']);

            return $cycle->fresh(['workItems.state']);
        });
    }

    /**
     * Calcula métricas y datos de analíticas (burn-down y efectividad del ciclo).
     */
    public function getAnalytics(Cycle $cycle): array
    {
        $cycle->load(['workItems.state']);

        $totalItems = $cycle->workItems->count();
        $completedItems = 0;
        $incompleteItems = 0;
        $totalPoints = 0;
        $completedPoints = 0;

        foreach ($cycle->workItems as $item) {
            $points = (float) ($item->estimate_points ?? 0);
            $totalPoints += $points;

            $statusAtCompletion = $item->pivot->status_at_completion ?? null;
            $isCompletedNow = in_array($item->state?->group, ['COMPLETED', 'CANCELLED']);

            if ($statusAtCompletion === 'COMPLETED' || ($cycle->status !== 'COMPLETED' && $isCompletedNow)) {
                $completedItems++;
                $completedPoints += $points;
            } elseif ($statusAtCompletion === 'TRANSFERRED_TO_BACKLOG' || ($cycle->status !== 'COMPLETED' && !$isCompletedNow)) {
                $incompleteItems++;
            }
        }

        $completionRate = $totalItems > 0 ? round(($completedItems / $totalItems) * 100, 1) : 0;

        return [
            'cycle_id' => $cycle->id,
            'name' => $cycle->name,
            'status' => $cycle->status,
            'start_date' => $cycle->start_date?->format('Y-m-d'),
            'end_date' => $cycle->end_date?->format('Y-m-d'),
            'metrics' => [
                'total_items' => $totalItems,
                'completed_items' => $completedItems,
                'incomplete_items' => $incompleteItems,
                'completion_rate' => $completionRate,
                'total_points' => $totalPoints,
                'completed_points' => $completedPoints,
            ],
        ];
    }
}

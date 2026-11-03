<?php

namespace App\Services\Reports\Resolvers;

use App\Models\Cycle;
use App\Models\ReportBlock;
use App\Services\CycleService;

class SprintBurndownResolver
{
    public function __construct(
        protected CycleService $cycleService
    ) {}

    /**
     * Resuelve analítica de burndown y burnup de un ciclo/sprint.
     * Config: { cycle_id: string|int, project_ids: [], chart_type: 'burndown'|'burnup', filter_by: 'work_items'|'estimates' }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $projectIds = ! empty($config['project_ids']) ? (array) $config['project_ids'] : (! empty($config['project_id']) ? [$config['project_id']] : (! empty($scope['project_ids']) ? (array) $scope['project_ids'] : []));
        $cycleId = $config['cycle_id'] ?? (! empty($config['cycle_ids']) ? (is_array($config['cycle_ids']) ? reset($config['cycle_ids']) : $config['cycle_ids']) : (! empty($scope['cycle_ids']) ? reset($scope['cycle_ids']) : null));
        $chartType = $config['chart_type'] ?? 'burndown';
        $filterBy = $config['filter_by'] ?? 'work_items';

        // 1. Obtener lista de ciclos disponibles para el selector dinámico
        $cyclesQuery = Cycle::query();
        if (! empty($projectIds)) {
            $cyclesQuery->whereIn('project_id', $projectIds);
        } elseif (! empty($scope['workspace_id'])) {
            $cyclesQuery->where('workspace_id', $scope['workspace_id']);
        }

        $availableCycles = $cyclesQuery
            ->orderByRaw("CASE 
                WHEN status = 'CURRENT' THEN 1 
                WHEN status = 'UPCOMING' THEN 2 
                WHEN status = 'COMPLETED' THEN 3 
                ELSE 4 END")
            ->orderBy('start_date', 'desc')
            ->take(30)
            ->get(['id', 'project_id', 'name', 'status', 'start_date', 'end_date'])
            ->map(fn ($c) => [
                'id' => (string) $c->id,
                'name' => $c->name,
                'status' => $c->status,
                'start_date' => $c->start_date?->toDateString(),
                'end_date' => $c->end_date?->toDateString(),
            ])
            ->all();

        // 2. Determinar qué ciclo analizar
        $selectedCycle = null;
        if (! empty($cycleId)) {
            $selectedCycle = Cycle::find($cycleId);
        }

        if (! $selectedCycle && ! empty($availableCycles)) {
            $selectedCycle = Cycle::find($availableCycles[0]['id']);
        }

        if (! $selectedCycle) {
            return [
                'selected_cycle' => null,
                'available_cycles' => [],
                'timeline' => [
                    'dates' => [],
                    'work_items' => [],
                    'estimates' => [],
                ],
                'metrics' => [
                    'scope' => 0,
                    'completed' => 0,
                    'pending' => 0,
                    'completion_rate' => 0,
                ],
                'chart_type' => $chartType,
                'filter_by' => $filterBy,
                'message' => 'No hay ciclos o sprints disponibles para este proyecto/workspace.',
            ];
        }

        // 3. Generar métricas y analítica completa a través de CycleService
        $analytics = $this->cycleService->getAnalytics($selectedCycle);

        return [
            'selected_cycle' => [
                'id' => (string) $selectedCycle->id,
                'project_id' => (string) $selectedCycle->project_id,
                'name' => $selectedCycle->name,
                'description' => $selectedCycle->description,
                'sprint_goal' => $selectedCycle->sprint_goal,
                'status' => $selectedCycle->status,
                'start_date' => $selectedCycle->start_date?->toDateString(),
                'end_date' => $selectedCycle->end_date?->toDateString(),
                'capacity_points' => (float) ($selectedCycle->capacity_points ?? 0),
            ],
            'available_cycles' => $availableCycles,
            'timeline' => $analytics['timeline'] ?? [
                'dates' => [],
                'work_items' => [],
                'estimates' => [],
            ],
            'today_index' => $analytics['today_index'] ?? 0,
            'today_date' => $analytics['today_date'] ?? now()->toDateString(),
            'chart_type' => $chartType,
            'filter_by' => $filterBy,
            'metrics' => [
                'scope' => $analytics['metrics']['scope'] ?? 0,
                'completed' => $analytics['metrics']['done'] ?? 0,
                'pending' => $analytics['metrics']['pending'] ?? 0,
                'started' => $analytics['metrics']['started'] ?? 0,
                'completion_rate' => $analytics['metrics']['completion_rate'] ?? 0,
                'total_points' => $analytics['metrics']['total_points'] ?? 0,
                'completed_points' => $analytics['metrics']['completed_points'] ?? 0,
            ],
            'impact' => $analytics['impact'] ?? null,
        ];
    }
}

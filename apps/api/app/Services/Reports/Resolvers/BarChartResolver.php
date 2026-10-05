<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\WorkItem;
use Illuminate\Support\Facades\DB;

class BarChartResolver
{
    /**
     * Resuelve los datos para el gráfico de barras.
     * Config: { dimension: 'state' | 'priority', metric: 'count' | 'points', project_ids: [] }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config     = $block->config ?? [];
        $dimension  = $config['dimension'] ?? 'state';
        $metric     = $config['metric'] ?? 'count';
        $projectIds = $config['project_ids'] ?? [];

        $query = WorkItem::query();
        if (!empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (!empty($scope['workspace_id'])) {
            $query->whereHas('project', fn ($q) => $q->where('workspace_id', $scope['workspace_id']));
        }

        if ($dimension === 'priority') {
            $priorityColors = [
                'URGENT' => '#ef4444',
                'HIGH'   => '#f97316',
                'MEDIUM' => '#eab308',
                'LOW'    => '#3b82f6',
                'NONE'   => '#9ca3af',
            ];

            $results = (clone $query)
                ->select('priority', DB::raw($metric === 'points' ? 'COALESCE(SUM(estimate_points), 0) as value' : 'COUNT(*) as value'))
                ->groupBy('priority')
                ->get();

            $data = [];
            foreach ($priorityColors as $priority => $color) {
                $item = $results->firstWhere('priority', $priority);
                $data[] = [
                    'name'  => $this->priorityLabel($priority),
                    'value' => $item ? (float)$item->value : 0,
                    'color' => $color,
                ];
            }
        } else {
            // Dimension: state
            $stateColors = [
                'BACKLOG'   => '#94a3b8',
                'UNSTARTED' => '#64748b',
                'STARTED'   => '#3b82f6',
                'COMPLETED' => '#10b981',
                'CANCELLED' => '#ef4444',
            ];

            $results = (clone $query)
                ->join('states', 'work_items.state_id', '=', 'states.id')
                ->select('states.name', 'states.group', DB::raw($metric === 'points' ? 'COALESCE(SUM(work_items.estimate_points), 0) as value' : 'COUNT(*) as value'))
                ->groupBy('states.name', 'states.group')
                ->get();

            $data = [];
            foreach ($results as $item) {
                $data[] = [
                    'name'  => $item->name,
                    'value' => (float)$item->value,
                    'color' => $stateColors[$item->group] ?? '#6366f1',
                ];
            }

            if (empty($data)) {
                $data = [
                    ['name' => 'Por Hacer', 'value' => 0, 'color' => '#64748b'],
                    ['name' => 'En Progreso', 'value' => 0, 'color' => '#3b82f6'],
                    ['name' => 'Completadas', 'value' => 0, 'color' => '#10b981'],
                ];
            }
        }

        return [
            'dimension' => $dimension,
            'metric'    => $metric,
            'data'      => $data,
            'total'     => array_sum(array_column($data, 'value')),
        ];
    }

    private function priorityLabel(string $priority): string
    {
        return match ($priority) {
            'URGENT' => 'Urgente',
            'HIGH'   => 'Alta',
            'MEDIUM' => 'Media',
            'LOW'    => 'Baja',
            'NONE'   => 'Sin Prioridad',
            default  => $priority,
        };
    }
}

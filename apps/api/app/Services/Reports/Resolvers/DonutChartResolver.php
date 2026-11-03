<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\WorkItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DonutChartResolver
{
    /**
     * Resuelve distribución porcentual para gráfico Donut.
     * Config: { dimension: 'state' | 'priority', project_ids: [] }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $dimension = $config['dimension'] ?? 'state';
        $projectIds = ! empty($config['project_ids']) ? (array) $config['project_ids'] : (! empty($config['project_id']) ? [$config['project_id']] : (! empty($scope['project_ids']) ? (array) $scope['project_ids'] : []));
        $cycleIds = ! empty($config['cycle_ids']) ? (array) $config['cycle_ids'] : (! empty($config['cycle_id']) ? [$config['cycle_id']] : (! empty($scope['cycle_ids']) ? (array) $scope['cycle_ids'] : []));
        $startDate = $config['start_date'] ?? $config['date_from'] ?? $scope['start_date'] ?? null;
        $endDate = $config['end_date'] ?? $config['date_to'] ?? $scope['end_date'] ?? null;

        $query = WorkItem::query();
        if (! empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (! empty($scope['workspace_id'])) {
            $query->whereHas('project', fn ($q) => $q->where('workspace_id', $scope['workspace_id']));
        }

        if (! empty($cycleIds)) {
            $query->whereHas('cycles', fn ($q) => $q->whereIn('cycles.id', $cycleIds));
        }

        if (! empty($startDate)) {
            $query->where('created_at', '>=', Carbon::parse($startDate)->startOfDay());
        }
        if (! empty($endDate)) {
            $query->where('created_at', '<=', Carbon::parse($endDate)->endOfDay());
        }

        $segments = [];

        if ($dimension === 'priority') {
            $priorityColors = [
                'URGENT' => '#ef4444',
                'HIGH' => '#f97316',
                'MEDIUM' => '#eab308',
                'LOW' => '#3b82f6',
                'NONE' => '#9ca3af',
            ];

            $results = (clone $query)
                ->select('priority', DB::raw('COUNT(*) as count'))
                ->groupBy('priority')
                ->get();

            $total = $results->sum('count');

            foreach ($priorityColors as $priority => $color) {
                $item = $results->firstWhere('priority', $priority);
                $count = $item ? (int) $item->count : 0;
                if ($count > 0 || $total === 0) {
                    $segments[] = [
                        'name' => $this->priorityLabel($priority),
                        'value' => $count,
                        'percentage' => $total > 0 ? round(($count / $total) * 100, 1) : 0,
                        'color' => $color,
                    ];
                }
            }
        } else {
            // Dimension: state
            $stateColors = [
                'BACKLOG' => '#94a3b8',
                'UNSTARTED' => '#64748b',
                'STARTED' => '#3b82f6',
                'COMPLETED' => '#10b981',
                'CANCELLED' => '#ef4444',
            ];

            $results = (clone $query)
                ->join('states', 'work_items.state_id', '=', 'states.id')
                ->select('states.name', 'states.group', DB::raw('COUNT(*) as count'))
                ->groupBy('states.name', 'states.group')
                ->get();

            $total = $results->sum('count');

            foreach ($results as $item) {
                $count = (int) $item->count;
                $segments[] = [
                    'name' => $item->name,
                    'value' => $count,
                    'percentage' => $total > 0 ? round(($count / $total) * 100, 1) : 0,
                    'color' => $stateColors[$item->group] ?? '#6366f1',
                ];
            }

            if (empty($segments)) {
                $segments = [
                    ['name' => 'Completadas', 'value' => 0, 'percentage' => 0, 'color' => '#10b981'],
                    ['name' => 'En Progreso', 'value' => 0, 'percentage' => 0, 'color' => '#3b82f6'],
                    ['name' => 'Por Hacer', 'value' => 0, 'percentage' => 0, 'color' => '#64748b'],
                ];
                $total = 0;
            }
        }

        return [
            'dimension' => $dimension,
            'segments' => $segments,
            'total' => $total,
        ];
    }

    private function priorityLabel(string $priority): string
    {
        return match ($priority) {
            'URGENT' => 'Urgente',
            'HIGH' => 'Alta',
            'MEDIUM' => 'Media',
            'LOW' => 'Baja',
            'NONE' => 'Sin Prioridad',
            default => $priority,
        };
    }
}

<?php

namespace App\Services\Reports\Resolvers;

use App\Models\Cycle;
use App\Models\ReportBlock;
use Carbon\Carbon;

class CyclesOverviewResolver
{
    /**
     * Resuelve el resumen de ciclos/sprints.
     * Config esperada: { project_ids: [], start_date: string, end_date: string, status: string, limit: int|null }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $projectIds = ! empty($config['project_ids']) ? (array) $config['project_ids'] : (! empty($config['project_id']) ? [$config['project_id']] : (! empty($scope['project_ids']) ? (array) $scope['project_ids'] : []));
        $startDate = $config['start_date'] ?? $config['date_from'] ?? $scope['start_date'] ?? null;
        $endDate = $config['end_date'] ?? $config['date_to'] ?? $scope['end_date'] ?? null;
        $status = $config['status'] ?? 'all';
        $limitRaw = $config['limit'] ?? null;
        $limit = ($limitRaw === 'all' || $limitRaw === 0 || $limitRaw === '0' || $limitRaw === null) ? null : max((int) $limitRaw, 1);

        $query = Cycle::query();

        if (! empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (! empty($scope['workspace_id'])) {
            $query->where('workspace_id', $scope['workspace_id']);
        }

        if ($status !== 'all') {
            $query->where('status', strtoupper($status));
        }

        if (! empty($startDate)) {
            $query->where('start_date', '>=', Carbon::parse($startDate)->startOfDay());
        }
        if (! empty($endDate)) {
            $query->where('end_date', '<=', Carbon::parse($endDate)->endOfDay());
        }

        $query->withCount([
            'workItems as total_items',
            'workItems as completed_items' => function ($q) {
                $q->whereNotNull('completed_at');
            },
        ])
            ->orderByRaw("CASE 
            WHEN status = 'CURRENT' THEN 1 
            WHEN status = 'UPCOMING' THEN 2 
            WHEN status = 'COMPLETED' THEN 3 
            ELSE 4 END")
            ->orderBy('start_date', 'desc');

        if ($limit !== null) {
            $query->take($limit);
        } else {
            $query->take(200);
        }

        $cycles = $query->get();

        $items = $cycles->map(function ($c) {
            $total = (int) $c->total_items;
            $completed = (int) $c->completed_items;
            $progress = $total > 0 ? round(($completed / $total) * 100, 1) : 0;

            return [
                'id' => (string) $c->id,
                'name' => $c->name,
                'status' => $c->status,
                'start_date' => $c->start_date?->toDateString(),
                'end_date' => $c->end_date?->toDateString(),
                'total_items' => $total,
                'completed_items' => $completed,
                'progress' => $progress,
            ];
        });

        return [
            'cycles' => $items->values()->toArray(),
            'total' => $cycles->count(),
            'status' => $status,
        ];
    }
}

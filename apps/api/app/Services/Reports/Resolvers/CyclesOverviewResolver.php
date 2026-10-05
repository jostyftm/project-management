<?php

namespace App\Services\Reports\Resolvers;

use App\Models\Cycle;
use App\Models\ReportBlock;

class CyclesOverviewResolver
{
    /**
     * Resuelve el resumen de ciclos/sprints.
     * Config esperada: { project_ids: [], status: string, limit: int }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config     = $block->config ?? [];
        $projectIds = $config['project_ids'] ?? [];
        $status     = $config['status'] ?? 'all';
        $limit      = min(max((int)($config['limit'] ?? 5), 1), 20);

        $query = Cycle::query();

        if (!empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (!empty($scope['workspace_id'])) {
            $query->where('workspace_id', $scope['workspace_id']);
        }

        if ($status !== 'all') {
            $query->where('status', strtoupper($status));
        }

        $cycles = $query->withCount([
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
        ->orderBy('start_date', 'desc')
        ->limit($limit)
        ->get();

        $items = $cycles->map(function ($c) {
            $total = (int)$c->total_items;
            $completed = (int)$c->completed_items;
            $progress = $total > 0 ? round(($completed / $total) * 100, 1) : 0;

            return [
                'id'              => (string)$c->id,
                'name'            => $c->name,
                'status'          => $c->status,
                'start_date'      => $c->start_date?->toDateString(),
                'end_date'        => $c->end_date?->toDateString(),
                'total_items'     => $total,
                'completed_items' => $completed,
                'progress'        => $progress,
            ];
        });

        return [
            'cycles' => $items->values()->toArray(),
            'total'  => $cycles->count(),
            'status' => $status,
        ];
    }
}

<?php

namespace App\Services\Reports\Resolvers;

use App\Models\Milestone;
use App\Models\ReportBlock;

class MilestonesProgressResolver
{
    /**
     * Resuelve el progreso de hitos/milestones.
     * Config esperada: { project_ids: [], status: string, limit: int }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config     = $block->config ?? [];
        $projectIds = $config['project_ids'] ?? [];
        $status     = $config['status'] ?? 'all';
        $limit      = min(max((int)($config['limit'] ?? 5), 1), 20);

        $query = Milestone::query();

        if (!empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (!empty($scope['workspace_id'])) {
            $query->where('workspace_id', $scope['workspace_id']);
        }

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $milestones = $query->withCount([
            'workItems as total_items',
            'workItems as completed_items' => function ($q) {
                $q->whereNotNull('completed_at');
            },
        ])
        ->orderBy('target_date', 'asc')
        ->limit($limit)
        ->get();

        $items = $milestones->map(function ($m) {
            $total = (int)$m->total_items;
            $completed = (int)$m->completed_items;
            $progress = $total > 0 ? round(($completed / $total) * 100, 1) : ($m->status === 'COMPLETED' ? 100 : 0);
            $isOverdue = $m->target_date && $m->target_date->isPast() && $m->status !== 'COMPLETED';

            return [
                'id'              => (string)$m->id,
                'title'           => $m->title,
                'description'     => $m->description,
                'status'          => $m->status,
                'target_date'     => $m->target_date?->toDateString(),
                'completed_at'    => $m->completed_at?->toISOString(),
                'is_overdue'      => $isOverdue,
                'total_items'     => $total,
                'completed_items' => $completed,
                'progress'        => $progress,
            ];
        });

        return [
            'milestones' => $items->values()->toArray(),
            'total'      => $milestones->count(),
            'status'     => $status,
        ];
    }
}

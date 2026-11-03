<?php

namespace App\Services\Reports\Resolvers;

use App\Models\Milestone;
use App\Models\ReportBlock;
use Carbon\Carbon;

class MilestonesProgressResolver
{
    /**
     * Resuelve el progreso de hitos/milestones.
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

        $query = Milestone::query();

        if (! empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (! empty($scope['workspace_id'])) {
            $query->where('workspace_id', $scope['workspace_id']);
        }

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if (! empty($startDate)) {
            $query->where('target_date', '>=', Carbon::parse($startDate)->startOfDay());
        }
        if (! empty($endDate)) {
            $query->where('target_date', '<=', Carbon::parse($endDate)->endOfDay());
        }

        $query->withCount([
            'workItems as total_items',
            'workItems as completed_items' => function ($q) {
                $q->whereNotNull('completed_at');
            },
        ])
            ->orderBy('target_date', 'asc');

        if ($limit !== null) {
            $query->take($limit);
        } else {
            $query->take(200);
        }

        $milestones = $query->get();

        $items = $milestones->map(function ($m) {
            $total = (int) $m->total_items;
            $completed = (int) $m->completed_items;
            $progress = $total > 0 ? round(($completed / $total) * 100, 1) : ($m->status === 'COMPLETED' ? 100 : 0);
            $isOverdue = $m->target_date && $m->target_date->isPast() && $m->status !== 'COMPLETED';

            return [
                'id' => (string) $m->id,
                'title' => $m->title,
                'description' => $m->description,
                'status' => $m->status,
                'target_date' => $m->target_date?->toDateString(),
                'completed_at' => $m->completed_at?->toISOString(),
                'is_overdue' => $isOverdue,
                'total_items' => $total,
                'completed_items' => $completed,
                'progress' => $progress,
            ];
        });

        return [
            'milestones' => $items->values()->toArray(),
            'total' => $milestones->count(),
            'status' => $status,
        ];
    }
}

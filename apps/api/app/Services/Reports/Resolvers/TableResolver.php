<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\WorkItem;
use Carbon\Carbon;

class TableResolver
{
    /**
     * Resuelve una tabla configurable de work items.
     * Config: { project_ids: [], cycle_ids: [], start_date: string, end_date: string, limit: int|null, sort_by: string, sort_dir: string, columns: [] }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $projectIds = ! empty($config['project_ids']) ? (array) $config['project_ids'] : (! empty($config['project_id']) ? [$config['project_id']] : (! empty($scope['project_ids']) ? (array) $scope['project_ids'] : []));
        $cycleIds = ! empty($config['cycle_ids']) ? (array) $config['cycle_ids'] : (! empty($config['cycle_id']) ? [$config['cycle_id']] : (! empty($scope['cycle_ids']) ? (array) $scope['cycle_ids'] : []));
        $startDate = $config['start_date'] ?? $config['date_from'] ?? $scope['start_date'] ?? null;
        $endDate = $config['end_date'] ?? $config['date_to'] ?? $scope['end_date'] ?? null;

        $limitRaw = $config['limit'] ?? null;
        $limit = ($limitRaw === 'all' || $limitRaw === 0 || $limitRaw === '0' || $limitRaw === null) ? null : max((int) $limitRaw, 1);
        $sortBy = in_array($config['sort_by'] ?? '', ['created_at', 'updated_at', 'target_date', 'priority'])
            ? $config['sort_by']
            : 'created_at';
        $sortDir = strtolower($config['sort_dir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        $query = WorkItem::query()->with(['project', 'state', 'lead']);

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

        $query->orderBy($sortBy, $sortDir);
        if ($limit !== null) {
            $query->take($limit);
        } else {
            $query->take(500);
        }

        $items = $query->get();

        $rows = $items->map(function ($item) {
            return [
                'id' => $item->id,
                'identifier' => ($item->project?->identifier ?? 'ITEM').'-'.$item->sequence_id,
                'title' => $item->title,
                'state' => [
                    'name' => $item->state?->name ?? 'Sin estado',
                    'group' => $item->state?->group ?? 'UNSTARTED',
                ],
                'priority' => $item->priority,
                'lead' => $item->lead ? [
                    'name' => $item->lead->name,
                    'avatar' => $item->lead->avatar ?? null,
                ] : null,
                'target_date' => $item->target_date?->toDateString(),
                'created_at' => $item->created_at?->toDateString(),
            ];
        })->values()->all();

        return [
            'rows' => $rows,
            'total' => count($rows),
            'columns' => $config['columns'] ?? ['identifier', 'title', 'state', 'priority', 'lead', 'target_date'],
        ];
    }
}

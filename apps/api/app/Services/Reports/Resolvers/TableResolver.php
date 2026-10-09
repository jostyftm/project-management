<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\WorkItem;

class TableResolver
{
    /**
     * Resuelve una tabla configurable de work items.
     * Config: { project_ids: [], limit: int, sort_by: string, sort_dir: string, columns: [] }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $projectIds = $config['project_ids'] ?? [];
        $limit = min(max((int) ($config['limit'] ?? 10), 1), 50);
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

        $items = $query->orderBy($sortBy, $sortDir)->take($limit)->get();

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

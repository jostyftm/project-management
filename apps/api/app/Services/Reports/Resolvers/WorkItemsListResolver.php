<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\WorkItem;

class WorkItemsListResolver
{
    /**
     * Resuelve una lista compacta destacada según filtros rápidos.
     * Config: { filter: 'urgent' | 'overdue' | 'unassigned' | 'recent', project_ids: [], limit: int }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config     = $block->config ?? [];
        $filter     = $config['filter'] ?? 'urgent';
        $projectIds = $config['project_ids'] ?? [];
        $limit      = min(max((int)($config['limit'] ?? 5), 1), 20);

        $query = WorkItem::query()->with(['project', 'state', 'lead']);

        if (!empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (!empty($scope['workspace_id'])) {
            $query->whereHas('project', fn ($q) => $q->where('workspace_id', $scope['workspace_id']));
        }

        switch ($filter) {
            case 'overdue':
                $query->where('target_date', '<', now())
                    ->whereNull('completed_at')
                    ->orderBy('target_date', 'asc');
                break;
            case 'unassigned':
                $query->whereNull('lead_id')
                    ->whereNull('completed_at')
                    ->latest();
                break;
            case 'recent':
                $query->latest();
                break;
            case 'urgent':
            default:
                $query->whereIn('priority', ['URGENT', 'HIGH'])
                    ->whereNull('completed_at')
                    ->latest();
                break;
        }

        $items = $query->take($limit)->get();

        $list = $items->map(function ($item) {
            return [
                'id'          => $item->id,
                'identifier'  => ($item->project?->identifier ?? 'ITEM') . '-' . $item->sequence_id,
                'title'       => $item->title,
                'priority'    => $item->priority,
                'state'       => [
                    'name'  => $item->state?->name ?? 'Sin estado',
                    'group' => $item->state?->group ?? 'UNSTARTED',
                ],
                'lead'        => $item->lead ? [
                    'name'   => $item->lead->name,
                    'avatar' => $item->lead->avatar ?? null,
                ] : null,
                'target_date' => $item->target_date?->toDateString(),
            ];
        })->values()->all();

        return [
            'filter' => $filter,
            'items'  => $list,
            'count'  => count($list),
        ];
    }
}

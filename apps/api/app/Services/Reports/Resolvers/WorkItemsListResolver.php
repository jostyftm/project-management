<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\WorkItem;
use Carbon\Carbon;

class WorkItemsListResolver
{
    /**
     * Resuelve una lista compacta destacada según filtros rápidos.
     * Config: { filter: 'urgent' | 'overdue' | 'unassigned' | 'recent', project_ids: [], cycle_ids: [], start_date: string, end_date: string, limit: int|null }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $filter = $config['filter'] ?? 'urgent';
        $projectIds = ! empty($config['project_ids']) ? (array) $config['project_ids'] : (! empty($config['project_id']) ? [$config['project_id']] : (! empty($scope['project_ids']) ? (array) $scope['project_ids'] : []));
        $cycleIds = ! empty($config['cycle_ids']) ? (array) $config['cycle_ids'] : (! empty($config['cycle_id']) ? [$config['cycle_id']] : (! empty($scope['cycle_ids']) ? (array) $scope['cycle_ids'] : []));
        $startDate = $config['start_date'] ?? $config['date_from'] ?? $scope['start_date'] ?? null;
        $endDate = $config['end_date'] ?? $config['date_to'] ?? $scope['end_date'] ?? null;

        $limitRaw = $config['limit'] ?? null;
        $limit = ($limitRaw === 'all' || $limitRaw === 0 || $limitRaw === '0' || $limitRaw === null) ? null : max((int) $limitRaw, 1);

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

        if ($limit !== null) {
            $query->take($limit);
        } else {
            $query->take(500);
        }

        $items = $query->get();

        $list = $items->map(function ($item) {
            return [
                'id' => $item->id,
                'identifier' => ($item->project?->identifier ?? 'ITEM').'-'.$item->sequence_id,
                'title' => $item->title,
                'priority' => $item->priority,
                'state' => [
                    'name' => $item->state?->name ?? 'Sin estado',
                    'group' => $item->state?->group ?? 'UNSTARTED',
                ],
                'lead' => $item->lead ? [
                    'name' => $item->lead->name,
                    'avatar' => $item->lead->avatar ?? null,
                ] : null,
                'target_date' => $item->target_date?->toDateString(),
            ];
        })->values()->all();

        return [
            'filter' => $filter,
            'items' => $list,
            'count' => count($list),
        ];
    }
}

<?php

namespace App\Services\Reports\Resolvers;

use App\Models\Activity;
use App\Models\ReportBlock;
use Carbon\Carbon;

class RecentActivityResolver
{
    /**
     * Resuelve el feed de actividad reciente.
     * Config: { project_ids: [], start_date: string, end_date: string, limit: int|null }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $projectIds = ! empty($config['project_ids']) ? (array) $config['project_ids'] : (! empty($config['project_id']) ? [$config['project_id']] : (! empty($scope['project_ids']) ? (array) $scope['project_ids'] : []));
        $startDate = $config['start_date'] ?? $config['date_from'] ?? $scope['start_date'] ?? null;
        $endDate = $config['end_date'] ?? $config['date_to'] ?? $scope['end_date'] ?? null;

        $limitRaw = $config['limit'] ?? null;
        $limit = ($limitRaw === 'all' || $limitRaw === 0 || $limitRaw === '0' || $limitRaw === null) ? null : max((int) $limitRaw, 1);

        $query = Activity::query()->with('actor');

        if (! empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (! empty($scope['workspace_id'])) {
            $query->where('workspace_id', $scope['workspace_id']);
        }

        if (! empty($startDate)) {
            $query->where('created_at', '>=', Carbon::parse($startDate)->startOfDay());
        }
        if (! empty($endDate)) {
            $query->where('created_at', '<=', Carbon::parse($endDate)->endOfDay());
        }

        $query->latest();
        if ($limit !== null) {
            $query->take($limit);
        } else {
            $query->take(300);
        }

        $activities = $query->get();

        $items = $activities->map(function ($a) {
            return [
                'id' => (string) $a->id,
                'actor_id' => (string) $a->actor_id,
                'actor_name' => $a->actor?->name ?? 'Usuario',
                'actor_email' => $a->actor?->email,
                'action' => $a->action,
                'entity_type' => $a->entity_type,
                'entity_id' => (string) $a->entity_id,
                'created_at' => $a->created_at?->toISOString(),
            ];
        });

        return [
            'activities' => $items->values()->toArray(),
            'total' => $activities->count(),
        ];
    }
}

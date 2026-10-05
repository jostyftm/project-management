<?php

namespace App\Services\Reports\Resolvers;

use App\Models\Activity;
use App\Models\ReportBlock;

class RecentActivityResolver
{
    /**
     * Resuelve el feed de actividad reciente.
     * Config: { project_ids: [], limit: int }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config     = $block->config ?? [];
        $projectIds = $config['project_ids'] ?? [];
        $limit      = min(max((int)($config['limit'] ?? 10), 1), 30);

        $query = Activity::query()->with('actor');

        if (!empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (!empty($scope['workspace_id'])) {
            $query->where('workspace_id', $scope['workspace_id']);
        }

        $activities = $query->latest()->limit($limit)->get();

        $items = $activities->map(function ($a) {
            return [
                'id'          => (string)$a->id,
                'actor_id'    => (string)$a->actor_id,
                'actor_name'  => $a->actor?->name ?? 'Usuario',
                'actor_email' => $a->actor?->email,
                'action'      => $a->action,
                'entity_type' => $a->entity_type,
                'entity_id'   => (string)$a->entity_id,
                'created_at'  => $a->created_at?->toISOString(),
            ];
        });

        return [
            'activities' => $items->values()->toArray(),
            'total'      => $activities->count(),
        ];
    }
}

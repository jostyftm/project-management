<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\User;

class TeamWorkloadResolver
{
    /**
     * Resuelve la carga de trabajo por miembro del equipo.
     * Config: { project_ids: [], limit: int }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config     = $block->config ?? [];
        $projectIds = $config['project_ids'] ?? [];
        $limit      = min(max((int)($config['limit'] ?? 10), 1), 30);

        $query = User::query()
            ->whereHas('assignedWorkItems', function ($q) use ($projectIds, $scope) {
                if (!empty($projectIds)) {
                    $q->whereIn('project_id', $projectIds);
                } elseif (!empty($scope['workspace_id'])) {
                    $q->where('workspace_id', $scope['workspace_id']);
                }
            })
            ->withCount([
                'assignedWorkItems as total_assigned' => function ($q) use ($projectIds, $scope) {
                    if (!empty($projectIds)) {
                        $q->whereIn('project_id', $projectIds);
                    } elseif (!empty($scope['workspace_id'])) {
                        $q->where('workspace_id', $scope['workspace_id']);
                    }
                },
                'assignedWorkItems as active_items' => function ($q) use ($projectIds, $scope) {
                    $q->whereNull('completed_at');
                    if (!empty($projectIds)) {
                        $q->whereIn('project_id', $projectIds);
                    } elseif (!empty($scope['workspace_id'])) {
                        $q->where('workspace_id', $scope['workspace_id']);
                    }
                },
                'assignedWorkItems as completed_items' => function ($q) use ($projectIds, $scope) {
                    $q->whereNotNull('completed_at');
                    if (!empty($projectIds)) {
                        $q->whereIn('project_id', $projectIds);
                    } elseif (!empty($scope['workspace_id'])) {
                        $q->where('workspace_id', $scope['workspace_id']);
                    }
                },
            ])
            ->orderByDesc('active_items')
            ->limit($limit);

        $users = $query->get();

        $members = $users->map(function ($u) {
            $active = (int)$u->active_items;
            $completed = (int)$u->completed_items;
            $total = (int)$u->total_assigned;

            // Nivel de intensidad de carga
            $loadStatus = match (true) {
                $active >= 10 => 'overloaded',
                $active >= 5  => 'heavy',
                $active >= 2  => 'balanced',
                default       => 'light',
            };

            return [
                'id'              => (string)$u->id,
                'name'            => $u->name,
                'email'           => $u->email,
                'total_assigned'  => $total,
                'active_items'    => $active,
                'completed_items' => $completed,
                'load_status'     => $loadStatus,
            ];
        });

        return [
            'members'        => $members->values()->toArray(),
            'total_members'  => $members->count(),
            'total_assigned' => $members->sum('total_assigned'),
            'total_active'   => $members->sum('active_items'),
        ];
    }
}

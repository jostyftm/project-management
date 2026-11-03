<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\User;
use Carbon\Carbon;

class TeamWorkloadResolver
{
    /**
     * Resuelve la carga de trabajo por miembro del equipo.
     * Config: { project_ids: [], limit: int }
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

        $applyWorkItemFilter = function ($q) use ($projectIds, $cycleIds, $startDate, $endDate, $scope) {
            if (! empty($projectIds)) {
                $q->whereIn('project_id', $projectIds);
            } elseif (! empty($scope['workspace_id'])) {
                $q->where('workspace_id', $scope['workspace_id']);
            }
            if (! empty($cycleIds)) {
                $q->whereHas('cycles', fn ($cq) => $cq->whereIn('cycles.id', $cycleIds));
            }
            if (! empty($startDate)) {
                $q->where('created_at', '>=', Carbon::parse($startDate)->startOfDay());
            }
            if (! empty($endDate)) {
                $q->where('created_at', '<=', Carbon::parse($endDate)->endOfDay());
            }
        };

        $query = User::query()
            ->whereHas('assignedWorkItems', $applyWorkItemFilter)
            ->withCount([
                'assignedWorkItems as total_assigned' => $applyWorkItemFilter,
                'assignedWorkItems as active_items' => function ($q) use ($applyWorkItemFilter) {
                    $q->whereNull('completed_at');
                    $applyWorkItemFilter($q);
                },
                'assignedWorkItems as completed_items' => function ($q) use ($applyWorkItemFilter) {
                    $q->whereNotNull('completed_at');
                    $applyWorkItemFilter($q);
                },
            ])
            ->orderByDesc('active_items');

        if ($limit !== null) {
            $query->take($limit);
        } else {
            $query->take(200);
        }

        $users = $query->get();

        $members = $users->map(function ($u) {
            $active = (int) $u->active_items;
            $completed = (int) $u->completed_items;
            $total = (int) $u->total_assigned;

            // Nivel de intensidad de carga
            $loadStatus = match (true) {
                $active >= 10 => 'overloaded',
                $active >= 5 => 'heavy',
                $active >= 2 => 'balanced',
                default => 'light',
            };

            return [
                'id' => (string) $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'total_assigned' => $total,
                'active_items' => $active,
                'completed_items' => $completed,
                'load_status' => $loadStatus,
            ];
        });

        return [
            'members' => $members->values()->toArray(),
            'total_members' => $members->count(),
            'total_assigned' => $members->sum('total_assigned'),
            'total_active' => $members->sum('active_items'),
        ];
    }
}

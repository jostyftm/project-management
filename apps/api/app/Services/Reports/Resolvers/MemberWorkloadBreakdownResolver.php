<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\User;
use App\Models\WorkItem;
use Carbon\Carbon;

class MemberWorkloadBreakdownResolver
{
    /**
     * Resuelve tareas, historias de usuario, puntos y estados de cada miembro.
     * Config: { project_ids: [], cycle_ids: [], start_date: string, end_date: string, limit: int }
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

        // Obtener usuarios involucrados en los proyectos o asignados a ítems
        $usersQuery = User::query();

        if (! empty($projectIds)) {
            $usersQuery->where(function ($q) use ($projectIds) {
                $q->whereHas('projects', fn ($pm) => $pm->whereIn('projects.id', $projectIds))
                    ->orWhereHas('assignedWorkItems', fn ($wi) => $wi->whereIn('project_id', $projectIds));
            });
        } elseif (! empty($scope['workspace_id'])) {
            $usersQuery->where(function ($q) use ($scope) {
                $q->whereHas('workspaces', fn ($w) => $w->where('workspaces.id', $scope['workspace_id']))
                    ->orWhereHas('assignedWorkItems', fn ($wi) => $wi->where('workspace_id', $scope['workspace_id']));
            });
        }

        if ($limit !== null) {
            $usersQuery->take($limit);
        } else {
            $usersQuery->take(200);
        }

        $users = $usersQuery->get();

        $membersData = [];
        $totalWorkspacePoints = 0.0;
        $totalWorkspaceTasks = 0;
        $totalWorkspaceStories = 0;

        foreach ($users as $user) {
            $itemsQuery = WorkItem::query()
                ->with(['state', 'type'])
                ->whereHas('assignees', fn ($q) => $q->where('users.id', $user->id));

            if (! empty($projectIds)) {
                $itemsQuery->whereIn('project_id', $projectIds);
            } elseif (! empty($scope['workspace_id'])) {
                $itemsQuery->where('workspace_id', $scope['workspace_id']);
            }

            if (! empty($cycleIds)) {
                $itemsQuery->whereHas('cycles', fn ($q) => $q->whereIn('cycles.id', $cycleIds));
            }

            if (! empty($startDate)) {
                $itemsQuery->where('created_at', '>=', Carbon::parse($startDate)->startOfDay());
            }

            if (! empty($endDate)) {
                $itemsQuery->where('created_at', '<=', Carbon::parse($endDate)->endOfDay());
            }

            $items = $itemsQuery->get();

            // Desglose por tipos: Tareas vs Historias de Usuario
            $tasksCount = 0;
            $userStoriesCount = 0;
            $bugsCount = 0;
            $otherCount = 0;
            $totalPoints = 0.0;
            $completedPoints = 0.0;

            // Desglose por estados
            $statesMap = [];

            foreach ($items as $item) {
                $points = (float) ($item->estimate_points ?? 0);
                $totalPoints += $points;

                $typeName = strtolower($item->type?->name ?? 'tarea');
                if (str_contains($typeName, 'historia') || str_contains($typeName, 'story') || str_contains($typeName, 'feature') || str_contains($typeName, 'característica')) {
                    $userStoriesCount++;
                } elseif (str_contains($typeName, 'bug') || str_contains($typeName, 'defecto') || str_contains($typeName, 'error')) {
                    $bugsCount++;
                } else {
                    $tasksCount++;
                }

                $stateName = $item->state?->name ?? 'Sin estado';
                $stateGroup = strtoupper($item->state?->group ?? 'UNSTARTED');
                $stateColor = $item->state?->color ?? '#94a3b8';
                $stateId = (string) ($item->state_id ?? 'none');

                if ($stateGroup === 'COMPLETED') {
                    $completedPoints += $points;
                }

                if (! isset($statesMap[$stateId])) {
                    $statesMap[$stateId] = [
                        'id' => $stateId,
                        'name' => $stateName,
                        'group' => $stateGroup,
                        'color' => $stateColor,
                        'count' => 0,
                        'points' => 0.0,
                    ];
                }

                $statesMap[$stateId]['count']++;
                $statesMap[$stateId]['points'] += $points;
            }

            // Sólo incluir miembros con ítems o si pertenecen al proyecto
            if ($items->count() > 0 || ! empty($projectIds)) {
                $totalWorkspacePoints += $totalPoints;
                $totalWorkspaceTasks += $tasksCount;
                $totalWorkspaceStories += $userStoriesCount;

                $membersData[] = [
                    'id' => (string) $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar ?? null,
                    'tasks_count' => $tasksCount,
                    'user_stories_count' => $userStoriesCount,
                    'bugs_count' => $bugsCount,
                    'total_items' => $items->count(),
                    'total_points' => round($totalPoints, 1),
                    'completed_points' => round($completedPoints, 1),
                    'completion_percentage' => $totalPoints > 0 ? round(($completedPoints / $totalPoints) * 100, 1) : ($items->count() > 0 ? round(($items->where('state.group', 'COMPLETED')->count() / $items->count()) * 100, 1) : 0),
                    'states_breakdown' => array_values($statesMap),
                ];
            }
        }

        // Ordenar por puntos totales descendente
        usort($membersData, fn ($a, $b) => $b['total_points'] <=> $a['total_points']);

        return [
            'members' => $membersData,
            'summary' => [
                'total_members' => count($membersData),
                'total_points' => round($totalWorkspacePoints, 1),
                'total_tasks' => $totalWorkspaceTasks,
                'total_user_stories' => $totalWorkspaceStories,
            ],
            'filters_applied' => [
                'project_ids' => $projectIds,
                'cycle_ids' => $cycleIds,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ];
    }
}

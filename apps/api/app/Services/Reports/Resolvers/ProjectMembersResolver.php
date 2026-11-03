<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ProjectMember;
use App\Models\ReportBlock;

class ProjectMembersResolver
{
    /**
     * Resuelve los integrantes de los proyectos seleccionados.
     * Config esperada: { project_ids: [], role: string, limit: int }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $projectIds = ! empty($config['project_ids']) ? (array) $config['project_ids'] : (! empty($scope['project_ids']) ? (array) $scope['project_ids'] : []);
        $roleFilter = $config['role'] ?? 'all';
        $limit = min(max((int) ($config['limit'] ?? 50), 1), 100);

        $query = ProjectMember::query()
            ->with(['user', 'project'])
            ->whereNotNull('user_id');

        if (! empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (! empty($scope['workspace_id'])) {
            $query->whereHas('project', fn ($q) => $q->where('workspace_id', $scope['workspace_id']));
        }

        if ($roleFilter !== 'all') {
            $query->where('role', strtoupper($roleFilter));
        }

        $records = $query->take($limit)->get();

        // Agrupar por usuario para consolidar roles y proyectos si pertenece a más de uno
        $membersGrouped = $records->groupBy('user_id');

        $members = $membersGrouped->map(function ($items) use ($projectIds, $scope) {
            $first = $items->first();
            $user = $first->user;

            if (! $user) {
                return null;
            }

            // Sumar capacidad y proyectos
            $projectsList = $items->map(fn ($pm) => [
                'id' => (string) $pm->project_id,
                'name' => $pm->project?->name ?? 'Proyecto',
                'identifier' => $pm->project?->identifier ?? '',
                'role' => $pm->role,
                'capacity_points' => (float) ($pm->capacity_points ?? 0),
            ])->values()->all();

            $totalCapacity = $items->sum('capacity_points');
            $primaryRole = $items->pluck('role')->first() ?? 'MEMBER';

            // Contar ítems asignados aplicando filtros
            $workItemsQuery = $user->assignedWorkItems();
            if (! empty($projectIds)) {
                $workItemsQuery->whereIn('project_id', $projectIds);
            } elseif (! empty($scope['workspace_id'])) {
                $workItemsQuery->where('workspace_id', $scope['workspace_id']);
            }

            $totalAssigned = (clone $workItemsQuery)->count();
            $activeAssigned = (clone $workItemsQuery)->whereNull('completed_at')->count();
            $completedAssigned = (clone $workItemsQuery)->whereNotNull('completed_at')->count();

            return [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar ?? null,
                'role' => $primaryRole,
                'capacity_points' => (float) $totalCapacity,
                'projects' => $projectsList,
                'total_assigned' => $totalAssigned,
                'active_assigned' => $activeAssigned,
                'completed_assigned' => $completedAssigned,
            ];
        })->filter()->values();

        $roleCounts = $records->groupBy('role')->map(fn ($r) => $r->count())->all();

        return [
            'members' => $members->all(),
            'total_members' => $members->count(),
            'total_capacity_points' => (float) $records->sum('capacity_points'),
            'role_distribution' => $roleCounts,
        ];
    }
}

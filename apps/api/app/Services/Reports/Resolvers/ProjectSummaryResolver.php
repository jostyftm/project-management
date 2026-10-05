<?php

namespace App\Services\Reports\Resolvers;

use App\Models\Project;
use App\Models\ReportBlock;

class ProjectSummaryResolver
{
    /**
     * Resuelve el resumen de salud y progreso para un proyecto específico.
     * Config: { project_id?: number }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config    = $block->config ?? [];
        $projectId = $config['project_id'] ?? null;

        $project = null;
        if ($projectId) {
            $project = Project::with(['members', 'cycles'])->find($projectId);
        }

        if (!$project && !empty($scope['workspace_id'])) {
            $project = Project::where('workspace_id', $scope['workspace_id'])
                ->with(['members', 'cycles'])
                ->first();
        }

        if (!$project) {
            return [
                'has_project' => false,
                'message'     => 'No hay proyectos disponibles en este workspace',
            ];
        }

        $totalItems = $project->workItems()->count();
        $completedItems = $project->workItems()
            ->whereNotNull('completed_at')
            ->count();

        $progressPercent = $totalItems > 0 ? round(($completedItems / $totalItems) * 100, 1) : 0;

        // Salud calculada
        $overdueItems = $project->workItems()
            ->where('target_date', '<', now())
            ->whereNull('completed_at')
            ->count();

        $health = 'on_track';
        if ($overdueItems > 5) {
            $health = 'at_risk';
        } elseif ($overdueItems > 0) {
            $health = 'needs_attention';
        }

        return [
            'has_project'      => true,
            'id'               => $project->id,
            'name'             => $project->name,
            'identifier'       => $project->identifier,
            'description'      => $project->description,
            'total_items'      => $totalItems,
            'completed_items'  => $completedItems,
            'progress_percent' => $progressPercent,
            'overdue_items'    => $overdueItems,
            'health'           => $health,
            'cycles_count'     => $project->cycles->count(),
            'members_count'    => $project->members->count(),
            'members'          => $project->members->take(5)->map(fn ($u) => [
                'id'     => $u->id,
                'name'   => $u->name,
                'avatar' => $u->avatar ?? null,
            ])->values()->all(),
            'start_date'       => $project->start_date?->toDateString(),
            'target_date'      => $project->target_date?->toDateString(),
        ];
    }
}

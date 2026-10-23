<?php

namespace App\Services\Agile;

use App\Models\Cycle;
use App\Models\WorkItem;
use App\Services\Analytics\ProjectKpiService;

class SprintPlanningService
{
    public function __construct(
        protected WorkItemReadinessEvaluator $readinessEvaluator,
        protected ProjectKpiService $kpiService
    ) {}

    /**
     * Calcula la planificación integral de un ciclo / sprint.
     */
    public function getPlanning(Cycle $cycle): array
    {
        $project = $cycle->project()->with(['members', 'projectMembers'])->first();
        $cycle->loadMissing([
            'workItems.state',
            'workItems.type',
            'workItems.assignees',
            'workItems.dodItems',
            'workItems.outwardRelations.target.state',
            'workItems.inwardRelations.source.state',
        ]);

        // 1. Velocidad histórica (últimos 3 ciclos cerrados)
        $velocityTrend = $this->kpiService->getVelocityTrend($project, 6);
        $completedCyclesTrend = array_values(array_filter($velocityTrend, fn ($c) => ($c['status'] ?? '') === 'COMPLETED' || ! empty($c['completed_points'])));
        $last3Completed = array_slice($completedCyclesTrend, -3);

        $historicalVelocity = 0.0;
        if (! empty($last3Completed)) {
            $sumPoints = array_sum(array_column($last3Completed, 'completed_points'));
            $historicalVelocity = round($sumPoints / count($last3Completed), 1);
        }

        // 2. Capacidad sumada de miembros
        $projectMembers = $project->projectMembers()->with('user')->get();
        $membersSumCapacity = (float) $projectMembers->sum('capacity_points');

        // 3. Capacidad efectiva del ciclo
        $effectiveCapacity = (float) ($cycle->capacity_points
            ?? ($historicalVelocity > 0 ? $historicalVelocity : ($membersSumCapacity > 0 ? $membersSumCapacity : 40.0)));

        // 4. Puntos actualmente comprometidos en el ciclo
        $cycleItems = $cycle->workItems;
        $committedPoints = (float) $cycleItems->sum(fn ($i) => (float) ($i->estimate_points ?? 0));
        $completedPoints = (float) $cycleItems
            ->filter(fn ($i) => in_array(strtoupper($i->state?->group ?? ''), ['COMPLETED', 'CANCELLED']))
            ->sum(fn ($i) => (float) ($i->estimate_points ?? 0));

        // 5. Porcentaje de utilización y estado de riesgo
        $utilizationPct = $effectiveCapacity > 0
            ? round(($committedPoints / $effectiveCapacity) * 100, 1)
            : 0;

        $healthStatus = match (true) {
            $utilizationPct > 110 => 'overcommitted',
            $utilizationPct >= 90 => 'at_risk',
            default => 'healthy',
        };

        // 6. Desglose de carga por miembro
        $membersBreakdown = [];
        foreach ($projectMembers as $pm) {
            if (! $pm->user) {
                continue;
            }
            $userId = (int) $pm->user_id;
            $memberAssignedItems = $cycleItems->filter(function ($item) use ($userId) {
                return ((int) $item->lead_id === $userId)
                    || $item->assignees->contains('id', $userId);
            });

            $memberAssignedPoints = (float) $memberAssignedItems->sum(fn ($i) => (float) ($i->estimate_points ?? 0));
            $memberCapacity = $pm->capacity_points ? (float) $pm->capacity_points : ($effectiveCapacity > 0 && $projectMembers->count() > 0 ? round($effectiveCapacity / $projectMembers->count(), 1) : 10.0);
            $memberLoadPct = $memberCapacity > 0 ? round(($memberAssignedPoints / $memberCapacity) * 100, 1) : 0;

            $memberStatus = match (true) {
                $memberLoadPct > 100 => 'overloaded',
                $memberLoadPct >= 80 => 'high',
                default => 'optimal',
            };

            $membersBreakdown[] = [
                'user' => [
                    'id' => (string) $pm->user->id,
                    'name' => $pm->user->name,
                    'email' => $pm->user->email,
                ],
                'role' => $pm->role,
                'capacity_points' => $memberCapacity,
                'assigned_points' => $memberAssignedPoints,
                'assigned_items_count' => $memberAssignedItems->count(),
                'load_percentage' => $memberLoadPct,
                'status' => $memberStatus,
            ];
        }

        // 7. Evaluar Definition of Ready en ítems del ciclo
        $notReadyItems = [];
        foreach ($cycleItems as $item) {
            $readiness = $this->readinessEvaluator->evaluate($item);
            if (! $readiness['is_ready']) {
                $notReadyItems[] = [
                    'id' => (string) $item->id,
                    'identifier' => "{$project->identifier}-{$item->sequence_id}",
                    'title' => $item->title,
                    'missing' => $readiness['missing'],
                ];
            }
        }

        // 8. Sugerencias del Backlog para llenar la capacidad restante
        $remainingCapacity = max(0, $effectiveCapacity - $committedPoints);
        $suggestions = [];

        $backlogCandidates = WorkItem::where('project_id', $project->id)
            ->whereDoesntHave('cycles')
            ->whereHas('state', fn ($q) => $q->whereNotIn('group', ['COMPLETED', 'CANCELLED']))
            ->with(['state', 'type', 'assignees', 'dodItems', 'outwardRelations.target.state', 'inwardRelations.source.state'])
            ->orderBy('sort_order', 'asc')
            ->get();

        if ($remainingCapacity > 0) {
            $accumulated = 0.0;
            foreach ($backlogCandidates as $candidate) {
                $readiness = $this->readinessEvaluator->evaluate($candidate);
                if (! $readiness['is_ready']) {
                    continue;
                }

                $pts = (float) ($candidate->estimate_points ?? 0);
                if ($pts > 0 && ($accumulated + $pts) <= ($remainingCapacity + 3)) { // margen de 3 puntos
                    $suggestions[] = [
                        'id' => (string) $candidate->id,
                        'identifier' => "{$project->identifier}-{$candidate->sequence_id}",
                        'title' => $candidate->title,
                        'estimate_points' => $pts,
                        'priority' => $candidate->priority,
                    ];
                    $accumulated += $pts;
                }
            }
        }

        $mapItemWithDor = function ($item) use ($project) {
            return [
                'id' => (string) $item->id,
                'sequence_id' => $item->sequence_id,
                'identifier' => "{$project->identifier}-{$item->sequence_id}",
                'title' => $item->title,
                'estimate_points' => $item->estimate_points,
                'priority' => $item->priority,
                'sort_order' => (float) ($item->sort_order ?? 0),
                'is_blocked' => (bool) $item->is_blocked,
                'blocked_reason' => $item->blocked_reason,
                'state' => $item->state ? [
                    'id' => (string) $item->state->id,
                    'name' => $item->state->name,
                    'color' => $item->state->color,
                    'group' => $item->state->group,
                ] : null,
                'assignees' => $item->assignees->map(fn ($u) => ['id' => (string) $u->id, 'name' => $u->name]),
                'dor' => $this->readinessEvaluator->evaluate($item),
            ];
        };

        return [
            'cycle' => [
                'id' => (string) $cycle->id,
                'name' => $cycle->name,
                'sprint_goal' => $cycle->sprint_goal,
                'capacity_points' => $cycle->capacity_points ? (float) $cycle->capacity_points : null,
                'start_date' => $cycle->start_date?->format('Y-m-d'),
                'end_date' => $cycle->end_date?->format('Y-m-d'),
                'status' => $cycle->status,
            ],
            'cycle_id' => (string) $cycle->id,
            'cycle_name' => $cycle->name,
            'sprint_goal' => $cycle->sprint_goal,
            'velocity' => [
                'rolling_average' => $historicalVelocity,
                'recent_cycles_count' => count($last3Completed),
                'history' => $last3Completed,
            ],
            'capacity' => [
                'effective_capacity' => $effectiveCapacity,
                'effective' => $effectiveCapacity,
                'committed' => $committedPoints,
                'completed' => $completedPoints,
                'remaining' => max(0, $effectiveCapacity - $committedPoints),
                'utilization_pct' => $utilizationPct,
                'members_sum_capacity' => $membersSumCapacity,
                'status' => $healthStatus,
            ],
            'members' => $membersBreakdown,
            'not_ready_items' => $notReadyItems,
            'suggestions' => $suggestions,
            'backlog' => $backlogCandidates->map($mapItemWithDor)->values(),
            'sprint_items' => $cycleItems->map($mapItemWithDor)->values(),
        ];
    }
}

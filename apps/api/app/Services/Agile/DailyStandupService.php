<?php

namespace App\Services\Agile;

use App\Models\Activity;
use App\Models\Cycle;
use App\Models\Project;
use App\Models\WorkItem;
use Carbon\Carbon;

class DailyStandupService
{
    public function __construct(
        protected WorkItemReadinessEvaluator $readinessEvaluator
    ) {}

    /**
     * Genera el resumen diario de Standup para todos los miembros de un proyecto.
     */
    public function generate(Project $project, ?Carbon $date = null, ?int $cycleId = null): array
    {
        $targetDate = $date ?: Carbon::now();
        $targetDateStart = $targetDate->copy()->startOfDay();

        // Ventana hábil: si es lunes (1), la ventana de "ayer" va desde el viernes anterior a las 00:00
        $yesterdayStart = $targetDate->dayOfWeek === Carbon::MONDAY
            ? $targetDate->copy()->subDays(3)->startOfDay()
            : $targetDate->copy()->subDay()->startOfDay();

        // Ciclo activo por defecto si no se pasa explícitamente
        $activeCycle = $cycleId
            ? Cycle::find($cycleId)
            : Cycle::where('project_id', $project->id)->where('status', 'CURRENT')->first();

        $projectMembers = $project->projectMembers()->with('user')->get();
        $agingThreshold = (int) ($project->aging_threshold_days ?: 5);

        // Work items relevantes del proyecto
        $workItemsQuery = WorkItem::where('project_id', $project->id)
            ->with(['state', 'type', 'assignees', 'lead', 'githubCommits', 'outwardRelations.target.state', 'inwardRelations.source.state']);

        if ($activeCycle) {
            $workItemsQuery->whereHas('cycles', fn ($q) => $q->where('cycles.id', $activeCycle->id));
        }

        $allProjectItems = $workItemsQuery->get();

        // Actividades en la ventana reciente
        $recentActivities = Activity::where('project_id', $project->id)
            ->where('entity_type', 'WORK_ITEM')
            ->where('created_at', '>=', $yesterdayStart)
            ->get();

        $membersStandup = [];
        $totalBlockers = 0;
        $agingCount = 0;

        foreach ($projectMembers as $pm) {
            if (! $pm->user) {
                continue;
            }
            $userId = (int) $pm->user_id;

            // 1. AYER: Tareas completadas o movidas por/para el miembro en la ventana
            $userActivities = $recentActivities->filter(fn ($a) => (int) $a->actor_id === $userId);
            $touchedItemIds = $userActivities->pluck('entity_id')->unique()->all();

            $yesterdayItems = $allProjectItems->filter(function ($item) use ($userId, $touchedItemIds, $yesterdayStart) {
                $isAssigned = ((int) $item->lead_id === $userId) || $item->assignees->contains('id', $userId);
                $wasCompletedRecently = $item->completed_at && Carbon::parse($item->completed_at)->gte($yesterdayStart);
                $wasTouchedByMe = in_array($item->id, $touchedItemIds);

                return ($isAssigned && $wasCompletedRecently) || $wasTouchedByMe;
            })->map(fn ($item) => [
                'id' => (string) $item->id,
                'identifier' => "{$project->identifier}-{$item->sequence_id}",
                'title' => $item->title,
                'state' => $item->state ? [
                    'name' => $item->state->name,
                    'color' => $item->state->color,
                    'group' => $item->state->group,
                ] : null,
                'completed_at' => $item->completed_at?->toISOString(),
            ])->values();

            // Commits recientes vinculados a este usuario
            $userCommits = [];
            foreach ($allProjectItems as $item) {
                if ($item->relationLoaded('githubCommits')) {
                    foreach ($item->githubCommits as $c) {
                        if ($c->created_at && Carbon::parse($c->created_at)->gte($yesterdayStart)) {
                            $userCommits[] = [
                                'message' => $c->commit_message,
                                'hash' => substr($c->commit_hash, 0, 7),
                                'item_identifier' => "{$project->identifier}-{$item->sequence_id}",
                            ];
                        }
                    }
                }
            }

            // 2. HOY: Tareas asignadas en progreso (STARTED) o listas por iniciar (UNSTARTED en sprint)
            $todayItems = $allProjectItems->filter(function ($item) use ($userId) {
                $isAssigned = ((int) $item->lead_id === $userId) || $item->assignees->contains('id', $userId);
                if (! $isAssigned) {
                    return false;
                }

                $group = strtoupper($item->state?->group ?? '');

                return $group === 'STARTED' || ($group === 'UNSTARTED' && ! $item->is_blocked);
            })->map(function ($item) use ($agingThreshold, &$agingCount) {
                $stateChangedAt = $item->state_changed_at ? Carbon::parse($item->state_changed_at) : ($item->updated_at ? Carbon::parse($item->updated_at) : null);
                $daysInState = $stateChangedAt ? (int) $stateChangedAt->diffInDays(Carbon::now()) : 0;
                $isAging = $daysInState >= $agingThreshold && strtoupper($item->state?->group ?? '') === 'STARTED';
                if ($isAging) {
                    $agingCount++;
                }

                $projIdent = $project->identifier ?? 'PLN';

                return [
                    'id' => (string) $item->id,
                    'identifier' => "{$projIdent}-{$item->sequence_id}",
                    'title' => $item->title,
                    'priority' => $item->priority,
                    'state' => $item->state ? [
                        'name' => $item->state->name,
                        'color' => $item->state->color,
                        'group' => $item->state->group,
                    ] : null,
                    'days_in_state' => $daysInState,
                    'is_aging' => $isAging,
                ];
            })->values();

            // 3. IMPEDIMENTOS: Tareas asignadas con bloqueo explícito o dependencias abiertas
            $blockerItems = $allProjectItems->filter(function ($item) use ($userId) {
                $isAssigned = ((int) $item->lead_id === $userId) || $item->assignees->contains('id', $userId);
                if (! $isAssigned) {
                    return false;
                }

                $group = strtoupper($item->state?->group ?? '');
                if (in_array($group, ['COMPLETED', 'CANCELLED'])) {
                    return false;
                }

                return $item->is_blocked || $this->readinessEvaluator->getOpenBlockers($item)->isNotEmpty();
            })->map(function ($item) use (&$totalBlockers) {
                $totalBlockers++;
                $openBlockers = $this->readinessEvaluator->getOpenBlockers($item);
                $blockerReasons = [];
                if ($item->is_blocked && $item->blocked_reason) {
                    $blockerReasons[] = $item->blocked_reason;
                }
                if ($openBlockers->isNotEmpty()) {
                    $blockerReasons[] = 'Esperando a: '.$openBlockers->map(fn ($b) => "#{$b->sequence_id} {$b->title}")->implode(', ');
                }

                $projIdent = $project->identifier ?? 'PLN';

                return [
                    'id' => (string) $item->id,
                    'identifier' => "{$projIdent}-{$item->sequence_id}",
                    'title' => $item->title,
                    'is_blocked' => (bool) $item->is_blocked,
                    'blocked_reason' => implode(' | ', $blockerReasons) ?: 'Bloqueo reportado',
                    'blocked_at' => $item->blocked_at?->toISOString(),
                ];
            })->values();

            $membersStandup[] = [
                'user' => [
                    'id' => (string) $pm->user->id,
                    'name' => $pm->user->name,
                    'email' => $pm->user->email,
                ],
                'role' => $pm->role,
                'yesterday' => [
                    'items' => $yesterdayItems,
                    'commits' => array_slice($userCommits, 0, 5),
                ],
                'today' => [
                    'items' => $todayItems,
                ],
                'blockers' => [
                    'items' => $blockerItems,
                ],
            ];
        }

        return [
            'date' => $targetDate->format('Y-m-d'),
            'project' => [
                'id' => (string) $project->id,
                'name' => $project->name,
                'identifier' => $project->identifier,
            ],
            'cycle' => $activeCycle ? [
                'id' => (string) $activeCycle->id,
                'name' => $activeCycle->name,
                'sprint_goal' => $activeCycle->sprint_goal,
            ] : null,
            'summary' => [
                'total_members' => count($membersStandup),
                'total_blockers' => $totalBlockers,
                'aging_items_count' => $agingCount,
            ],
            'members' => $membersStandup,
        ];
    }
}

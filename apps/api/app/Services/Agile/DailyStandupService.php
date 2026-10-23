<?php

namespace App\Services\Agile;

use App\Models\Activity;
use App\Models\Comment;
use App\Models\Cycle;
use App\Models\Project;
use App\Models\WorkItem;
use App\Models\WorkItemDeliverable;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Str;

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

    /**
     * Genera el listado consolidado de Daily Standup por rango de fechas,
     * calculando los días efectivamente trabajados por cada miembro a partir de avances reales
     * (cambios de estado, entregables, commits y evidencias con caption válido).
     */
    public function generateRange(
        Project $project,
        ?Carbon $startDate = null,
        ?Carbon $endDate = null,
        ?int $cycleId = null,
        ?int $memberId = null
    ): array {
        $end = $endDate ? $endDate->copy()->endOfDay() : Carbon::now()->endOfDay();
        $start = $startDate ? $startDate->copy()->startOfDay() : $end->copy()->subDays(13)->startOfDay();

        // Máximo 90 días por desempeño
        if ($start->diffInDays($end) > 90) {
            $start = $end->copy()->subDays(90)->startOfDay();
        }

        $activeCycle = $cycleId
            ? Cycle::find($cycleId)
            : Cycle::where('project_id', $project->id)->where('status', 'CURRENT')->first();

        // Miembros del proyecto
        $membersQuery = $project->projectMembers()->with('user');
        if ($memberId) {
            $membersQuery->where('user_id', $memberId);
        }
        $projectMembers = $membersQuery->get();

        // 1. Actividades del proyecto en el rango
        $activities = Activity::where('project_id', $project->id)
            ->whereBetween('created_at', [$start, $end])
            ->get();

        // 2. Comentarios del proyecto en el rango
        $comments = Comment::where('project_id', $project->id)
            ->whereBetween('created_at', [$start, $end])
            ->get();

        // 3. Entregables del proyecto en el rango
        $deliverables = WorkItemDeliverable::where('project_id', $project->id)
            ->whereBetween('created_at', [$start, $end])
            ->get();

        // 4. Work items del proyecto
        $itemsQuery = WorkItem::where('project_id', $project->id)
            ->with(['state', 'type', 'assignees', 'lead', 'githubCommits']);
        if ($activeCycle) {
            $itemsQuery->whereHas('cycles', fn ($q) => $q->where('cycles.id', $activeCycle->id));
        }
        $allProjectItems = $itemsQuery->get();

        // Lista de días en el período
        $period = CarbonPeriod::create($start->copy()->startOfDay(), $end->copy()->startOfDay());
        $allDates = [];
        $workingDatesInPeriod = [];
        foreach ($period as $dt) {
            $dateStr = $dt->format('Y-m-d');
            $allDates[] = $dateStr;
            if (! in_array($dt->dayOfWeek, [Carbon::SATURDAY, Carbon::SUNDAY])) {
                $workingDatesInPeriod[] = $dateStr;
            }
        }

        $membersReport = [];
        $daysAggregated = [];
        foreach ($allDates as $dStr) {
            $daysAggregated[$dStr] = [
                'date' => $dStr,
                'active_members_count' => 0,
                'members' => [],
            ];
        }

        $totalTasksCompletedGlobal = 0;
        $totalActivitiesGlobal = $activities->count();
        $totalCommitsGlobal = 0;
        $totalEvidencesGlobal = 0;

        foreach ($projectMembers as $pm) {
            if (! $pm->user) {
                continue;
            }
            $userId = (int) $pm->user_id;

            $workedDates = [];
            $dailyBreakdown = [];
            $memberTasksCompleted = 0;
            $memberActivitiesCount = 0;
            $memberCommitsCount = 0;
            $memberEvidencesCount = 0;

            foreach ($allDates as $dStr) {
                $dayCarbon = Carbon::parse($dStr);
                $dayStart = $dayCarbon->copy()->startOfDay();
                $dayEnd = $dayCarbon->copy()->endOfDay();

                // Actividades del usuario en este día
                $userDayActivities = $activities->filter(function ($a) use ($userId, $dayStart, $dayEnd) {
                    return (int) $a->actor_id === $userId && $a->created_at->between($dayStart, $dayEnd);
                });

                // Comentarios del usuario en este día
                $userDayComments = $comments->filter(function ($c) use ($userId, $dayStart, $dayEnd) {
                    return (int) $c->user_id === $userId && $c->created_at->between($dayStart, $dayEnd);
                });

                // Entregables subidos en este día
                $userDayDeliverables = $deliverables->filter(function ($del) use ($userId, $dayStart, $dayEnd) {
                    return (int) $del->created_by === $userId && $del->created_at->between($dayStart, $dayEnd);
                });

                // Tareas completadas por el usuario en este día
                $userDayCompletedItems = $allProjectItems->filter(function ($item) use ($userId, $dayStart, $dayEnd) {
                    $isAssigned = ((int) $item->lead_id === $userId) || $item->assignees->contains('id', $userId);

                    return $isAssigned && $item->completed_at && Carbon::parse($item->completed_at)->between($dayStart, $dayEnd);
                });

                // Commits en este día
                $userDayCommits = [];
                foreach ($allProjectItems as $item) {
                    if ($item->relationLoaded('githubCommits')) {
                        foreach ($item->githubCommits as $c) {
                            $cDate = $c->committed_at ?: $c->created_at;
                            if ($cDate && Carbon::parse($cDate)->between($dayStart, $dayEnd)) {
                                $isAssigned = ((int) $item->lead_id === $userId) || $item->assignees->contains('id', $userId);
                                if ($isAssigned) {
                                    $userDayCommits[] = [
                                        'message' => $c->message ?? $c->commit_message ?? 'Commit',
                                        'hash' => substr($c->sha ?? $c->commit_hash ?? '', 0, 7),
                                        'item_identifier' => "{$project->identifier}-{$item->sequence_id}",
                                    ];
                                }
                            }
                        }
                    }
                }

                // Avances de tareas reales (cambios a In Progress, In Review, Done)
                $realAdvanceActivities = $userDayActivities->filter(function ($a) {
                    return in_array($a->action, ['STATE_CHANGED', 'WORK_LOG', 'EVIDENCE_SUBMITTED', 'DELIVERABLE_ADDED', 'DOD_COMPLETED']);
                });

                // Evidencias válidas (comentarios tipo WORK_LOG o imágenes con caption descriptivo)
                $evidenceComments = $userDayComments->filter(fn ($c) => (bool) $c->is_work_log);

                // ¿Tiene avance real hoy?
                $hasRealAdvance = $realAdvanceActivities->isNotEmpty()
                    || $userDayCompletedItems->isNotEmpty()
                    || ! empty($userDayCommits)
                    || $userDayDeliverables->isNotEmpty()
                    || $evidenceComments->isNotEmpty();

                if ($hasRealAdvance) {
                    $workedDates[] = $dStr;
                    $daysAggregated[$dStr]['active_members_count']++;
                    $daysAggregated[$dStr]['members'][] = [
                        'user' => [
                            'id' => (string) $pm->user->id,
                            'name' => $pm->user->name,
                            'email' => $pm->user->email,
                        ],
                        'role' => $pm->role,
                        'completed_count' => $userDayCompletedItems->count(),
                        'commits_count' => count($userDayCommits),
                        'deliverables_count' => $userDayDeliverables->count(),
                        'evidences_count' => $evidenceComments->count(),
                    ];
                }

                $memberTasksCompleted += $userDayCompletedItems->count();
                $memberActivitiesCount += $userDayActivities->count();
                $memberCommitsCount += count($userDayCommits);
                $memberEvidencesCount += $evidenceComments->count() + $userDayDeliverables->count();

                $dailyBreakdown[] = [
                    'date' => $dStr,
                    'has_worked' => $hasRealAdvance,
                    'completed_items' => $userDayCompletedItems->map(fn ($it) => [
                        'id' => (string) $it->id,
                        'identifier' => "{$project->identifier}-{$it->sequence_id}",
                        'title' => $it->title,
                    ])->values()->all(),
                    'evidences' => $evidenceComments->map(fn ($c) => [
                        'id' => (string) $c->id,
                        'preview' => Str::limit($c->content, 60),
                        'attachments' => $c->attachments ?? [],
                    ])->values()->all(),
                    'deliverables' => $userDayDeliverables->map(fn ($d) => [
                        'id' => (string) $d->id,
                        'title' => $d->title,
                        'type' => $d->type,
                    ])->values()->all(),
                    'commits' => $userDayCommits,
                    'advances_count' => $realAdvanceActivities->count(),
                ];
            }

            $totalTasksCompletedGlobal += $memberTasksCompleted;
            $totalCommitsGlobal += $memberCommitsCount;
            $totalEvidencesGlobal += $memberEvidencesCount;

            $totalWorkingDays = count($workingDatesInPeriod) ?: 1;
            $workingDaysWorked = count(array_intersect($workedDates, $workingDatesInPeriod));
            $participationRate = round(($workingDaysWorked / $totalWorkingDays) * 100);

            $membersReport[] = [
                'user' => [
                    'id' => (string) $pm->user->id,
                    'name' => $pm->user->name,
                    'email' => $pm->user->email,
                ],
                'role' => $pm->role,
                'days_worked_count' => count($workedDates),
                'working_days_worked' => $workingDaysWorked,
                'participation_rate' => $participationRate,
                'worked_dates' => $workedDates,
                'tasks_completed_count' => $memberTasksCompleted,
                'activities_count' => $memberActivitiesCount,
                'commits_count' => $memberCommitsCount,
                'evidences_count' => $memberEvidencesCount,
                'daily_breakdown' => $dailyBreakdown,
            ];
        }

        // Ordenar días agrupados de más reciente a más antiguo
        krsort($daysAggregated);

        return [
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $end->format('Y-m-d'),
            'total_calendar_days' => count($allDates),
            'total_working_days' => count($workingDatesInPeriod),
            'project' => [
                'id' => (string) $project->id,
                'name' => $project->name,
                'identifier' => $project->identifier,
                'require_evidence_to_complete' => (bool) ($project->require_evidence_to_complete ?? false),
            ],
            'cycle' => $activeCycle ? [
                'id' => (string) $activeCycle->id,
                'name' => $activeCycle->name,
                'sprint_goal' => $activeCycle->sprint_goal,
            ] : null,
            'summary' => [
                'total_members' => count($membersReport),
                'active_members' => count(array_filter($membersReport, fn ($m) => $m['days_worked_count'] > 0)),
                'total_tasks_completed' => $totalTasksCompletedGlobal,
                'total_activities' => $totalActivitiesGlobal,
                'total_commits' => $totalCommitsGlobal,
                'total_evidences' => $totalEvidencesGlobal,
            ],
            'members' => $membersReport,
            'days' => array_values($daysAggregated),
        ];
    }
}

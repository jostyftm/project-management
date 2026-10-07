<?php

namespace App\Services\Analytics;

use App\Models\Cycle;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkItem;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ProjectKpiService
{
    /**
     * Resumen ejecutivo y KPIs globales del proyecto.
     */
    public function getProjectOverview(Project $project, array $filters = []): array
    {
        $cacheKey = "project_{$project->id}_kpi_overview_" . md5(serialize($filters));

        return Cache::remember($cacheKey, 300, function () use ($project, $filters) {
            $period = $filters['period'] ?? '30d'; // 14d, 30d, 90d, all
            $cycleId = $filters['cycle_id'] ?? null;

            $query = WorkItem::query()
                ->where('project_id', $project->id)
                ->where('is_draft', false);

            if ($cycleId) {
                $query->whereHas('cycles', function ($q) use ($cycleId) {
                    $q->where('cycles.id', $cycleId);
                });
            }

            $items = $query->with(['state', 'type', 'assignees'])->get();
            $total = $items->count();

            $completedItems = $items->filter(fn ($item) => $item->state?->group === 'COMPLETED');
            $inProgressItems = $items->filter(fn ($item) => $item->state?->group === 'STARTED');
            $unstartedItems = $items->filter(fn ($item) => in_array($item->state?->group, ['UNSTARTED', 'BACKLOG']));
            $cancelledItems = $items->filter(fn ($item) => $item->state?->group === 'CANCELLED');

            // Filtrar completados por ventana de tiempo para métricas de throughput/velocity
            $startDatePeriod = $this->calculatePeriodStartDate($period);
            $recentCompleted = $completedItems->filter(function ($item) use ($startDatePeriod) {
                if (!$startDatePeriod) return true;
                $date = $item->completed_at ?? $item->updated_at;
                return $date && Carbon::parse($date)->gte($startDatePeriod);
            });

            // Velocity en 14 días
            $twoWeeksAgo = Carbon::now()->subDays(14);
            $completed14d = $completedItems->filter(function ($item) use ($twoWeeksAgo) {
                $date = $item->completed_at ?? $item->updated_at;
                return $date && Carbon::parse($date)->gte($twoWeeksAgo);
            });
            $velocityPoints14d = (float) $completed14d->sum('estimate_points');

            // Cycle Time (Tiempo de Ciclo): completed_at - (start_date ó created_at)
            $cycleTimes = [];
            $leadTimes = [];
            foreach ($recentCompleted as $item) {
                if ($item->completed_at) {
                    $end = Carbon::parse($item->completed_at);
                    $start = $item->start_date ? Carbon::parse($item->start_date) : Carbon::parse($item->created_at);
                    $created = Carbon::parse($item->created_at);

                    $diffCycle = max(0.1, round(abs($end->diffInHours($start)) / 24, 1));
                    $diffLead = max(0.1, round(abs($end->diffInHours($created)) / 24, 1));

                    $cycleTimes[] = $diffCycle;
                    $leadTimes[] = $diffLead;
                }
            }

            $avgCycleTime = !empty($cycleTimes) ? round(array_sum($cycleTimes) / count($cycleTimes), 1) : 0;
            $p85CycleTime = !empty($cycleTimes) ? $this->calculatePercentile($cycleTimes, 85) : 0;
            $avgLeadTime = !empty($leadTimes) ? round(array_sum($leadTimes) / count($leadTimes), 1) : 0;

            // On-Time Delivery Rate (OTD)
            $itemsWithTargetDate = $recentCompleted->filter(fn ($item) => !empty($item->target_date));
            $onTimeCount = $itemsWithTargetDate->filter(function ($item) {
                if (!$item->completed_at || !$item->target_date) return false;
                $completed = Carbon::parse($item->completed_at)->startOfDay();
                $target = Carbon::parse($item->target_date)->startOfDay();
                return $completed->lte($target);
            })->count();

            $onTimeDeliveryRate = $itemsWithTargetDate->count() > 0
                ? round(($onTimeCount / $itemsWithTargetDate->count()) * 100, 1)
                : 100.0;

            // Items activos vencidos (Overdue)
            $now = Carbon::now()->startOfDay();
            $overdueActive = $items->filter(function ($item) use ($now) {
                if (in_array($item->state?->group, ['COMPLETED', 'CANCELLED'])) return false;
                if (!$item->target_date) return false;
                return Carbon::parse($item->target_date)->startOfDay()->lt($now);
            })->count();

            // Calidad: Defect Density / Tasa de Bugs
            $bugItems = $items->filter(function ($item) {
                $typeName = strtolower($item->type?->name ?? '');
                return str_contains($typeName, 'bug') || str_contains($typeName, 'defect') || str_contains($typeName, 'error');
            });
            $defectDensityRate = $total > 0 ? round(($bugItems->count() / $total) * 100, 1) : 0;
            $resolvedBugs = $bugItems->filter(fn ($i) => $i->state?->group === 'COMPLETED')->count();

            // Total story points
            $totalEstimatePoints = (float) $items->sum('estimate_points');
            $completedEstimatePoints = (float) $completedItems->sum('estimate_points');

            // Determinar salud del proyecto (On track, At risk, Off track)
            $healthStatus = 'on_track';
            $overdueRatio = $total > 0 ? ($overdueActive / $total) : 0;
            if ($overdueRatio > 0.20 || $onTimeDeliveryRate < 70) {
                $healthStatus = 'off_track';
            } elseif ($overdueRatio > 0.08 || $onTimeDeliveryRate < 85) {
                $healthStatus = 'at_risk';
            }

            return [
                'summary' => [
                    'total_items' => $total,
                    'completed_items' => $completedItems->count(),
                    'in_progress_wip' => $inProgressItems->count(),
                    'unstarted_items' => $unstartedItems->count(),
                    'cancelled_items' => $cancelledItems->count(),
                    'completion_percentage' => $total > 0 ? round(($completedItems->count() / $total) * 100, 1) : 0,
                    'total_estimate_points' => $totalEstimatePoints,
                    'completed_estimate_points' => $completedEstimatePoints,
                    'health_status' => $healthStatus,
                ],
                'speed_and_throughput' => [
                    'velocity_14d_items' => $completed14d->count(),
                    'velocity_14d_points' => $velocityPoints14d,
                    'throughput_period_items' => $recentCompleted->count(),
                    'throughput_period_points' => (float) $recentCompleted->sum('estimate_points'),
                    'avg_cycle_time_days' => $avgCycleTime,
                    'p85_cycle_time_days' => $p85CycleTime,
                    'avg_lead_time_days' => $avgLeadTime,
                ],
                'delivery_and_quality' => [
                    'on_time_delivery_rate' => $onTimeDeliveryRate,
                    'items_with_target_date' => $itemsWithTargetDate->count(),
                    'items_completed_on_time' => $onTimeCount,
                    'overdue_active_items' => $overdueActive,
                    'defect_density_rate' => $defectDensityRate,
                    'total_bugs' => $bugItems->count(),
                    'resolved_bugs' => $resolvedBugs,
                ],
            ];
        });
    }

    /**
     * Historial de velocidad (Velocity) a lo largo de los ciclos (Sprints).
     */
    public function getVelocityTrend(Project $project, int $limitCycles = 6): array
    {
        $cacheKey = "project_{$project->id}_velocity_trend_{$limitCycles}";

        return Cache::remember($cacheKey, 300, function () use ($project, $limitCycles) {
            $cycles = Cycle::query()
                ->where('project_id', $project->id)
                ->whereIn('status', ['COMPLETED', 'CURRENT'])
                ->orderBy('start_date')
                ->limit($limitCycles)
                ->with(['workItems.state'])
                ->get();

            $trend = [];
            foreach ($cycles as $cycle) {
                $items = $cycle->workItems;
                $totalPoints = (float) $items->sum('estimate_points');
                $totalCount = $items->count();

                $completed = $items->filter(fn ($i) => $i->state?->group === 'COMPLETED');
                $completedPoints = (float) $completed->sum('estimate_points');
                $completedCount = $completed->count();

                $trend[] = [
                    'cycle_id' => $cycle->id,
                    'cycle_name' => $cycle->name,
                    'status' => $cycle->status,
                    'start_date' => $cycle->start_date?->format('Y-m-d'),
                    'end_date' => $cycle->end_date?->format('Y-m-d'),
                    'committed_points' => $totalPoints,
                    'completed_points' => $completedPoints,
                    'committed_count' => $totalCount,
                    'completed_count' => $completedCount,
                    'completion_rate_points' => $totalPoints > 0 ? round(($completedPoints / $totalPoints) * 100, 1) : 0,
                ];
            }

            return $trend;
        });
    }

    /**
     * Distribución de tiempos de ciclo (Cycle Time Distribution) y percentiles.
     */
    public function getCycleTimeStats(Project $project, array $filters = []): array
    {
        $cacheKey = "project_{$project->id}_cycle_time_stats_" . md5(serialize($filters));

        return Cache::remember($cacheKey, 300, function () use ($project, $filters) {
            $period = $filters['period'] ?? '90d';
            $startDate = $this->calculatePeriodStartDate($period);

            $query = WorkItem::query()
                ->where('project_id', $project->id)
                ->whereNotNull('completed_at')
                ->whereHas('state', fn ($q) => $q->where('group', 'COMPLETED'));

            if ($startDate) {
                $query->where('completed_at', '>=', $startDate);
            }

            $items = $query->with(['state', 'type', 'assignees'])->get();

            $samples = [];
            $durations = [];
            $buckets = [
                '1-2d' => 0,
                '3-5d' => 0,
                '6-10d' => 0,
                '11-15d' => 0,
                '16d+' => 0,
            ];

            foreach ($items as $item) {
                $end = Carbon::parse($item->completed_at);
                $start = $item->start_date ? Carbon::parse($item->start_date) : Carbon::parse($item->created_at);
                $days = max(0.1, round(abs($end->diffInHours($start)) / 24, 1));

                $durations[] = $days;

                if ($days <= 2) {
                    $buckets['1-2d']++;
                } elseif ($days <= 5) {
                    $buckets['3-5d']++;
                } elseif ($days <= 10) {
                    $buckets['6-10d']++;
                } elseif ($days <= 15) {
                    $buckets['11-15d']++;
                } else {
                    $buckets['16d+']++;
                }

                $samples[] = [
                    'id' => $item->id,
                    'sequence_id' => $item->sequence_id,
                    'title' => $item->title,
                    'priority' => $item->priority,
                    'type' => $item->type?->name ?? 'Task',
                    'estimate_points' => $item->estimate_points,
                    'days' => $days,
                    'completed_at' => Carbon::parse($item->completed_at)->format('Y-m-d'),
                ];
            }

            sort($durations);

            return [
                'percentiles' => [
                    'p50' => $this->calculatePercentile($durations, 50),
                    'p85' => $this->calculatePercentile($durations, 85),
                    'p95' => $this->calculatePercentile($durations, 95),
                    'average' => !empty($durations) ? round(array_sum($durations) / count($durations), 1) : 0,
                    'total_completed_analyzed' => count($durations),
                ],
                'histogram_buckets' => [
                    ['range' => '1 - 2 días', 'count' => $buckets['1-2d']],
                    ['range' => '3 - 5 días', 'count' => $buckets['3-5d']],
                    ['range' => '6 - 10 días', 'count' => $buckets['6-10d']],
                    ['range' => '11 - 15 días', 'count' => $buckets['11-15d']],
                    ['range' => '16+ días', 'count' => $buckets['16d+']],
                ],
                'scatter_samples' => array_slice($samples, 0, 50), // Top 50 recientes
            ];
        });
    }

    /**
     * Matriz comparativa de desempeño individual de miembros del proyecto.
     */
    public function getTeamPerformanceMatrix(Project $project, array $filters = []): array
    {
        $cacheKey = "project_{$project->id}_team_perf_matrix_" . md5(serialize($filters));

        return Cache::remember($cacheKey, 300, function () use ($project, $filters) {
            $period = $filters['period'] ?? '30d';
            $startDate = $this->calculatePeriodStartDate($period);

            // Obtener todos los miembros del proyecto
            $members = $project->members()->withPivot('role')->get();

            // Cargar todos los work items del proyecto con relaciones
            $workItems = WorkItem::query()
                ->where('project_id', $project->id)
                ->where('is_draft', false)
                ->with(['state', 'type', 'assignees'])
                ->get();

            $now = Carbon::now()->startOfDay();

            $results = [];
            foreach ($members as $member) {
                // Filtrar items asignados a este miembro
                $assignedItems = $workItems->filter(function ($item) use ($member) {
                    return $item->assignees->contains('id', $member->id);
                });

                $totalAssigned = $assignedItems->count();
                $wipActive = $assignedItems->filter(fn ($i) => $i->state?->group === 'STARTED')->count();
                $openCount = $assignedItems->filter(fn ($i) => !in_array($i->state?->group, ['COMPLETED', 'CANCELLED']))->count();

                // Completados en el periodo
                $completedInPeriod = $assignedItems->filter(function ($item) use ($startDate) {
                    if ($item->state?->group !== 'COMPLETED') return false;
                    if (!$startDate) return true;
                    $date = $item->completed_at ?? $item->updated_at;
                    return $date && Carbon::parse($date)->gte($startDate);
                });

                // Cycle Time del miembro
                $cycleTimes = [];
                foreach ($completedInPeriod as $item) {
                    if ($item->completed_at) {
                        $end = Carbon::parse($item->completed_at);
                        $start = $item->start_date ? Carbon::parse($item->start_date) : Carbon::parse($item->created_at);
                        $cycleTimes[] = max(0.1, round(abs($end->diffInHours($start)) / 24, 1));
                    }
                }
                $avgCycleTime = !empty($cycleTimes) ? round(array_sum($cycleTimes) / count($cycleTimes), 1) : 0;

                // Tasa a tiempo individual (OTD)
                $itemsWithTarget = $completedInPeriod->filter(fn ($i) => !empty($i->target_date));
                $onTimeCount = $itemsWithTarget->filter(function ($i) {
                    if (!$i->completed_at || !$i->target_date) return false;
                    return Carbon::parse($i->completed_at)->startOfDay()->lte(Carbon::parse($i->target_date)->startOfDay());
                })->count();

                $otdRate = $itemsWithTarget->count() > 0
                    ? round(($onTimeCount / $itemsWithTarget->count()) * 100, 1)
                    : 100.0;

                // Tareas vencidas activas asignadas
                $overdueAssigned = $assignedItems->filter(function ($item) use ($now) {
                    if (in_array($item->state?->group, ['COMPLETED', 'CANCELLED'])) return false;
                    if (!$item->target_date) return false;
                    return Carbon::parse($item->target_date)->startOfDay()->lt($now);
                })->count();

                // Bugs resueltos por este miembro
                $bugsResolved = $completedInPeriod->filter(function ($item) {
                    $name = strtolower($item->type?->name ?? '');
                    return str_contains($name, 'bug') || str_contains($name, 'defect');
                })->count();

                // Estado de saturación (WIP individual)
                $loadStatus = match (true) {
                    $wipActive >= 7 => 'overloaded',
                    $wipActive >= 4 => 'heavy',
                    default         => 'optimal',
                };

                $results[] = [
                    'user_id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'avatar_url' => $member->avatar_url,
                    'project_role' => $member->pivot?->role ?? 'MEMBER',
                    'assigned_total' => $totalAssigned,
                    'active_wip' => $wipActive,
                    'open_items_count' => $openCount,
                    'completed_in_period' => $completedInPeriod->count(),
                    'completed_points' => (float) $completedInPeriod->sum('estimate_points'),
                    'avg_cycle_time_days' => $avgCycleTime,
                    'on_time_delivery_rate' => $otdRate,
                    'overdue_active_count' => $overdueAssigned,
                    'bugs_resolved_count' => $bugsResolved,
                    'load_status' => $loadStatus,
                    'load_percentage' => min(100, round(($wipActive / 10) * 100)),
                ];
            }

            // Ordenar por volumen completado descendente
            usort($results, fn ($a, $b) => $b['completed_in_period'] <=> $a['completed_in_period']);

            return $results;
        });
    }

    /**
     * Detalle individual y ficha de rendimiento de un colaborador específico.
     */
    public function getMemberDetail(Project $project, User $member, array $filters = []): array
    {
        $cacheKey = "project_{$project->id}_member_detail_{$member->id}_" . md5(serialize($filters));

        return Cache::remember($cacheKey, 300, function () use ($project, $member, $filters) {
            $period = $filters['period'] ?? '90d';
            $startDate = $this->calculatePeriodStartDate($period);

            $assignedItems = WorkItem::query()
                ->where('project_id', $project->id)
                ->where('is_draft', false)
                ->whereHas('assignees', fn ($q) => $q->where('users.id', $member->id))
                ->with(['state', 'type'])
                ->get();

            $completedItems = $assignedItems->filter(function ($item) use ($startDate) {
                if ($item->state?->group !== 'COMPLETED') return false;
                if (!$startDate) return true;
                $date = $item->completed_at ?? $item->updated_at;
                return $date && Carbon::parse($date)->gte($startDate);
            });

            // Distribución de trabajo entregado por tipo (Bug, Feature, Task)
            $typeDistribution = [];
            foreach ($completedItems as $item) {
                $typeName = $item->type?->name ?? 'General';
                $typeDistribution[$typeName] = ($typeDistribution[$typeName] ?? 0) + 1;
            }

            $typesFormatted = [];
            foreach ($typeDistribution as $name => $count) {
                $typesFormatted[] = [
                    'type' => $name,
                    'count' => $count,
                    'percentage' => $completedItems->count() > 0 ? round(($count / $completedItems->count()) * 100, 1) : 0,
                ];
            }

            // Tendencia semanal de entregas (últimas 6 semanas)
            $weeklyThroughput = [];
            for ($i = 5; $i >= 0; $i--) {
                $weekStart = Carbon::now()->subWeeks($i)->startOfWeek();
                $weekEnd = Carbon::now()->subWeeks($i)->endOfWeek();

                $weekItems = $completedItems->filter(function ($item) use ($weekStart, $weekEnd) {
                    $date = $item->completed_at ? Carbon::parse($item->completed_at) : null;
                    return $date && $date->between($weekStart, $weekEnd);
                });

                $weeklyThroughput[] = [
                    'week_label' => $weekStart->format('d M'),
                    'items_count' => $weekItems->count(),
                    'points_count' => (float) $weekItems->sum('estimate_points'),
                ];
            }

            // Lista de tareas activas
            $activeItems = $assignedItems
                ->filter(fn ($i) => !in_array($i->state?->group, ['COMPLETED', 'CANCELLED']))
                ->map(fn ($i) => [
                    'id' => $i->id,
                    'sequence_id' => $i->sequence_id,
                    'title' => $i->title,
                    'state_name' => $i->state?->name,
                    'state_group' => $i->state?->group,
                    'priority' => $i->priority,
                    'target_date' => $i->target_date?->format('Y-m-d'),
                    'is_overdue' => $i->target_date && Carbon::parse($i->target_date)->startOfDay()->lt(Carbon::now()->startOfDay()),
                ])
                ->values();

            return [
                'member' => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'avatar_url' => $member->avatar_url,
                ],
                'stats' => [
                    'total_assigned' => $assignedItems->count(),
                    'active_wip' => $assignedItems->filter(fn ($i) => $i->state?->group === 'STARTED')->count(),
                    'completed_total' => $completedItems->count(),
                    'completed_points' => (float) $completedItems->sum('estimate_points'),
                ],
                'type_distribution' => $typesFormatted,
                'weekly_throughput' => $weeklyThroughput,
                'active_items' => $activeItems,
            ];
        });
    }

    /**
     * Calcula la fecha de inicio del periodo.
     */
    private function calculatePeriodStartDate(string $period): ?Carbon
    {
        return match ($period) {
            '7d'  => Carbon::now()->subDays(7),
            '14d' => Carbon::now()->subDays(14),
            '30d' => Carbon::now()->subDays(30),
            '90d' => Carbon::now()->subDays(90),
            default => null, // 'all'
        };
    }

    /**
     * Calcula un percentil dado para un arreglo de números.
     */
    private function calculatePercentile(array $data, int $percentile): float
    {
        if (empty($data)) return 0.0;
        sort($data);
        $count = count($data);
        if ($count === 1) return (float) $data[0];

        $index = ($percentile / 100) * ($count - 1);
        $fraction = $index - floor($index);
        $lower = $data[(int) floor($index)];
        $upper = $data[(int) ceil($index)];

        return round($lower + ($fraction * ($upper - $lower)), 1);
    }
}

<?php

namespace App\Services;

use App\Mail\CycleCompletedMail;
use App\Models\Cycle;
use App\Models\CycleWorkItem;
use App\Models\Project;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class CycleService
{
    /**
     * Lista ciclos para un proyecto con filtros de estado.
     */
    public function list(Request $request, Project $project): Collection|AbstractPaginator
    {
        return (new Cycle)->search(
            request: $request,
            relationships: ['owner', 'workItems.state'],
            callback: function ($query) use ($project) {
                $query->where('project_id', $project->id);
            },
            filters: ['name', 'status'],
            sorts: ['created_at', 'start_date', 'end_date']
        );
    }

    /**
     * Obtiene un ciclo con sus work items.
     */
    public function get(Cycle $cycle): Cycle
    {
        return $cycle->load(['owner', 'workItems.state', 'workItems.type', 'workItems.assignees']);
    }

    /**
     * Crea un nuevo ciclo.
     */
    public function save(Request $request, Project $project): Cycle
    {
        $data = $request->validated();
        $user = $request->user();
        $workspaceId = app('current_workspace_id');

        return Cycle::create([
            'workspace_id' => $workspaceId,
            'project_id' => $project->id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null,
            'status' => $data['status'] ?? 'UPCOMING',
            'owned_by' => $data['owned_by'] ?? $user?->id,
        ]);
    }

    /**
     * Actualiza un ciclo existente.
     */
    public function update(Request $request, Cycle $cycle): Cycle
    {
        $data = $request->validated();
        $cycle->update($data);

        return $cycle->load(['owner', 'workItems']);
    }

    /**
     * Asocia work items al ciclo.
     */
    public function addWorkItems(Cycle $cycle, array $workItemIds): Cycle
    {
        $cycle->workItems()->syncWithoutDetaching($workItemIds);

        return $cycle->load('workItems');
    }

    /**
     * Remueve un work item del ciclo.
     */
    public function removeWorkItem(Cycle $cycle, WorkItem $workItem): void
    {
        $cycle->workItems()->detach($workItem->id);
    }

    /**
     * Elimina el ciclo y todos sus work items asociados.
     */
    public function delete(Cycle $cycle): void
    {
        DB::transaction(function () use ($cycle) {
            $cycle->load('workItems');
            foreach ($cycle->workItems as $workItem) {
                $workItem->delete();
            }
            $cycle->delete();
        });
    }

    /**
     * Finaliza un ciclo de trabajo:
     * - Registra el status_at_completion de cada item.
     * - Por defecto transfiere los items pendientes de vuelta al Backlog (conservando la auditoría).
     */
    public function completeCycle(Cycle $cycle, ?string $transferTarget = 'BACKLOG', ?int $targetCycleId = null): Cycle
    {
        return DB::transaction(function () use ($cycle, $transferTarget, $targetCycleId) {
            $cycle->load(['workItems.state', 'project.states']);
            $project = $cycle->project;

            // Encontrar el estado backlog del proyecto para items devueltos
            $backlogState = $project->states->firstWhere('group', 'BACKLOG')
                ?? $project->states->firstWhere('group', 'UNSTARTED')
                ?? $project->states->first();

            foreach ($cycle->workItems as $item) {
                $isCompleted = in_array($item->state?->group, ['COMPLETED', 'CANCELLED']);

                if ($isCompleted) {
                    CycleWorkItem::where('cycle_id', $cycle->id)
                        ->where('work_item_id', $item->id)
                        ->update(['status_at_completion' => 'COMPLETED']);
                } else {
                    // Item no completado: registrar snapshot para estadísticas
                    CycleWorkItem::where('cycle_id', $cycle->id)
                        ->where('work_item_id', $item->id)
                        ->update([
                            'status_at_completion' => 'TRANSFERRED_TO_BACKLOG',
                            'transferred_to_cycle_id' => $targetCycleId,
                        ]);

                    // Si la regla es regresar al backlog, mover el estado del item
                    if ($transferTarget === 'BACKLOG' && $backlogState) {
                        $item->update(['state_id' => $backlogState->id]);
                    } elseif ($targetCycleId) {
                        // Transferir al siguiente ciclo activo
                        DB::table('cycle_work_items')->insertOrIgnore([
                            'cycle_id' => $targetCycleId,
                            'work_item_id' => $item->id,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }

            $cycle->update(['status' => 'COMPLETED']);

            // Notificar a los miembros del proyecto sobre la finalización del ciclo
            try {
                $completedCount = $cycle->workItems->filter(fn ($i) => in_array($i->state?->group, ['COMPLETED', 'CANCELLED']))->count();
                $transferredCount = $cycle->workItems->count() - $completedCount;
                $user = auth()->user() ?? $project->creator ?? User::first();
                $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
                $cycleUrl = "{$frontendUrl}/projects/{$project->id}/cycles";
                $notificationService = app(NotificationService::class);

                $members = $project->members()->get();
                foreach ($members as $member) {
                    if ($member && (int) $member->id !== (int) $user?->id) {
                        $mailable = new CycleCompletedMail(
                            cycle: $cycle,
                            project: $project,
                            completedBy: $user,
                            completedCount: $completedCount,
                            transferredCount: $transferredCount,
                            cycleUrl: $cycleUrl
                        );
                        $notificationService->sendNotification(
                            workspaceId: $project->workspace_id,
                            recipientId: $member->id,
                            actorId: $user?->id,
                            type: 'CYCLE_COMPLETED',
                            entityType: 'CYCLE',
                            entityId: $cycle->id,
                            title: 'Ciclo completado',
                            message: "El ciclo «{$cycle->name}» en «{$project->name}» fue completado ({$completedCount} completadas, {$transferredCount} transferidas).",
                            targetUrl: "/projects/{$project->id}/cycles",
                            mailable: $mailable
                        );
                    }
                }
            } catch (Throwable $e) {
                Log::warning('Error notificando finalización de ciclo: '.$e->getMessage());
            }

            return $cycle->fresh(['workItems.state']);
        });
    }

    /**
     * Calcula métricas y datos de analíticas (burn-down y efectividad del ciclo).
     */
    public function getAnalytics(Cycle $cycle): array
    {
        $cycle->load(['workItems.state']);
        $workItems = $cycle->workItems;
        $totalItems = $workItems->count();

        // Breakdown by state groups
        $doneCount = 0;
        $startedCount = 0;
        $unstartedCount = 0;
        $backlogCount = 0;
        $cancelledCount = 0;
        $totalPoints = 0.0;
        $completedPoints = 0.0;

        foreach ($workItems as $item) {
            $group = strtoupper($item->state?->group ?? 'UNSTARTED');
            $points = (float) ($item->estimate_points ?? 0);

            if ($group !== 'CANCELLED') {
                $totalPoints += $points;
            }

            if ($group === 'COMPLETED') {
                $doneCount++;
                $completedPoints += $points;
            } elseif ($group === 'STARTED') {
                $startedCount++;
            } elseif ($group === 'BACKLOG') {
                $backlogCount++;
            } elseif ($group === 'CANCELLED') {
                $cancelledCount++;
            } else {
                $unstartedCount++;
            }
        }

        $scope = max(0, $totalItems - $cancelledCount);
        $pending = $unstartedCount + $startedCount + $backlogCount;
        $done = $doneCount;
        $started = $startedCount;
        $unstarted = $unstartedCount;
        $completionRate = $scope > 0 ? round(($done / $scope) * 100, 1) : 0.0;

        // Date range and current day index
        $startDate = $cycle->start_date ? Carbon::parse($cycle->start_date)->startOfDay() : ($cycle->created_at ? $cycle->created_at->copy()->startOfDay() : now()->startOfDay());
        $endDate = $cycle->end_date ? Carbon::parse($cycle->end_date)->endOfDay() : (clone $startDate)->addDays(13)->endOfDay();
        if ($endDate->lessThanOrEqualTo($startDate)) {
            $endDate = (clone $startDate)->addDays(13)->endOfDay();
        }

        $totalDays = max(1, $startDate->diffInDays($endDate));
        $today = now()->startOfDay();
        if ($today->lessThan($startDate)) {
            $todayIndex = 0;
        } elseif ($today->greaterThan($endDate)) {
            $todayIndex = $totalDays;
        } else {
            $todayIndex = min($totalDays, max(0, $startDate->diffInDays($today)));
        }

        $todayIdeal = $scope > 0 ? round(max(0, $scope - (($todayIndex / $totalDays) * $scope)), 1) : 0;
        $trailingCount = max(0, round($pending - $todayIdeal, 1));

        $dates = [];
        $workItemsSeries = [];
        $estimatesSeries = [];

        for ($i = 0; $i <= $totalDays; $i++) {
            $currentDay = (clone $startDate)->addDays($i)->endOfDay();
            $dateLabel = $currentDay->format('M d');
            $fullDate = $currentDay->format('Y-m-d');
            $dates[] = $dateLabel;

            $idealPending = $scope > 0 ? round(max(0, $scope - (($i / $totalDays) * $scope)), 1) : 0;
            $idealCompleted = $scope > 0 ? round(($i / $totalDays) * $scope, 1) : 0;
            $idealPendingPoints = $totalPoints > 0 ? round(max(0, $totalPoints - (($i / $totalDays) * $totalPoints)), 1) : 0;
            $idealCompletedPoints = $totalPoints > 0 ? round(($i / $totalDays) * $totalPoints, 1) : 0;

            if ($scope === 0) {
                $dayPending = 0;
                $dayStarted = 0;
                $dayCompleted = 0;
                $dayPendingPoints = 0;
                $dayStartedPoints = 0;
                $dayCompletedPoints = 0;
            } elseif ($i <= $todayIndex) {
                // Determine completed items on or before this day
                $completedOnDay = $workItems->filter(function ($item) use ($currentDay) {
                    if ($item->state?->group !== 'COMPLETED') {
                        return false;
                    }
                    $compDate = $item->completed_at ? Carbon::parse($item->completed_at) : Carbon::parse($item->updated_at);

                    return $compDate->lessThanOrEqualTo($currentDay);
                });

                $dayCompleted = $completedOnDay->count();
                $dayCompletedPoints = (float) $completedOnDay->sum('estimate_points');

                // Determine started items on this day
                $startedOnDay = $workItems->filter(function ($item) use ($currentDay) {
                    if ($item->state?->group !== 'STARTED') {
                        return false;
                    }
                    $startDate = Carbon::parse($item->updated_at ?? $item->created_at);

                    return $startDate->lessThanOrEqualTo($currentDay);
                });

                $dayStarted = $startedOnDay->count();
                $dayStartedPoints = (float) $startedOnDay->sum('estimate_points');

                $dayPending = max(0, $scope - $dayCompleted);
                $dayPendingPoints = max(0, $totalPoints - $dayCompletedPoints);
            } else {
                // Future days project from current status
                $dayCompleted = $done;
                $dayCompletedPoints = $completedPoints;
                $dayStarted = $started;
                $dayStartedPoints = (float) $workItems->filter(fn ($i) => $i->state?->group === 'STARTED')->sum('estimate_points');
                $dayPending = $pending;
                $dayPendingPoints = max(0, $totalPoints - $completedPoints);
            }

            $workItemsSeries[] = [
                'date' => $dateLabel,
                'full_date' => $fullDate,
                'scope' => $scope,
                'pending' => $dayPending,
                'started' => $dayStarted,
                'completed' => $dayCompleted,
                'ideal_pending' => $idealPending,
                'ideal_completed' => $idealCompleted,
            ];

            $estimatesSeries[] = [
                'date' => $dateLabel,
                'full_date' => $fullDate,
                'scope' => round($totalPoints),
                'pending' => round($dayPendingPoints),
                'started' => round($dayStartedPoints),
                'completed' => round($dayCompletedPoints),
                'ideal_pending' => $idealPendingPoints,
                'ideal_completed' => $idealCompletedPoints,
            ];
        }

        return [
            'cycle_id' => $cycle->id,
            'name' => $cycle->name,
            'status' => $cycle->status,
            'start_date' => $startDate->format('Y-m-d'),
            'end_date' => $endDate->format('Y-m-d'),
            'today_index' => $todayIndex,
            'today_date' => $today->format('Y-m-d'),
            'progress_percentage' => $completionRate,
            'metrics' => [
                'total_items' => $scope,
                'completed_items' => $done,
                'incomplete_items' => $pending,
                'completion_rate' => $completionRate,
                'total_points' => round($totalPoints, 1),
                'completed_points' => round($completedPoints, 1),
            ],
            'breakdown' => [
                'scope' => $scope,
                'pending' => $pending,
                'started' => $started,
                'done' => $done,
                'unstarted' => $unstarted,
                'backlog' => $backlogCount,
                'cancelled' => $cancelledCount,
                'today_ideal_pending' => $todayIdeal,
                'trailing_count' => $trailingCount,
            ],
            'timeline' => [
                'dates' => $dates,
                'work_items' => $workItemsSeries,
                'estimates' => $estimatesSeries,
            ],
        ];
    }
}

<?php

namespace App\Services;

use App\Mail\CycleCompletedMail;
use App\Models\Cycle;
use App\Models\CycleWorkItem;
use App\Models\Project;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Services\Agile\WorkItemReadinessEvaluator;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class CycleService
{
    /**
     * Determina el estado del ciclo según la fecha actual y su rango de fechas.
     */
    public function determineStatusFromDates(?string $startDate, ?string $endDate, ?string $fallbackStatus = 'UPCOMING'): string
    {
        if (! $startDate || ! $endDate) {
            return $fallbackStatus ?? 'UPCOMING';
        }

        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->endOfDay();
        $today = now()->startOfDay();

        if ($today->lt($start)) {
            return 'UPCOMING';
        }

        if ($today->between($start, $end)) {
            return 'CURRENT';
        }

        if ($today->gt($end)) {
            return 'COMPLETED';
        }

        return $fallbackStatus ?? 'UPCOMING';
    }

    /**
     * Verifica si un rango de fechas se solapa con un ciclo con estado CURRENT en el proyecto.
     */
    public function checkCurrentCycleOverlap(int $projectId, ?string $startDate, ?string $endDate, ?int $ignoreCycleId = null): ?Cycle
    {
        if (! $startDate || ! $endDate) {
            return null;
        }

        $start = Carbon::parse($startDate)->format('Y-m-d');
        $end = Carbon::parse($endDate)->format('Y-m-d');

        return Cycle::where('project_id', $projectId)
            ->where('status', 'CURRENT')
            ->when($ignoreCycleId, fn ($q) => $q->where('id', '!=', $ignoreCycleId))
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->where(function ($q) use ($start, $end) {
                $q->where('start_date', '<=', $end)
                    ->where('end_date', '>=', $start);
            })
            ->first();
    }

    /**
     * Valida que no haya solapamiento con un ciclo actual del proyecto.
     * Arroja ValidationException (HTTP 422) si hay solapamiento o si ya existe un ciclo CURRENT.
     */
    public function validateNoOverlap(int $projectId, ?string $startDate, ?string $endDate, ?string $status = null, ?int $ignoreCycleId = null): void
    {
        if ($startDate && $endDate) {
            $overlapping = $this->checkCurrentCycleOverlap($projectId, $startDate, $endDate, $ignoreCycleId);
            if ($overlapping) {
                $currStart = $overlapping->start_date ? Carbon::parse($overlapping->start_date)->format('Y-m-d') : '';
                $currEnd = $overlapping->end_date ? Carbon::parse($overlapping->end_date)->format('Y-m-d') : '';
                $startStr = Carbon::parse($startDate)->format('Y-m-d');
                $endStr = Carbon::parse($endDate)->format('Y-m-d');

                throw ValidationException::withMessages([
                    'start_date' => ["Las fechas del ciclo ({$startStr} al {$endStr}) se solapan con el ciclo actual activo '{$overlapping->name}' ({$currStart} al {$currEnd})."],
                ]);
            }
        }

        if ($status === 'CURRENT') {
            $existingCurrent = Cycle::where('project_id', $projectId)
                ->where('status', 'CURRENT')
                ->when($ignoreCycleId, fn ($q) => $q->where('id', '!=', $ignoreCycleId))
                ->first();

            if ($existingCurrent) {
                throw ValidationException::withMessages([
                    'status' => ["Ya existe un ciclo actual activo en el proyecto ('{$existingCurrent->name}'). No puede haber más de un ciclo actual simultáneamente."],
                ]);
            }
        }
    }

    /**
     * Sincroniza automáticamente los estados de los ciclos del proyecto según la fecha actual.
     */
    public function syncProjectCycleStatuses(Project $project): int
    {
        $today = now()->startOfDay();
        $cycles = Cycle::where('project_id', $project->id)
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->whereNotIn('status', ['DRAFT'])
            ->orderBy('start_date', 'asc')
            ->get();

        $updatedCount = 0;
        $hasCurrent = false;

        // 1. Finalizar ciclos cuya fecha de fin ya expiró
        foreach ($cycles as $cycle) {
            $end = Carbon::parse($cycle->end_date)->endOfDay();

            if ($today->gt($end) && $cycle->status !== 'COMPLETED') {
                $cycle->update(['status' => 'COMPLETED']);
                $updatedCount++;
            }
        }

        // 2. Activar o programar ciclos no finalizados
        foreach ($cycles->fresh() as $cycle) {
            if ($cycle->status === 'COMPLETED') {
                continue;
            }

            $start = Carbon::parse($cycle->start_date)->startOfDay();
            $end = Carbon::parse($cycle->end_date)->endOfDay();

            if ($today->between($start, $end)) {
                if (! $hasCurrent) {
                    if ($cycle->status !== 'CURRENT') {
                        $cycle->update(['status' => 'CURRENT']);
                        $updatedCount++;
                    }
                    $hasCurrent = true;
                }
            } elseif ($today->lt($start)) {
                if ($cycle->status !== 'UPCOMING') {
                    $cycle->update(['status' => 'UPCOMING']);
                    $updatedCount++;
                }
            }
        }

        return $updatedCount;
    }

    /**
     * Lista ciclos para un proyecto con filtros de estado.
     */
    public function list(Request $request, Project $project): Collection|AbstractPaginator
    {
        $this->syncProjectCycleStatuses($project);

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

        $startDate = $data['start_date'] ?? null;
        $endDate = $data['end_date'] ?? null;
        $requestedStatus = $data['status'] ?? null;

        $status = ($requestedStatus === 'DRAFT')
            ? 'DRAFT'
            : ($startDate && $endDate
                ? $this->determineStatusFromDates($startDate, $endDate, $requestedStatus ?? 'UPCOMING')
                : ($requestedStatus ?? 'UPCOMING'));

        $this->validateNoOverlap(
            projectId: $project->id,
            startDate: $startDate,
            endDate: $endDate,
            status: $status
        );

        return Cycle::create([
            'workspace_id' => $workspaceId,
            'project_id' => $project->id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'status' => $status,
            'owned_by' => $data['owned_by'] ?? $user?->id,
        ]);
    }

    /**
     * Actualiza un ciclo existente.
     */
    public function update(Request $request, Cycle $cycle): Cycle
    {
        $data = $request->validated();

        $startDate = array_key_exists('start_date', $data) ? $data['start_date'] : ($cycle->start_date ? Carbon::parse($cycle->start_date)->format('Y-m-d') : null);
        $endDate = array_key_exists('end_date', $data) ? $data['end_date'] : ($cycle->end_date ? Carbon::parse($cycle->end_date)->format('Y-m-d') : null);
        $requestedStatus = array_key_exists('status', $data) ? $data['status'] : null;

        if ($requestedStatus === null && (array_key_exists('start_date', $data) || array_key_exists('end_date', $data))) {
            if ($startDate && $endDate && $cycle->status !== 'DRAFT') {
                $data['status'] = $this->determineStatusFromDates($startDate, $endDate, $cycle->status);
            }
        } elseif ($requestedStatus && $requestedStatus !== 'DRAFT' && $startDate && $endDate) {
            $data['status'] = $this->determineStatusFromDates($startDate, $endDate, $requestedStatus);
        }

        $effectiveStatus = $data['status'] ?? $cycle->status;

        $this->validateNoOverlap(
            projectId: $cycle->project_id,
            startDate: $startDate,
            endDate: $endDate,
            status: $requestedStatus ? $effectiveStatus : null,
            ignoreCycleId: $cycle->id
        );

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
     * Evalúa advertencias de Definition of Ready (DoR) para los ítems asociados.
     */
    public function getReadinessWarnings(Cycle $cycle, array $workItemIds): array
    {
        $evaluator = app(WorkItemReadinessEvaluator::class);
        $items = WorkItem::whereIn('id', $workItemIds)
            ->with(['dodItems', 'outwardRelations.target.state', 'inwardRelations.source.state'])
            ->get();

        $warnings = [];
        foreach ($items as $item) {
            $readiness = $evaluator->evaluate($item);
            if (! $readiness['is_ready']) {
                $warnings[] = [
                    'work_item_id' => (string) $item->id,
                    'sequence_id' => $item->sequence_id,
                    'title' => $item->title,
                    'missing' => $readiness['missing'],
                ];
            }
        }

        return $warnings;
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
     * Calcula métricas y datos de analíticas (burn-down, burn-up, alcance dinámico y efectividad del ciclo).
     */
    public function getAnalytics(Cycle $cycle): array
    {
        $cycle->load([
            'workItems.state',
            'workItems.type',
            'workItems.assignees',
            'workItems.deliverables.creator',
            'workItems.dodItems',
        ]);
        $workItems = $cycle->workItems;
        $totalItems = $workItems->count();

        // Date range and current day index
        $startDate = $cycle->start_date ? Carbon::parse($cycle->start_date)->startOfDay() : ($cycle->created_at ? $cycle->created_at->copy()->startOfDay() : now()->startOfDay());
        $endDate = $cycle->end_date ? Carbon::parse($cycle->end_date)->endOfDay() : (clone $startDate)->addDays(13)->endOfDay();
        if ($endDate->lessThanOrEqualTo($startDate)) {
            $endDate = (clone $startDate)->addDays(13)->endOfDay();
        }

        $totalDays = max(1, (int) $startDate->copy()->startOfDay()->diffInDays($endDate->copy()->startOfDay()));
        $today = now()->startOfDay();
        if ($today->lessThan($startDate)) {
            $todayIndex = 0;
        } elseif ($today->greaterThan($endDate)) {
            $todayIndex = $totalDays;
        } else {
            $todayIndex = min($totalDays, max(0, (int) $startDate->copy()->startOfDay()->diffInDays($today)));
        }

        // Breakdown by state groups and tracking of cycle dynamics
        $doneCount = 0;
        $startedCount = 0;
        $unstartedCount = 0;
        $backlogCount = 0;
        $cancelledCount = 0;
        $totalPoints = 0.0;
        $completedPoints = 0.0;

        $initialScopeCount = 0;
        $addedMidCycleCount = 0;
        $modifiedCount = 0;
        $unresolvedCount = 0;
        $transferredCount = 0;
        $addedPoints = 0.0;

        $classifiedItems = [];

        foreach ($workItems as $item) {
            $group = strtoupper($item->state?->group ?? 'UNSTARTED');
            $points = (float) ($item->estimate_points ?? 0);
            $pivotAddedAt = $item->pivot?->created_at ? Carbon::parse($item->pivot->created_at) : ($item->created_at ? Carbon::parse($item->created_at) : null);
            $itemUpdatedAt = $item->updated_at ? Carbon::parse($item->updated_at) : null;
            $statusAtComp = $item->pivot?->status_at_completion;
            $transferredToCycle = $item->pivot?->transferred_to_cycle_id;

            $isAddedMidCycle = $pivotAddedAt ? $pivotAddedAt->greaterThan($startDate->copy()->endOfDay()) : false;
            $isModified = ($itemUpdatedAt && $item->created_at && $itemUpdatedAt->greaterThan(Carbon::parse($item->created_at)->addMinutes(10)) && $itemUpdatedAt->between($startDate, $endDate));
            $isUnresolved = ($group !== 'COMPLETED' && $group !== 'CANCELLED') || ($statusAtComp === 'TRANSFERRED_TO_BACKLOG') || ! empty($transferredToCycle);
            $isTransferred = ($statusAtComp === 'TRANSFERRED_TO_BACKLOG') || ! empty($transferredToCycle);

            if ($group !== 'CANCELLED') {
                $totalPoints += $points;
                if ($isAddedMidCycle) {
                    $addedMidCycleCount++;
                    $addedPoints += $points;
                } else {
                    $initialScopeCount++;
                }
            } else {
                $cancelledCount++;
            }

            if ($isModified) {
                $modifiedCount++;
            }

            if ($isUnresolved) {
                $unresolvedCount++;
            }

            if ($isTransferred) {
                $transferredCount++;
            }

            if ($group === 'COMPLETED') {
                $doneCount++;
                $completedPoints += $points;
            } elseif ($group === 'STARTED') {
                $startedCount++;
            } elseif ($group === 'BACKLOG') {
                $backlogCount++;
            } else {
                $unstartedCount++;
            }

            $classifiedItems[] = [
                'id' => $item->id,
                'sequence_id' => $item->sequence_id,
                'identifier' => $item->identifier ?? ($cycle->project ? "{$cycle->project->identifier}-{$item->sequence_id}" : (string) $item->sequence_id),
                'title' => $item->title,
                'priority' => $item->priority,
                'estimate_points' => $item->estimate_points,
                'estimate_value' => $item->estimate_value,
                'state' => $item->state ? [
                    'id' => $item->state->id,
                    'name' => $item->state->name,
                    'color' => $item->state->color,
                    'group' => $item->state->group,
                ] : null,
                'type' => $item->type ? [
                    'id' => $item->type->id,
                    'name' => $item->type->name,
                    'color' => $item->type->color,
                ] : null,
                'assignees' => $item->assignees ? $item->assignees->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                ]) : [],
                'is_added_mid_cycle' => $isAddedMidCycle,
                'added_at' => $pivotAddedAt?->format('Y-m-d H:i'),
                'is_modified' => $isModified,
                'is_unresolved' => $isUnresolved,
                'is_transferred' => $isTransferred,
                'status_at_completion' => $statusAtComp,
                'deliverables_count' => $item->relationLoaded('deliverables') ? $item->deliverables->count() : ($item->deliverables_count ?? 0),
                'approved_deliverables_count' => $item->relationLoaded('deliverables') ? $item->deliverables->where('status', 'APPROVED')->count() : 0,
                'deliverables' => $item->relationLoaded('deliverables') ? $item->deliverables->map(fn ($d) => [
                    'id' => $d->id,
                    'title' => $d->title,
                    'type' => $d->type,
                    'url' => $d->url,
                    'file_url' => $d->file_url,
                    'status' => $d->status,
                ]) : [],
                'dod_items_count' => $item->relationLoaded('dodItems') ? $item->dodItems->count() : ($item->dod_items_count ?? 0),
                'completed_dod_items_count' => $item->relationLoaded('dodItems') ? $item->dodItems->where('is_completed', true)->count() : 0,
            ];
        }

        $scope = max(0, $totalItems - $cancelledCount);
        $pending = $unstartedCount + $startedCount + $backlogCount;
        $done = $doneCount;
        $started = $startedCount;
        $unstarted = $unstartedCount;
        $completionRate = $scope > 0 ? round(($done / $scope) * 100, 1) : 0.0;

        $todayIdeal = 0.0;
        $trailingCount = 0.0;

        $dates = [];
        $workItemsSeries = [];
        $estimatesSeries = [];

        for ($i = 0; $i <= $totalDays; $i++) {
            $currentDayStart = (clone $startDate)->addDays($i)->startOfDay();
            $currentDayEnd = (clone $startDate)->addDays($i)->endOfDay();
            $dateLabel = $currentDayEnd->format('M d');
            $fullDate = $currentDayEnd->format('Y-m-d');
            $dates[] = $dateLabel;

            // Scope dinámico a la fecha (ítems agregados hasta este día que no hayan sido cancelados hasta este día)
            $itemsPresentOnDay = $workItems->filter(function ($item) use ($currentDayEnd) {
                $pivotAdded = $item->pivot?->created_at ? Carbon::parse($item->pivot->created_at) : ($item->created_at ? Carbon::parse($item->created_at) : null);
                if ($pivotAdded && $pivotAdded->greaterThan($currentDayEnd)) {
                    return false;
                }
                if ($item->state?->group === 'CANCELLED') {
                    $cancelledAt = $item->updated_at ? Carbon::parse($item->updated_at) : null;
                    if ($cancelledAt && $cancelledAt->lessThanOrEqualTo($currentDayEnd)) {
                        return false;
                    }
                }

                return true;
            });

            $dayScope = max(0, $itemsPresentOnDay->count());
            $dayScopePoints = (float) $itemsPresentOnDay->sum('estimate_points');

            // Conteo de tareas agregadas ese día
            $addedThatDay = $workItems->filter(function ($item) use ($currentDayStart, $currentDayEnd) {
                $pivotAdded = $item->pivot?->created_at ? Carbon::parse($item->pivot->created_at) : null;

                return $pivotAdded && $pivotAdded->between($currentDayStart, $currentDayEnd);
            })->count();

            // Conteo de tareas modificadas ese día
            $modifiedThatDay = $workItems->filter(function ($item) use ($currentDayStart, $currentDayEnd) {
                $updatedAt = $item->updated_at ? Carbon::parse($item->updated_at) : null;

                return $updatedAt && $updatedAt->between($currentDayStart, $currentDayEnd) && Carbon::parse($item->created_at)->lt($currentDayStart);
            })->count();

            // Avance ideal dinámico por día recalculado según el alcance efectivo de la jornada
            $idealPending = $dayScope > 0 ? round(max(0, $dayScope * (1.0 - ($i / $totalDays))), 1) : 0.0;
            $idealCompleted = $dayScope > 0 ? round(min($dayScope, $dayScope * ($i / $totalDays)), 1) : 0.0;
            $idealPendingPoints = $dayScopePoints > 0 ? round(max(0, $dayScopePoints * (1.0 - ($i / $totalDays))), 1) : 0.0;
            $idealCompletedPoints = $dayScopePoints > 0 ? round(min($dayScopePoints, $dayScopePoints * ($i / $totalDays)), 1) : 0.0;

            if ($i === $todayIndex) {
                $todayScope = $dayScope;
                $todayIdeal = $idealPending;
            }

            if ($scope === 0) {
                $dayPending = 0;
                $dayStarted = 0;
                $dayCompleted = 0;
                $dayPendingPoints = 0;
                $dayStartedPoints = 0;
                $dayCompletedPoints = 0;
            } elseif ($i <= $todayIndex) {
                // Tareas completadas hasta este día
                $completedOnDay = $itemsPresentOnDay->filter(function ($item) use ($currentDayEnd) {
                    if ($item->state?->group !== 'COMPLETED') {
                        return false;
                    }
                    $compDate = $item->completed_at ? Carbon::parse($item->completed_at) : Carbon::parse($item->updated_at);

                    return $compDate->lessThanOrEqualTo($currentDayEnd);
                });

                $dayCompleted = $completedOnDay->count();
                $dayCompletedPoints = (float) $completedOnDay->sum('estimate_points');

                // Tareas en progreso hasta este día
                $startedOnDay = $itemsPresentOnDay->filter(function ($item) use ($currentDayEnd) {
                    if ($item->state?->group !== 'STARTED') {
                        return false;
                    }
                    $startDate = Carbon::parse($item->updated_at ?? $item->created_at);

                    return $startDate->lessThanOrEqualTo($currentDayEnd);
                });

                $dayStarted = $startedOnDay->count();
                $dayStartedPoints = (float) $startedOnDay->sum('estimate_points');

                $dayPending = max(0, $dayScope - $dayCompleted);
                $dayPendingPoints = max(0, $dayScopePoints - $dayCompletedPoints);
            } else {
                // Días futuros proyectados
                $dayCompleted = $done;
                $dayCompletedPoints = $completedPoints;
                $dayStarted = $started;
                $dayStartedPoints = (float) $workItems->filter(fn ($it) => $it->state?->group === 'STARTED')->sum('estimate_points');
                $dayPending = $pending;
                $dayPendingPoints = max(0, $totalPoints - $completedPoints);
                $dayScope = $scope;
                $dayScopePoints = $totalPoints;
            }

            $workItemsSeries[] = [
                'date' => $dateLabel,
                'full_date' => $fullDate,
                'scope' => $dayScope,
                'pending' => $dayPending,
                'started' => $dayStarted,
                'completed' => $dayCompleted,
                'ideal_pending' => $idealPending,
                'ideal_completed' => $idealCompleted,
                'added_today' => $addedThatDay,
                'modified_today' => $modifiedThatDay,
            ];

            $estimatesSeries[] = [
                'date' => $dateLabel,
                'full_date' => $fullDate,
                'scope' => round($dayScopePoints),
                'pending' => round($dayPendingPoints),
                'started' => round($dayStartedPoints),
                'completed' => round($dayCompletedPoints),
                'ideal_pending' => $idealPendingPoints,
                'ideal_completed' => $idealCompletedPoints,
                'added_today' => $addedThatDay,
                'modified_today' => $modifiedThatDay,
            ];
        }

        $effectiveTodayScope = isset($todayScope) ? $todayScope : $scope;
        if (! isset($todayIdeal) || $todayIdeal === 0.0) {
            $todayIdeal = $effectiveTodayScope > 0 ? round(max(0, $effectiveTodayScope * (1.0 - ($todayIndex / $totalDays))), 1) : 0.0;
        }
        $trailingCount = max(0, round($pending - $todayIdeal, 1));

        return [
            'cycle_id' => $cycle->id,
            'name' => $cycle->name,
            'description' => $cycle->description,
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
            'scope_breakdown' => [
                'initial_planned_count' => $initialScopeCount,
                'added_mid_cycle_count' => $addedMidCycleCount,
                'modified_count' => $modifiedCount,
                'unresolved_count' => $unresolvedCount,
                'transferred_count' => $transferredCount,
                'completed_count' => $doneCount,
                'added_points' => round($addedPoints, 1),
            ],
            'impact_analysis' => [
                'scope_impact' => $addedMidCycleCount > 0
                    ? "Se incorporaron {$addedMidCycleCount} tareas (+{$addedPoints} pts) tras iniciar el ciclo, aumentando el alcance total de {$initialScopeCount} a {$scope} tareas y elevando escalonadamente la línea de Scope."
                    : "El alcance se mantuvo estable en {$initialScopeCount} tareas sin adiciones no planificadas (sin Scope Creep).",
                'ideal_impact' => $scope > 0
                    ? 'La línea de Avance Ideal calcula la velocidad requerida de '.round($scope / $totalDays, 2).' tareas/día. Al agregarse tareas a mitad del ciclo, la pendiente ideal se vuelve más empinada y exigente para el equipo.'
                    : 'Sin carga de trabajo asignada para proyectar velocidad.',
                'burndown_impact' => "Cada tarea agregada elevó la curva de trabajo pendiente hacia arriba. Las {$unresolvedCount} tareas sin resolver impidieron que la línea de pendientes descendiera hasta 0 al cierre de la iteración.",
                'burnup_impact' => "La meta (techo de Scope) se desplazó con las tareas añadidas, requiriendo que la línea de Completadas ({$doneCount}) recorriera mayor distancia hacia el alcance final ({$scope}).",
            ],
            'timeline' => [
                'dates' => $dates,
                'work_items' => $workItemsSeries,
                'estimates' => $estimatesSeries,
            ],
            'work_items' => $classifiedItems,
        ];
    }
}

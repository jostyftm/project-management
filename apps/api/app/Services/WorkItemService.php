<?php

namespace App\Services;

use App\Mail\WorkItemAssignedMail;
use App\Mail\WorkItemStatusChangedMail;
use App\Models\Activity;
use App\Models\Project;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemRelation;
use App\Services\Agile\WorkItemRollupService;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class WorkItemService
{
    /**
     * Lista los work items de un proyecto con filtros y ordenamientos.
     */
    public function list(Request $request, Project $project): Collection|AbstractPaginator
    {
        return (new WorkItem)->search(
            request: $request,
            relationships: ['state', 'type', 'assignees', 'labels', 'creator', 'lead', 'milestone', 'milestones', 'project', 'parent', 'subItems.state', 'subItems.lead', 'subItems.assignees', 'cycles', 'modules', 'deliverables.creator', 'dodItems', 'outwardRelations.target.state', 'inwardRelations.source.state', 'blockedByUser'],
            callback: function ($builder) use ($project, $request) {
                $builder->where('project_id', $project->id);

                if (! $request->has('sort')) {
                    $builder->orderBy('sort_order', 'asc');
                }

                if ($request->has('cycle_id')) {
                    $builder->whereHas('cycles', function ($q) use ($request) {
                        $q->where('cycles.id', $request->cycle_id);
                    });
                }

                if ($request->has('module_id')) {
                    $builder->whereHas('modules', function ($q) use ($request) {
                        $q->where('modules.id', $request->module_id);
                    });
                }

                if ($request->has('milestone_id')) {
                    $builder->where(function ($q) use ($request) {
                        $q->where('milestone_id', $request->milestone_id)
                            ->orWhereHas('milestones', fn ($mq) => $mq->where('milestones.id', $request->milestone_id));
                    });
                }

                if ($request->has('lead_id')) {
                    $builder->where('lead_id', $request->lead_id);
                }

                if ($request->has('is_blocked')) {
                    $builder->where('is_blocked', filter_var($request->is_blocked, FILTER_VALIDATE_BOOLEAN));
                }
            },
            filters: ['title', 'state_id', 'type_id', 'priority', 'is_draft', 'lead_id', 'milestone_id', 'is_blocked'],
            sorts: ['created_at', 'sequence_id', 'priority', 'target_date', 'sort_order']
        );
    }

    /**
     * Obtiene un work item por ID validando pertenencia al workspace.
     */
    public function get(WorkItem $workItem): WorkItem
    {
        if (app()->has('current_workspace_id') && $workItem->workspace_id !== app('current_workspace_id')) {
            abort(404);
        }

        return $workItem->load([
            'state',
            'type',
            'assignees',
            'labels',
            'creator',
            'lead',
            'milestone',
            'milestones',
            'project',
            'parent',
            'subItems.state',
            'subItems.lead',
            'subItems.assignees',
            'cycles',
            'modules',
            'outwardRelations.target.state',
            'inwardRelations.source.state',
        ]);
    }

    /**
     * Crea un work item en un proyecto.
     */
    public function save(Request $request, Project $project): WorkItem
    {
        $data = $request->validated();
        $user = $request->user();

        return DB::transaction(function () use ($data, $user, $project) {
            // Resolver secuencia consecutiva única por proyecto
            $maxSeq = WorkItem::withoutGlobalScopes()
                ->where('project_id', $project->id)
                ->max('sequence_id') ?? 0;
            $sequenceId = $maxSeq + 1;

            // Estado por defecto si no se especificó
            $stateId = $data['state_id'] ?? null;
            if (! $stateId) {
                $defaultState = State::where('project_id', $project->id)
                    ->where('is_default', true)
                    ->first()
                    ?? State::where('project_id', $project->id)->orderBy('sequence')->first();

                $stateId = $defaultState?->id;
            }

            $initialState = $stateId ? State::find($stateId) : null;
            $completedAt = ($initialState && in_array(strtoupper($initialState->group), ['COMPLETED', 'CANCELLED'])) ? now() : null;

            $descHtml = $data['description_html'] ?? $data['description'] ?? null;
            $descJson = $data['description_json'] ?? null;
            if ($descHtml && ! $descJson) {
                $descJson = ['html' => $descHtml];
            }

            $sortOrder = array_key_exists('sort_order', $data) ? (float) $data['sort_order'] : null;
            if ($sortOrder === null) {
                $maxSort = (float) (WorkItem::where('project_id', $project->id)->max('sort_order') ?? 0);
                $sortOrder = $maxSort + 1000.0;
            }

            $isBlocked = (bool) ($data['is_blocked'] ?? false);

            if (! empty($data['start_date']) && ! empty($data['target_date']) && $data['start_date'] > $data['target_date']) {
                abort(422, 'La fecha de inicio no puede ser posterior a la fecha de vencimiento.');
            }

            $workItem = WorkItem::create([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'sequence_id' => $sequenceId,
                'title' => $data['title'],
                'description_html' => $descHtml,
                'description_json' => $descJson,
                'state_id' => $stateId,
                'type_id' => $data['type_id'] ?? null,
                'priority' => $data['priority'] ?? 'NONE',
                'sort_order' => $sortOrder,
                'parent_id' => $data['parent_id'] ?? null,
                'lead_id' => $data['lead_id'] ?? null,
                'milestone_id' => $data['milestone_id'] ?? null,
                'estimate_points' => $data['estimate_points'] ?? null,
                'estimate_value' => $data['estimate_value'] ?? null,
                'start_date' => $data['start_date'] ?? null,
                'target_date' => $data['target_date'] ?? null,
                'completed_at' => $completedAt,
                'state_changed_at' => now(),
                'is_draft' => $data['is_draft'] ?? false,
                'is_blocked' => $isBlocked,
                'blocked_reason' => $isBlocked ? ($data['blocked_reason'] ?? null) : null,
                'blocked_at' => $isBlocked ? now() : null,
                'blocked_by_user_id' => $isBlocked ? $user->id : null,
                'created_by' => $user->id,
            ]);

            if (! empty($data['assignee_ids'])) {
                $workItem->assignees()->sync($data['assignee_ids']);
            }

            if (! empty($data['label_ids'])) {
                $workItem->labels()->sync($data['label_ids']);
            }

            if (! empty($data['cycle_id'])) {
                $workItem->cycles()->syncWithoutDetaching([$data['cycle_id']]);
            }

            if (! empty($data['module_id'])) {
                $workItem->modules()->syncWithoutDetaching([$data['module_id']]);
            }

            if (! empty($data['milestone_id'])) {
                $workItem->milestones()->syncWithoutDetaching([$data['milestone_id']]);
            }

            // Registrar auditoría de creación
            Activity::create([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'actor_id' => $user->id,
                'entity_type' => 'WORK_ITEM',
                'entity_id' => $workItem->id,
                'action' => 'CREATED',
                'changes_diff' => ['title' => $workItem->title],
            ]);

            // Notificar asignaciones si aplica (In-App y Job encolado)
            try {
                $assigneesToNotify = collect();
                if ($workItem->lead_id && (int) $workItem->lead_id !== (int) $user->id) {
                    $assigneesToNotify->push($workItem->lead_id);
                }
                if (! empty($data['assignee_ids'])) {
                    foreach ($data['assignee_ids'] as $aId) {
                        if ((int) $aId !== (int) $user->id) {
                            $assigneesToNotify->push($aId);
                        }
                    }
                }

                $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
                $workItemUrl = "{$frontendUrl}/projects/{$project->id}/work-items?selected={$workItem->id}";
                $notificationService = app(NotificationService::class);

                foreach ($assigneesToNotify->unique() as $recipientId) {
                    $recipientUser = User::find($recipientId);
                    if ($recipientUser) {
                        $mailable = new WorkItemAssignedMail(
                            workItem: $workItem->loadMissing(['project', 'state']),
                            assignee: $recipientUser,
                            actor: $user,
                            workItemUrl: $workItemUrl
                        );
                        $notificationService->sendNotification(
                            workspaceId: $project->workspace_id,
                            recipientId: $recipientId,
                            actorId: $user->id,
                            type: 'ASSIGNMENT',
                            entityType: 'WORK_ITEM',
                            entityId: $workItem->id,
                            title: 'Nueva tarea asignada',
                            message: "{$user->name} te ha asignado la tarea «{$workItem->title}».",
                            targetUrl: $workItemUrl,
                            mailable: $mailable
                        );
                    }
                }
            } catch (Throwable $e) {
                Log::warning('Error despachando notificaciones de creación de work item: '.$e->getMessage());
            }

            if ($workItem->parent_id) {
                try {
                    app(WorkItemRollupService::class)->syncParentStatus($workItem);
                } catch (Throwable $e) {
                    Log::warning('Error en roll-up de nuevo work item: '.$e->getMessage());
                }
            }

            return $workItem->load(['state', 'type', 'assignees', 'labels', 'creator', 'lead', 'milestone', 'project', 'parent', 'cycles', 'modules']);
        });
    }

    /**
     * Actualiza propiedades de un work item.
     */
    public function update(Request $request, WorkItem $workItem): WorkItem
    {
        if (app()->has('current_workspace_id') && $workItem->workspace_id !== app('current_workspace_id')) {
            abort(404);
        }

        $data = $request->validated();
        $user = $request->user();

        // Verificación de autorización por rol de proyecto
        $role = $request->attributes->get('current_project_role');
        if (! $role && $workItem->project && $user) {
            $member = $workItem->project->members()->where('users.id', $user->id)->first();
            $role = $member?->pivot?->role;
        }

        $isProjectAdmin = ($user && $user->is_instance_admin)
            || ($workItem->project && $workItem->project->workspace && (int) $workItem->project->workspace->owner_id === (int) $user->id)
            || $role === 'ADMIN';

        if (! $isProjectAdmin) {
            // Validar si el usuario está asignado como lead, en assignees o es el creador
            $isAssigneeOrCreator = (int) $workItem->lead_id === (int) $user->id
                || (int) $workItem->created_by === (int) $user->id
                || $workItem->assignees()->where('users.id', $user->id)->exists();

            if (! $isAssigneeOrCreator) {
                // Seguridad por diseño: 404 para miembros no asignados o sin permisos
                abort(404, 'Recurso no encontrado.');
            }

            // Validar que únicamente modifique el estado (state_id) o reporte impedimentos
            $payloadKeys = array_keys($data);
            $disallowedKeys = array_diff($payloadKeys, ['state_id', 'is_blocked', 'blocked_reason']);
            if (! empty($disallowedKeys)) {
                abort(403, 'Los miembros únicamente pueden cambiar el estado o reportar impedimentos en la tarea.');
            }
        }

        return DB::transaction(function () use ($data, $user, $workItem) {
            $originalStateId = $workItem->state_id;
            $originalLeadId = $workItem->lead_id;
            $originalIsBlocked = (bool) $workItem->is_blocked;
            $originalAssigneeIds = $workItem->assignees()->pluck('users.id')->all();

            if (array_key_exists('start_date', $data) || array_key_exists('target_date', $data)) {
                $effectiveStartDate = array_key_exists('start_date', $data) ? $data['start_date'] : $workItem->start_date?->format('Y-m-d');
                $effectiveTargetDate = array_key_exists('target_date', $data) ? $data['target_date'] : $workItem->target_date?->format('Y-m-d');

                if ($effectiveStartDate && $effectiveTargetDate && $effectiveStartDate > $effectiveTargetDate) {
                    abort(422, 'La fecha de inicio no puede ser posterior a la fecha de vencimiento.');
                }
            }

            if (array_key_exists('state_id', $data) && $data['state_id'] != $originalStateId) {
                $data['state_changed_at'] = now();
                $newState = $data['state_id'] ? State::find($data['state_id']) : null;
                if ($newState && in_array(strtoupper($newState->group), ['COMPLETED', 'CANCELLED'])) {
                    $data['completed_at'] = now();
                } else {
                    $data['completed_at'] = null;
                }

                // Validación de evidencia obligatoria para pasar a COMPLETED
                if ($newState && strtoupper($newState->group) === 'COMPLETED') {
                    $project = $workItem->project;
                    if ($project && (bool) $project->require_evidence_to_complete) {
                        $hasDeliverable = $workItem->deliverables()->exists();
                        $hasEvidenceComment = $workItem->comments()
                            ->where(function ($q) {
                                $q->where('is_work_log', true)
                                    ->orWhereNotNull('attachments');
                            })
                            ->exists();

                        if (! $hasDeliverable && ! $hasEvidenceComment) {
                            abort(422, 'No se puede completar la tarea: la configuración del proyecto exige adjuntar al menos una evidencia (entregable formal o captura con descripción en la sección de actividad).');
                        }
                    }
                }
            }

            if (array_key_exists('is_blocked', $data)) {
                $newIsBlocked = (bool) $data['is_blocked'];
                if ($newIsBlocked && ! $originalIsBlocked) {
                    $data['is_blocked'] = true;
                    $data['blocked_at'] = now();
                    $data['blocked_by_user_id'] = $user->id;
                } elseif (! $newIsBlocked && $originalIsBlocked) {
                    $data['is_blocked'] = false;
                    $data['blocked_at'] = null;
                    $data['blocked_by_user_id'] = null;
                    $data['blocked_reason'] = null;
                }
            }

            if (array_key_exists('description_html', $data) || array_key_exists('description', $data)) {
                $descHtml = $data['description_html'] ?? $data['description'] ?? null;
                $data['description_html'] = $descHtml;
                if (! array_key_exists('description_json', $data)) {
                    $data['description_json'] = $descHtml ? ['html' => $descHtml] : null;
                }
            }

            $workItem->update($data);

            if (array_key_exists('assignee_ids', $data)) {
                $workItem->assignees()->sync($data['assignee_ids'] ?? []);
            }

            if (array_key_exists('label_ids', $data)) {
                $workItem->labels()->sync($data['label_ids'] ?? []);
            }

            if (array_key_exists('cycle_id', $data)) {
                if ($data['cycle_id']) {
                    $workItem->cycles()->sync([$data['cycle_id']]);
                } else {
                    $workItem->cycles()->detach();
                }
            }

            if (array_key_exists('module_id', $data)) {
                if ($data['module_id']) {
                    $workItem->modules()->sync([$data['module_id']]);
                } else {
                    $workItem->modules()->detach();
                }
            }

            if (array_key_exists('milestone_id', $data)) {
                if ($data['milestone_id']) {
                    $workItem->milestones()->sync([$data['milestone_id']]);
                } else {
                    $workItem->milestones()->detach();
                }
            }

            $action = 'UPDATED';
            $changes = $workItem->getChanges();

            if (isset($changes['state_id']) && $changes['state_id'] !== $originalStateId) {
                $action = 'STATE_CHANGED';
            }

            if (isset($changes['is_blocked'])) {
                $action = $workItem->is_blocked ? 'BLOCKED' : 'UNBLOCKED';
            }

            // Excluir description_json, description_html y updated_at del historial de actividades
            $relevantChanges = collect($changes)->except(['description_json', 'description_html', 'updated_at'])->all();

            if (! empty($relevantChanges)) {
                Activity::create([
                    'workspace_id' => $workItem->workspace_id,
                    'project_id' => $workItem->project_id,
                    'actor_id' => $user->id,
                    'entity_type' => 'WORK_ITEM',
                    'entity_id' => $workItem->id,
                    'action' => $action,
                    'changes_diff' => $relevantChanges,
                ]);
            }

            // Notificar impedimento si aplica
            if ($action === 'BLOCKED') {
                try {
                    $recipientIds = collect();
                    $projectLeadId = $workItem->project?->lead_id;
                    if ($projectLeadId) {
                        $recipientIds->push($projectLeadId);
                    } else {
                        // Fallback a los administradores del proyecto (Scrum Masters)
                        $adminIds = $workItem->project?->members()
                            ->wherePivot('role', 'ADMIN')
                            ->pluck('users.id')
                            ->all() ?? [];
                        $recipientIds = $recipientIds->merge($adminIds);
                    }

                    $recipientIds = $recipientIds
                        ->filter(fn ($id) => ! empty($id) && (int) $id !== (int) $user->id)
                        ->unique();

                    if ($recipientIds->isNotEmpty()) {
                        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
                        $workItemUrl = "{$frontendUrl}/projects/{$workItem->project_id}/work-items?selected={$workItem->id}";
                        $notificationService = app(NotificationService::class);
                        foreach ($recipientIds as $recipientId) {
                            $notificationService->sendNotification(
                                workspaceId: $workItem->workspace_id,
                                recipientId: $recipientId,
                                actorId: $user->id,
                                type: 'BLOCKER_REPORTED',
                                entityType: 'WORK_ITEM',
                                entityId: $workItem->id,
                                title: 'Impedimento reportado en tarea',
                                message: "{$user->name} reportó un impedimento en «{$workItem->title}»: ".($workItem->blocked_reason ?: 'Sin detalle'),
                                targetUrl: $workItemUrl
                            );
                        }
                    }
                } catch (Throwable $e) {
                    Log::warning('Error notificando impedimento: '.$e->getMessage());
                }
            }

            // Notificar cambio de estado si aplica (In-App y Job encolado)
            if ($action === 'STATE_CHANGED') {
                try {
                    $oldState = State::find($originalStateId);
                    $newState = $workItem->state ?? State::find($workItem->state_id);
                    $oldStateName = $oldState?->name ?? 'Anterior';
                    $newStateName = $newState?->name ?? 'Nuevo';

                    $subscribers = collect([$workItem->created_by, $workItem->lead_id])
                        ->merge($workItem->assignees->pluck('id'))
                        ->filter(fn ($id) => ! empty($id) && (int) $id !== (int) $user->id)
                        ->unique();

                    $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
                    $workItemUrl = "{$frontendUrl}/projects/{$workItem->project_id}/work-items?selected={$workItem->id}";
                    $notificationService = app(NotificationService::class);

                    foreach ($subscribers as $subId) {
                        $subUser = User::find($subId);
                        if ($subUser) {
                            $mailable = new WorkItemStatusChangedMail(
                                workItem: $workItem->loadMissing('project'),
                                oldStateName: $oldStateName,
                                newStateName: $newStateName,
                                actor: $user,
                                workItemUrl: $workItemUrl
                            );
                            $notificationService->sendNotification(
                                workspaceId: $workItem->workspace_id,
                                recipientId: $subId,
                                actorId: $user->id,
                                type: 'STATE_CHANGED',
                                entityType: 'WORK_ITEM',
                                entityId: $workItem->id,
                                title: 'Cambio de estado en tarea',
                                message: "{$user->name} cambió el estado de «{$workItem->title}» a «{$newStateName}».",
                                targetUrl: $workItemUrl,
                                mailable: $mailable
                            );
                        }
                    }
                } catch (Throwable $e) {
                    Log::warning('Error notificando cambio de estado: '.$e->getMessage());
                }
            }

            // Notificar nuevas asignaciones si aplica
            try {
                $newAssigneesToNotify = collect();
                if ($workItem->lead_id && (int) $workItem->lead_id !== (int) $originalLeadId && (int) $workItem->lead_id !== (int) $user->id) {
                    $newAssigneesToNotify->push($workItem->lead_id);
                }
                if (array_key_exists('assignee_ids', $data)) {
                    $currentAssigneeIds = $data['assignee_ids'] ?? [];
                    $freshlyAssigned = array_diff($currentAssigneeIds, $originalAssigneeIds);
                    foreach ($freshlyAssigned as $aId) {
                        if ((int) $aId !== (int) $user->id) {
                            $newAssigneesToNotify->push($aId);
                        }
                    }
                }

                if ($newAssigneesToNotify->isNotEmpty()) {
                    $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
                    $workItemUrl = "{$frontendUrl}/projects/{$workItem->project_id}/work-items?selected={$workItem->id}";
                    $notificationService = app(NotificationService::class);

                    foreach ($newAssigneesToNotify->unique() as $recipientId) {
                        $recipientUser = User::find($recipientId);
                        if ($recipientUser) {
                            $mailable = new WorkItemAssignedMail(
                                workItem: $workItem->loadMissing(['project', 'state']),
                                assignee: $recipientUser,
                                actor: $user,
                                workItemUrl: $workItemUrl
                            );
                            $notificationService->sendNotification(
                                workspaceId: $workItem->workspace_id,
                                recipientId: $recipientId,
                                actorId: $user->id,
                                type: 'ASSIGNMENT',
                                entityType: 'WORK_ITEM',
                                entityId: $workItem->id,
                                title: 'Nueva tarea asignada',
                                message: "{$user->name} te ha asignado la tarea «{$workItem->title}».",
                                targetUrl: $workItemUrl,
                                mailable: $mailable
                            );
                        }
                    }
                }
            } catch (Throwable $e) {
                Log::warning('Error notificando nuevas asignaciones: '.$e->getMessage());
            }

            if ($workItem->parent_id) {
                try {
                    app(WorkItemRollupService::class)->syncParentStatus($workItem);
                } catch (Throwable $e) {
                    Log::warning('Error en roll-up de work item: '.$e->getMessage());
                }
            }

            return $workItem->load(['state', 'type', 'assignees', 'labels', 'creator', 'lead', 'milestone', 'project', 'parent', 'subItems.state', 'subItems.lead', 'subItems.assignees', 'cycles', 'modules']);
        });
    }

    /**
     * Reordena un work item en la lista del backlog mediante ordenamiento fraccional.
     */
    public function reorder(Project $project, int $itemId, ?int $beforeId, ?int $afterId): WorkItem
    {
        $item = WorkItem::where('project_id', $project->id)->findOrFail($itemId);

        $beforeOrder = $beforeId ? WorkItem::where('project_id', $project->id)->find($beforeId)?->sort_order : null;
        $afterOrder = $afterId ? WorkItem::where('project_id', $project->id)->find($afterId)?->sort_order : null;

        $newOrder = match (true) {
            $beforeOrder !== null && $afterOrder !== null => ($beforeOrder + $afterOrder) / 2,
            $beforeOrder !== null => $beforeOrder + 1000.0,
            $afterOrder !== null => max(0.0, $afterOrder - 1000.0),
            default => 1000.0,
        };

        // Si la brecha es muy pequeña, renormalizar
        if ($beforeOrder !== null && $afterOrder !== null && abs($beforeOrder - $afterOrder) < 0.0001) {
            $allItems = WorkItem::where('project_id', $project->id)->orderBy('sort_order')->get();
            $counter = 1000.0;
            foreach ($allItems as $it) {
                if ($it->id === $item->id) {
                    continue;
                }
                $it->update(['sort_order' => $counter]);
                $counter += 1000.0;
            }
            $newOrder = ($beforeOrder + $afterOrder) / 2;
        }

        $item->update(['sort_order' => $newOrder]);

        return $item;
    }

    /**
     * Añade una relación de dependencia entre work items.
     */
    public function addRelation(WorkItem $source, int $targetId, string $relationType = 'RELATES_TO'): WorkItemRelation
    {
        return WorkItemRelation::create([
            'workspace_id' => $source->workspace_id,
            'source_id' => $source->id,
            'target_id' => $targetId,
            'relation_type' => $relationType,
        ]);
    }

    /**
     * Elimina una relación.
     */
    public function removeRelation(int $relationId): void
    {
        $relation = WorkItemRelation::findOrFail($relationId);
        $relation->delete();
    }

    /**
     * Elimina un work item.
     */
    public function delete(WorkItem $workItem): void
    {
        if (app()->has('current_workspace_id') && $workItem->workspace_id !== app('current_workspace_id')) {
            abort(404);
        }

        $workItem->delete();
    }
}

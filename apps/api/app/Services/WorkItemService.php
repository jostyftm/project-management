<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Project;
use App\Models\State;
use App\Models\WorkItem;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class WorkItemService
{
    /**
     * Lista work items pertenecientes a un proyecto.
     */
    public function list(Request $request, Project $project): Collection|AbstractPaginator
    {
        return (new WorkItem)->search(
            request: $request,
            relationships: ['state', 'assignees', 'labels', 'creator', 'project'],
            callback: function ($builder) use ($project) {
                $builder->where('project_id', $project->id);
            },
            filters: ['title', 'state_id', 'priority', 'is_draft'],
            sorts: ['created_at', 'sequence_id', 'priority', 'target_date']
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

        return $workItem->load(['state', 'assignees', 'labels', 'creator', 'project', 'parent', 'subItems']);
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

            $workItem = WorkItem::create([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'sequence_id' => $sequenceId,
                'title' => $data['title'],
                'description_json' => $data['description_json'] ?? null,
                'state_id' => $stateId,
                'priority' => $data['priority'] ?? 'NONE',
                'parent_id' => $data['parent_id'] ?? null,
                'estimate_points' => $data['estimate_points'] ?? null,
                'start_date' => $data['start_date'] ?? null,
                'target_date' => $data['target_date'] ?? null,
                'is_draft' => $data['is_draft'] ?? false,
                'created_by' => $user->id,
            ]);

            if (! empty($data['assignee_ids'])) {
                $workItem->assignees()->sync($data['assignee_ids']);
            }

            if (! empty($data['label_ids'])) {
                $workItem->labels()->sync($data['label_ids']);
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

            return $workItem->load(['state', 'assignees', 'labels', 'creator', 'project']);
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

        return DB::transaction(function () use ($data, $user, $workItem) {
            $originalStateId = $workItem->state_id;

            $workItem->update($data);

            if (array_key_exists('assignee_ids', $data)) {
                $workItem->assignees()->sync($data['assignee_ids'] ?? []);
            }

            if (array_key_exists('label_ids', $data)) {
                $workItem->labels()->sync($data['label_ids'] ?? []);
            }

            $action = 'UPDATED';
            $changes = $workItem->getChanges();

            if (isset($changes['state_id']) && $changes['state_id'] !== $originalStateId) {
                $action = 'STATE_CHANGED';
            }

            // Registrar auditoría de actualización
            Activity::create([
                'workspace_id' => $workItem->workspace_id,
                'project_id' => $workItem->project_id,
                'actor_id' => $user?->id,
                'entity_type' => 'WORK_ITEM',
                'entity_id' => $workItem->id,
                'action' => $action,
                'changes_diff' => $changes,
            ]);

            return $workItem->load(['state', 'assignees', 'labels', 'creator', 'project']);
        });
    }

    /**
     * Elimina el work item y registra auditoría.
     */
    public function delete(WorkItem $workItem, Request $request): void
    {
        if (app()->has('current_workspace_id') && $workItem->workspace_id !== app('current_workspace_id')) {
            abort(404);
        }

        $user = $request->user();

        Activity::create([
            'workspace_id' => $workItem->workspace_id,
            'project_id' => $workItem->project_id,
            'actor_id' => $user?->id,
            'entity_type' => 'WORK_ITEM',
            'entity_id' => $workItem->id,
            'action' => 'DELETED',
            'changes_diff' => ['title' => $workItem->title],
        ]);

        $workItem->delete();
    }
}

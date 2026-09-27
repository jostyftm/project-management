<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Project;
use App\Models\State;
use App\Models\WorkItem;
use App\Models\WorkItemRelation;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class WorkItemService
{
    /**
     * Lista los work items de un proyecto con filtros y ordenamientos.
     */
    public function list(Request $request, Project $project): Collection|AbstractPaginator
    {
        return (new WorkItem)->search(
            request: $request,
            relationships: ['state', 'type', 'assignees', 'labels', 'creator', 'lead', 'milestone', 'milestones', 'project', 'parent', 'subItems.state', 'cycles', 'modules'],
            callback: function ($builder) use ($project, $request) {
                $builder->where('project_id', $project->id);

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
            },
            filters: ['title', 'state_id', 'type_id', 'priority', 'is_draft', 'lead_id', 'milestone_id'],
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

            $workItem = WorkItem::create([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'sequence_id' => $sequenceId,
                'title' => $data['title'],
                'description_json' => $data['description_json'] ?? null,
                'state_id' => $stateId,
                'type_id' => $data['type_id'] ?? null,
                'priority' => $data['priority'] ?? 'NONE',
                'parent_id' => $data['parent_id'] ?? null,
                'lead_id' => $data['lead_id'] ?? null,
                'milestone_id' => $data['milestone_id'] ?? null,
                'estimate_points' => $data['estimate_points'] ?? null,
                'estimate_value' => $data['estimate_value'] ?? null,
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

        return DB::transaction(function () use ($data, $user, $workItem) {
            $originalStateId = $workItem->state_id;

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

            Activity::create([
                'workspace_id' => $workItem->workspace_id,
                'project_id' => $workItem->project_id,
                'actor_id' => $user->id,
                'entity_type' => 'WORK_ITEM',
                'entity_id' => $workItem->id,
                'action' => $action,
                'changes_diff' => $changes,
            ]);

            return $workItem->load(['state', 'type', 'assignees', 'labels', 'creator', 'lead', 'milestone', 'project', 'parent', 'subItems.state', 'cycles', 'modules']);
        });
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

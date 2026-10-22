<?php

namespace App\Services\Agile;

use App\Models\Activity;
use App\Models\State;
use App\Models\WorkItem;
use Illuminate\Support\Facades\Log;

class WorkItemRollupService
{
    /**
     * Aplica reglas automáticas de propagación de estado de hijos a padres (Roll-up).
     */
    public function syncParentStatus(WorkItem $childItem, int $depth = 0): void
    {
        if ($depth >= 5 || ! $childItem->parent_id) {
            return;
        }

        $parent = WorkItem::with(['project.states', 'subItems.state', 'dodItems'])->find($childItem->parent_id);
        if (! $parent || ! $parent->project || ! (bool) ($parent->project->auto_rollup_parent ?? true)) {
            return;
        }

        $projectStates = $parent->project->states;
        $parentGroup = strtoupper($parent->state?->group ?? 'BACKLOG');
        $childGroup = strtoupper($childItem->state?->group ?? '');

        // 1. REGLA: Si un hijo pasa a STARTED y el padre está en BACKLOG o UNSTARTED => Padre a STARTED
        if ($childGroup === 'STARTED' && in_array($parentGroup, ['BACKLOG', 'UNSTARTED'])) {
            $startedState = $projectStates->firstWhere('group', 'STARTED');
            if ($startedState && $startedState->id !== $parent->state_id) {
                $oldStateId = $parent->state_id;
                $parent->update([
                    'state_id' => $startedState->id,
                    'state_changed_at' => now(),
                    'completed_at' => null,
                ]);

                $this->recordRollupActivity($parent, $oldStateId, $startedState->id, 'Padre iniciado automáticamente al comenzar subtarea.');
                $this->syncParentStatus($parent, $depth + 1);

                return;
            }
        }

        // 2. REGLA: Si el padre estaba COMPLETED y un hijo se reabre (pasa a UNSTARTED o STARTED) => Padre vuelve a STARTED
        if (in_array($childGroup, ['UNSTARTED', 'STARTED']) && $parentGroup === 'COMPLETED') {
            $startedState = $projectStates->firstWhere('group', 'STARTED') ?? $projectStates->firstWhere('group', 'UNSTARTED');
            if ($startedState && $startedState->id !== $parent->state_id) {
                $oldStateId = $parent->state_id;
                $parent->update([
                    'state_id' => $startedState->id,
                    'state_changed_at' => now(),
                    'completed_at' => null,
                ]);

                $this->recordRollupActivity($parent, $oldStateId, $startedState->id, 'Padre reabierto automáticamente al reactivarse subtarea.');
                $this->syncParentStatus($parent, $depth + 1);

                return;
            }
        }

        // 3. REGLA: Si todos los hijos están cerrados (COMPLETED o CANCELLED)
        $allChildren = $parent->subItems;
        if ($allChildren->isNotEmpty()) {
            $allClosed = $allChildren->every(function ($sub) {
                $grp = strtoupper($sub->state?->group ?? '');

                return in_array($grp, ['COMPLETED', 'CANCELLED']);
            });

            $hasCompleted = $allChildren->some(function ($sub) {
                return strtoupper($sub->state?->group ?? '') === 'COMPLETED';
            });

            if ($allClosed && $hasCompleted && $parentGroup !== 'COMPLETED') {
                // Verificar si el padre tiene ítems de DoD pendientes
                $hasUnfinishedDod = $parent->dodItems->contains('is_completed', false);

                if (! $hasUnfinishedDod) {
                    $completedState = $projectStates->firstWhere('group', 'COMPLETED');
                    if ($completedState && $completedState->id !== $parent->state_id) {
                        $oldStateId = $parent->state_id;
                        $parent->update([
                            'state_id' => $completedState->id,
                            'state_changed_at' => now(),
                            'completed_at' => now(),
                        ]);

                        $this->recordRollupActivity($parent, $oldStateId, $completedState->id, 'Padre completado automáticamente al finalizar todas las subtareas y DoD.');
                        $this->syncParentStatus($parent, $depth + 1);
                    }
                } else {
                    Log::info("Roll-up: Subtareas de #{$parent->sequence_id} completas pero tiene DoD pendiente.");
                }
            }
        }
    }

    protected function recordRollupActivity(WorkItem $item, ?int $oldStateId, int $newStateId, string $note): void
    {
        try {
            $oldState = $oldStateId ? State::find($oldStateId) : null;
            $newState = State::find($newStateId);

            Activity::create([
                'workspace_id' => $item->workspace_id,
                'project_id' => $item->project_id,
                'actor_id' => auth()->id() ?? $item->created_by ?? 1,
                'entity_type' => 'WORK_ITEM',
                'entity_id' => $item->id,
                'action' => 'STATE_CHANGED',
                'changes_diff' => [
                    'state_from' => $oldState?->name,
                    'state_to' => $newState?->name,
                    'auto_rollup' => true,
                    'note' => $note,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::warning('Error registrando actividad de roll-up: '.$e->getMessage());
        }
    }
}

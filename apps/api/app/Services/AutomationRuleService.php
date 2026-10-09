<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\AutomationRule;
use App\Models\Project;
use App\Models\WorkItem;
use Illuminate\Support\Collection;

class AutomationRuleService
{
    /**
     * Lista las reglas de automatización de un proyecto.
     */
    public function listByProject(int $projectId): Collection
    {
        return AutomationRule::where('project_id', $projectId)
            ->latest()
            ->get();
    }

    /**
     * Crea una nueva regla de automatización.
     */
    public function create(Project $project, array $data): AutomationRule
    {
        return AutomationRule::create([
            'workspace_id' => $project->workspace_id,
            'project_id' => $project->id,
            'name' => $data['name'],
            'trigger_event' => $data['trigger_event'] ?? 'WORK_ITEM_CREATED',
            'trigger_conditions' => $data['trigger_conditions'] ?? [],
            'actions' => $data['actions'] ?? [],
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    /**
     * Evalúa y aplica una regla a un WorkItem específico o a un conjunto de items coincidentes.
     */
    public function evaluateAndExecute(AutomationRule $rule, ?WorkItem $workItem = null): int
    {
        if (! $rule->is_active) {
            return 0;
        }

        $items = $workItem ? collect([$workItem]) : $this->getMatchingItems($rule);
        $executedCount = 0;

        foreach ($items as $item) {
            if ($this->matchesConditions($rule->trigger_conditions ?? [], $item)) {
                $this->applyActions($rule->actions ?? [], $item, $rule);
                $executedCount++;
            }
        }

        if ($executedCount > 0) {
            $rule->update(['last_executed_at' => now()]);
        }

        return $executedCount;
    }

    /**
     * Evalúa las reglas programadas de temporizador (ej. tareas vencidas o inactivas).
     */
    public function runScheduledRules(?int $projectId = null): int
    {
        $query = AutomationRule::where('is_active', true)
            ->whereIn('trigger_event', ['DUE_DATE_PASSED', 'INACTIVITY_DAYS']);

        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        $rules = $query->get();
        $totalApplied = 0;

        foreach ($rules as $rule) {
            $totalApplied += $this->evaluateAndExecute($rule);
        }

        return $totalApplied;
    }

    /**
     * Comprueba si las condiciones de la regla se cumplen para el item.
     */
    private function matchesConditions(array $conditions, WorkItem $item): bool
    {
        if (isset($conditions['priority']) && $item->priority !== $conditions['priority']) {
            return false;
        }

        if (isset($conditions['state_id']) && (int) $item->state_id !== (int) $conditions['state_id']) {
            return false;
        }

        if (isset($conditions['type_id']) && (int) $item->type_id !== (int) $conditions['type_id']) {
            return false;
        }

        if (isset($conditions['is_overdue']) && $conditions['is_overdue']) {
            if (! $item->target_date || $item->target_date->isFuture()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Aplica las acciones configuradas sobre el item.
     */
    private function applyActions(array $actions, WorkItem $item, AutomationRule $rule): void
    {
        $updates = [];

        if (isset($actions['change_state_to'])) {
            $updates['state_id'] = $actions['change_state_to'];
        }

        if (isset($actions['set_priority'])) {
            $updates['priority'] = $actions['set_priority'];
        }

        if (isset($actions['assign_to_user'])) {
            $updates['lead_id'] = $actions['assign_to_user'];
            $item->assignees()->syncWithoutDetaching([$actions['assign_to_user']]);
        }

        if (! empty($updates)) {
            $item->update($updates);

            Activity::create([
                'workspace_id' => $item->workspace_id,
                'project_id' => $item->project_id,
                'entity_type' => 'WORK_ITEM',
                'entity_id' => $item->id,
                'action' => 'UPDATED',
                'field' => 'automation_rule',
                'new_value' => "Regla '{$rule->name}' ejecutada automáticamente.",
                'user_id' => $item->created_by,
            ]);
        }

        if (! empty($actions['add_labels']) && is_array($actions['add_labels'])) {
            $item->labels()->syncWithoutDetaching($actions['add_labels']);
        }
    }

    /**
     * Encuentra los items candidatos para reglas periódicas.
     */
    private function getMatchingItems(AutomationRule $rule): Collection
    {
        $query = WorkItem::where('project_id', $rule->project_id);

        if ($rule->trigger_event === 'DUE_DATE_PASSED') {
            $query->whereNotNull('target_date')
                ->where('target_date', '<', now());
        }

        return $query->get();
    }
}

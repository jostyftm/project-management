<?php

namespace App\Services;

use App\Models\Project;
use App\Models\RecurringWorkItem;
use App\Models\WorkItem;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class RecurringWorkItemService
{
    /**
     * Lista las plantillas de tareas recurrentes de un proyecto.
     */
    public function listByProject(int $projectId): Collection
    {
        return RecurringWorkItem::where('project_id', $projectId)
            ->with(['creator', 'project'])
            ->latest()
            ->get();
    }

    /**
     * Crea una nueva plantilla de tarea recurrente.
     */
    public function create(Project $project, array $data, int $userId): RecurringWorkItem
    {
        $frequency = $data['frequency'] ?? 'WEEKLY';
        $cron = $data['cron_expression'] ?? match ($frequency) {
            'DAILY' => '0 9 * * *',
            'MONTHLY' => '0 9 1 * *',
            default => '0 9 * * 1',
        };

        $nextRun = $this->calculateNextRun($frequency);

        return RecurringWorkItem::create([
            'workspace_id' => $project->workspace_id,
            'project_id' => $project->id,
            'work_item_template' => $data['work_item_template'] ?? [
                'title' => $data['title'] ?? 'Nueva tarea periódica',
                'priority' => $data['priority'] ?? 'MEDIUM',
                'state_id' => $data['state_id'] ?? null,
                'type_id' => $data['type_id'] ?? null,
            ],
            'frequency' => $frequency,
            'cron_expression' => $cron,
            'is_active' => $data['is_active'] ?? true,
            'next_run_at' => $nextRun,
            'created_by' => $userId,
        ]);
    }

    /**
     * Ejecuta inmediatamente una plantilla y genera el WorkItem correspondiente.
     */
    public function executeNow(RecurringWorkItem $recurring): WorkItem
    {
        $template = $recurring->work_item_template ?? [];
        $project = $recurring->project ?? Project::find($recurring->project_id);

        $lastSeq = WorkItem::where('project_id', $recurring->project_id)->max('sequence_id') ?? 0;
        $nextSeq = $lastSeq + 1;

        $stateId = $template['state_id'] ?? null;
        if (!$stateId && $project) {
            $stateId = $project->states()->where('is_default', true)->value('id')
                ?? $project->states()->value('id');
        }

        $typeId = $template['type_id'] ?? null;
        if (!$typeId && $project) {
            $typeId = $project->workItemTypes()->value('id');
        }

        $item = WorkItem::create([
            'workspace_id' => $recurring->workspace_id,
            'project_id' => $recurring->project_id,
            'sequence_id' => $nextSeq,
            'title' => $template['title'] ?? 'Tarea Periódica',
            'description_json' => !empty($template['description']) ? [
                'type' => 'doc',
                'content' => [
                    [
                        'type' => 'paragraph',
                        'content' => [['type' => 'text', 'text' => $template['description']]],
                    ],
                ],
            ] : null,
            'priority' => $template['priority'] ?? 'MEDIUM',
            'state_id' => $stateId,
            'type_id' => $typeId,
            'estimate_points' => $template['estimate_points'] ?? null,
            'lead_id' => $template['lead_id'] ?? null,
            'created_by' => $recurring->created_by,
            'is_draft' => false,
        ]);

        $recurring->update([
            'last_run_at' => now(),
            'next_run_at' => $this->calculateNextRun($recurring->frequency),
        ]);

        return $item;
    }

    /**
     * Procesa todas las tareas recurrentes vencidas.
     */
    public function runDueRecurringItems(): int
    {
        $dueItems = RecurringWorkItem::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('next_run_at')
                  ->orWhere('next_run_at', '<=', now());
            })
            ->with('project')
            ->get();

        $count = 0;
        foreach ($dueItems as $recurring) {
            $this->executeNow($recurring);
            $count++;
        }

        return $count;
    }

    /**
     * Calcula la fecha de la próxima ejecución.
     */
    private function calculateNextRun(string $frequency): Carbon
    {
        return match ($frequency) {
            'DAILY' => now()->addDay()->setHour(9)->setMinute(0)->setSecond(0),
            'MONTHLY' => now()->addMonth()->setDay(1)->setHour(9)->setMinute(0)->setSecond(0),
            default => now()->next(Carbon::MONDAY)->setHour(9)->setMinute(0)->setSecond(0),
        };
    }
}

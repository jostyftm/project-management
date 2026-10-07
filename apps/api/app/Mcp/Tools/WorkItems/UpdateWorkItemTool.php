<?php

namespace App\Mcp\Tools\WorkItems;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\State;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('update_work_item')]
#[Title('Actualizar Work Item')]
#[Description('Actualiza las propiedades de un work item: título, descripción, estado (state_id), prioridad, puntos de estimación, responsable, ciclo, módulo, hito o fecha objetivo.')]
class UpdateWorkItemTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'item' => $schema->string()
                ->description('Clave del ítem (ej: "ENG-101") o ID numérico.')
                ->required(),
            'project' => $schema->string()
                ->description('Opcional: ID o identificador del proyecto si se provee únicamente el sequence_id.'),
            'title' => $schema->string()
                ->description('Nuevo título de la tarea'),
            'description' => $schema->string()
                ->description('Nueva descripción o actualización de requerimientos'),
            'state_id' => $schema->integer()
                ->description('Nuevo ID de estado del flujo de trabajo'),
            'priority' => $schema->string()
                ->enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'])
                ->description('Nuevo nivel de prioridad'),
            'estimate_points' => $schema->number()
                ->description('Puntos de historia o estimación de esfuerzo'),
            'lead_id' => $schema->integer()
                ->description('ID del nuevo usuario responsable / asignado principal'),
            'cycle_id' => $schema->integer()
                ->description('Asignar a un ciclo / sprint específico'),
            'module_id' => $schema->integer()
                ->description('Asignar a un módulo específico'),
            'milestone_id' => $schema->integer()
                ->description('Asignar a un hito (milestone) específico'),
            'target_date' => $schema->string()
                ->description('Nueva fecha objetivo (formato YYYY-MM-DD)'),
        ];
    }

    public function handle(Request $request): Response
    {
        $itemKey = $request->get('item');
        $projectKey = $request->get('project');

        $project = $projectKey ? $this->resolveProject($request, $projectKey) : null;
        $workItem = $this->resolveWorkItem($request, $itemKey, $project);

        if (! $workItem) {
            return Response::error("Work item '{$itemKey}' no encontrado.");
        }

        DB::transaction(function () use ($request, $workItem) {
            $updates = [];

            if ($title = $request->get('title')) {
                $updates['title'] = $title;
            }

            if ($request->has('description')) {
                $descRaw = $request->get('description');
                $updates['description_json'] = $descRaw ? [
                    [
                        'id' => 'b1',
                        'type' => 'paragraph',
                        'content' => $descRaw,
                    ],
                ] : null;
            }

            if ($stateId = $request->get('state_id')) {
                $updates['state_id'] = $stateId;
                $state = State::find($stateId);
                if ($state && in_array(strtoupper($state->group), ['COMPLETED', 'CANCELLED'])) {
                    $updates['completed_at'] = now();
                } else {
                    $updates['completed_at'] = null;
                }
            }

            if ($priority = $request->get('priority')) {
                $updates['priority'] = strtoupper($priority);
            }

            if ($request->has('estimate_points')) {
                $updates['estimate_points'] = $request->get('estimate_points');
            }

            if ($request->has('lead_id')) {
                $updates['lead_id'] = $request->get('lead_id');
            }

            if ($request->has('milestone_id')) {
                $updates['milestone_id'] = $request->get('milestone_id');
                if ($milestoneId = $request->get('milestone_id')) {
                    $workItem->milestones()->syncWithoutDetaching([$milestoneId]);
                }
            }

            if ($request->has('target_date')) {
                $updates['target_date'] = $request->get('target_date');
            }

            if (! empty($updates)) {
                $workItem->update($updates);
            }

            if ($cycleId = $request->get('cycle_id')) {
                $workItem->cycles()->syncWithoutDetaching([$cycleId]);
            }

            if ($moduleId = $request->get('module_id')) {
                $workItem->modules()->syncWithoutDetaching([$moduleId]);
            }
        });

        $workItem->load(['state:id,name,group,color', 'lead:id,name,email', 'project:id,identifier']);

        return Response::text($this->formatJson([
            'message' => "Work item {$workItem->project?->identifier}-{$workItem->sequence_id} actualizado exitosamente.",
            'work_item' => [
                'id' => $workItem->id,
                'key' => "{$workItem->project?->identifier}-{$workItem->sequence_id}",
                'title' => $workItem->title,
                'priority' => $workItem->priority,
                'estimate_points' => $workItem->estimate_points,
                'target_date' => $workItem->target_date?->format('Y-m-d'),
                'state' => $workItem->state ? [
                    'id' => $workItem->state->id,
                    'name' => $workItem->state->name,
                    'group' => $workItem->state->group,
                ] : null,
                'lead' => $workItem->lead ? [
                    'id' => $workItem->lead->id,
                    'name' => $workItem->lead->name,
                ] : null,
            ],
        ]));
    }
}

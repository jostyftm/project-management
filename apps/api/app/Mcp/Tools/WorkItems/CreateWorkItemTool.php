<?php

namespace App\Mcp\Tools\WorkItems;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\State;
use App\Models\WorkItem;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('create_work_item')]
#[Title('Crear Work Item')]
#[Description('Crea una nueva tarea, historia de usuario, bug o épica en un proyecto. Asigna automáticamente el sequence_id correlativo, el estado inicial si se omite, y permite vincular ciclo, módulo, hito, prioridad y estimación.')]
class CreateWorkItemTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'title' => $schema->string()
                ->description('Título o resumen descriptivo de la tarea')
                ->required(),
            'description' => $schema->string()
                ->description('Descripción detallada o criterios de aceptación en HTML puro o Markdown'),
            'priority' => $schema->string()
                ->enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'])
                ->description('Nivel de prioridad (por defecto NONE)')
                ->default('NONE'),
            'state_id' => $schema->integer()
                ->description('ID del estado del flujo de trabajo (si se omite, se usa el estado por defecto del proyecto)'),
            'type_id' => $schema->integer()
                ->description('ID del tipo de ítem (Tarea, Historia, Bug, Épica)'),
            'estimate_points' => $schema->number()
                ->description('Puntos de historia o estimación de esfuerzo'),
            'cycle_id' => $schema->integer()
                ->description('ID del ciclo / sprint al que pertenecerá'),
            'module_id' => $schema->integer()
                ->description('ID del módulo al que pertenecerá'),
            'milestone_id' => $schema->integer()
                ->description('ID del hito (milestone) al que pertenecerá'),
            'lead_id' => $schema->integer()
                ->description('ID del usuario responsable / líder'),
            'target_date' => $schema->string()
                ->description('Fecha objetivo de culminación (formato YYYY-MM-DD)'),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::error("Proyecto '{$projectKey}' no encontrado.");
        }

        if ($authError = $this->authorizeProject($request, $project, requiredRole: 'MEMBER')) {
            return $authError;
        }

        $user = $this->resolveUser($request);

        $createdItem = DB::transaction(function () use ($request, $project, $user) {
            $maxSeq = WorkItem::withoutGlobalScopes()
                ->where('project_id', $project->id)
                ->max('sequence_id') ?? 0;
            $sequenceId = $maxSeq + 1;

            $stateId = $request->get('state_id');
            if (! $stateId) {
                $defaultState = State::where('project_id', $project->id)
                    ->where('is_default', true)
                    ->first()
                    ?? State::where('project_id', $project->id)->orderBy('sequence')->first();
                $stateId = $defaultState?->id;
            }

            $state = $stateId ? State::find($stateId) : null;
            $completedAt = ($state && in_array(strtoupper($state->group), ['COMPLETED', 'CANCELLED'])) ? now() : null;

            $descriptionRaw = $request->get('description');
            $descriptionHtml = null;
            if ($descriptionRaw) {
                $trimmed = trim($descriptionRaw);
                if (preg_match('/<[a-z][\s\S]*>/i', $trimmed)) {
                    $descriptionHtml = $trimmed;
                } else {
                    $descriptionHtml = Str::markdown($trimmed);
                }
            }

            $item = WorkItem::create([
                'workspace_id' => $project->workspace_id,
                'project_id' => $project->id,
                'sequence_id' => $sequenceId,
                'title' => $request->get('title'),
                'description_html' => $descriptionHtml,
                'description_json' => $descriptionHtml ? ['html' => $descriptionHtml] : null,
                'state_id' => $stateId,
                'type_id' => $request->get('type_id'),
                'priority' => strtoupper($request->get('priority', 'NONE')),
                'lead_id' => $request->get('lead_id'),
                'milestone_id' => $request->get('milestone_id'),
                'estimate_points' => $request->get('estimate_points'),
                'target_date' => $request->get('target_date'),
                'completed_at' => $completedAt,
                'created_by' => $user?->id,
            ]);

            if ($cycleId = $request->get('cycle_id')) {
                $item->cycles()->syncWithoutDetaching([$cycleId]);
            }

            if ($moduleId = $request->get('module_id')) {
                $item->modules()->syncWithoutDetaching([$moduleId]);
            }

            if ($milestoneId = $request->get('milestone_id')) {
                $item->milestones()->syncWithoutDetaching([$milestoneId]);
            }

            return $item;
        });

        $createdItem->load(['state:id,name,group,color', 'type:id,name', 'lead:id,name']);

        return Response::text($this->formatJson([
            'message' => 'Work item creado exitosamente.',
            'work_item' => [
                'id' => $createdItem->id,
                'key' => "{$project->identifier}-{$createdItem->sequence_id}",
                'sequence_id' => $createdItem->sequence_id,
                'title' => $createdItem->title,
                'priority' => $createdItem->priority,
                'estimate_points' => $createdItem->estimate_points,
                'target_date' => $createdItem->target_date?->format('Y-m-d'),
                'state' => $createdItem->state ? [
                    'id' => $createdItem->state->id,
                    'name' => $createdItem->state->name,
                    'group' => $createdItem->state->group,
                ] : null,
                'lead' => $createdItem->lead ? [
                    'id' => $createdItem->lead->id,
                    'name' => $createdItem->lead->name,
                ] : null,
            ],
        ]));
    }
}

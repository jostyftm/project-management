<?php

namespace App\Mcp\Tools\WorkItems;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\WorkItem;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('list_work_items')]
#[Title('Listar Work Items')]
#[Description('Consulta y filtra los ítems de trabajo (tareas, historias, bugs, épicas) de un proyecto con filtros por ciclo/sprint, módulo, hito, estado, prioridad o texto.')]
#[IsReadOnly]
class ListWorkItemsTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'query' => $schema->string()
                ->description('Filtro opcional por texto en el título del ítem'),
            'cycle_id' => $schema->integer()
                ->description('Filtrar por ID de ciclo / sprint'),
            'module_id' => $schema->integer()
                ->description('Filtrar por ID de módulo'),
            'milestone_id' => $schema->integer()
                ->description('Filtrar por ID de hito (milestone)'),
            'state_id' => $schema->integer()
                ->description('Filtrar por ID de estado'),
            'priority' => $schema->string()
                ->enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'])
                ->description('Filtrar por prioridad'),
            'limit' => $schema->integer()
                ->description('Cantidad máxima de resultados (por defecto 50)')
                ->default(50),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::error("Proyecto '{$projectKey}' no encontrado.");
        }

        $query = WorkItem::where('project_id', $project->id)
            ->with(['state:id,name,group,color', 'type:id,name,icon,color', 'lead:id,name,email', 'cycles:id,name,status', 'modules:id,name']);

        if ($search = $request->get('query')) {
            $query->where('title', 'like', "%{$search}%");
        }

        if ($cycleId = $request->get('cycle_id')) {
            $query->whereHas('cycles', fn ($q) => $q->where('cycles.id', $cycleId));
        }

        if ($moduleId = $request->get('module_id')) {
            $query->whereHas('modules', fn ($q) => $q->where('modules.id', $moduleId));
        }

        if ($milestoneId = $request->get('milestone_id')) {
            $query->where(function ($q) use ($milestoneId) {
                $q->where('milestone_id', $milestoneId)
                    ->orWhereHas('milestones', fn ($mq) => $mq->where('milestones.id', $milestoneId));
            });
        }

        if ($stateId = $request->get('state_id')) {
            $query->where('state_id', $stateId);
        }

        if ($priority = $request->get('priority')) {
            $query->where('priority', strtoupper($priority));
        }

        $limit = min(100, (int) ($request->get('limit') ?: 50));
        $items = $query->orderBy('sequence_id', 'desc')->take($limit)->get();

        $formatted = $items->map(function ($item) use ($project) {
            return [
                'id' => $item->id,
                'key' => "{$project->identifier}-{$item->sequence_id}",
                'sequence_id' => $item->sequence_id,
                'title' => $item->title,
                'priority' => $item->priority,
                'estimate_points' => $item->estimate_points,
                'state' => $item->state ? [
                    'id' => $item->state->id,
                    'name' => $item->state->name,
                    'group' => $item->state->group,
                ] : null,
                'type' => $item->type ? [
                    'id' => $item->type->id,
                    'name' => $item->type->name,
                ] : null,
                'lead' => $item->lead ? [
                    'id' => $item->lead->id,
                    'name' => $item->lead->name,
                ] : null,
                'cycles' => $item->cycles->pluck('name'),
                'modules' => $item->modules->pluck('name'),
                'target_date' => $item->target_date?->format('Y-m-d'),
                'created_at' => $item->created_at?->toIso8601String(),
            ];
        });

        return Response::text($this->formatJson([
            'project' => [
                'id' => $project->id,
                'identifier' => $project->identifier,
                'name' => $project->name,
            ],
            'total_retrieved' => $formatted->count(),
            'work_items' => $formatted,
        ]));
    }
}

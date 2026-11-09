<?php

namespace App\Mcp\Tools\WorkItems;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Services\WorkItemDeliverableService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('create_work_item_dod_item')]
#[Title('Crear Criterio DoD / Aceptación')]
#[Description('Añade un criterio de aceptación o Definition of Done (DoD) a un Work Item (tarea, historia de usuario o bug).')]
class CreateWorkItemDodItemTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'item' => $schema->string()
                ->description('Clave del ítem (ej: "ENG-101") o ID numérico.')
                ->required(),
            'title' => $schema->string()
                ->description('Título o descripción del criterio de aceptación / Definition of Done (ej: "Cobertura de pruebas unitarias superior al 90%")')
                ->required(),
            'project' => $schema->string()
                ->description('Opcional: ID o identificador del proyecto si se provee únicamente el sequence_id.'),
        ];
    }

    public function handle(Request $request): Response
    {
        $itemKey = $request->get('item');
        $projectKey = $request->get('project');
        $title = trim((string) $request->get('title'));

        if (empty($title)) {
            return Response::error('El título o descripción del criterio de aceptación no puede estar vacío.');
        }

        $project = $projectKey ? $this->resolveProject($request, $projectKey) : null;
        $workItem = $this->resolveWorkItem($request, $itemKey, $project);

        if (! $workItem) {
            return Response::error("Work item '{$itemKey}' no encontrado.");
        }

        if ($authError = $this->authorizeProject($request, $workItem->project, requiredRole: 'MEMBER')) {
            return $authError;
        }

        $deliverableService = app(WorkItemDeliverableService::class);
        $dodItem = $deliverableService->createDodItem($workItem, $workItem->project, [
            'title' => $title,
        ]);

        return Response::text($this->formatJson([
            'message' => 'Criterio de aceptación (DoD) creado exitosamente.',
            'dod_item' => [
                'id' => $dodItem->id,
                'work_item_id' => $dodItem->work_item_id,
                'work_item_key' => $workItem->project ? "{$workItem->project->identifier}-{$workItem->sequence_id}" : (string) $workItem->sequence_id,
                'title' => $dodItem->title,
                'is_completed' => (bool) $dodItem->is_completed,
                'created_at' => $dodItem->created_at?->toIso8601String(),
            ],
        ]));
    }
}

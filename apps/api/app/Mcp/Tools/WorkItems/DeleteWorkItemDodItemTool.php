<?php

namespace App\Mcp\Tools\WorkItems;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\WorkItemDodItem;
use App\Services\WorkItemDeliverableService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('delete_work_item_dod_item')]
#[Title('Eliminar Criterio DoD / Aceptación')]
#[Description('Elimina un criterio de aceptación o Definition of Done (DoD) de un Work Item.')]
class DeleteWorkItemDodItemTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'item' => $schema->string()
                ->description('Clave del ítem (ej: "ENG-101") o ID numérico.')
                ->required(),
            'dod_item_id' => $schema->integer()
                ->description('ID numérico del criterio DoD a eliminar.')
                ->required(),
            'project' => $schema->string()
                ->description('Opcional: ID o identificador del proyecto si se provee únicamente el sequence_id.'),
        ];
    }

    public function handle(Request $request): Response
    {
        $itemKey = $request->get('item');
        $dodItemId = $request->get('dod_item_id');
        $projectKey = $request->get('project');

        $project = $projectKey ? $this->resolveProject($request, $projectKey) : null;
        $workItem = $this->resolveWorkItem($request, $itemKey, $project);

        if (! $workItem) {
            return Response::error("Work item '{$itemKey}' no encontrado.");
        }

        if ($authError = $this->authorizeProject($request, $workItem->project, requiredRole: 'MEMBER')) {
            return $authError;
        }

        $dodItem = WorkItemDodItem::where('work_item_id', $workItem->id)->find($dodItemId);
        if (! $dodItem) {
            return Response::error("Criterio DoD con ID {$dodItemId} no encontrado en este Work Item.");
        }

        $deliverableService = app(WorkItemDeliverableService::class);
        $deliverableService->deleteDodItem($workItem, $workItem->project, $dodItem);

        return Response::text($this->formatJson([
            'message' => 'Criterio de aceptación (DoD) eliminado exitosamente.',
            'dod_item_id' => (int) $dodItemId,
            'work_item_id' => $workItem->id,
        ]));
    }
}

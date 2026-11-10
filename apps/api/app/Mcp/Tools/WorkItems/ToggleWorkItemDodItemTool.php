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

#[Name('toggle_work_item_dod_item')]
#[Title('Alternar Criterio DoD / Aceptación')]
#[Description('Alterna el estado completado/pendiente de un criterio de aceptación o Definition of Done (DoD) de un Work Item.')]
class ToggleWorkItemDodItemTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'item' => $schema->string()
                ->description('Clave del ítem (ej: "ENG-101") o ID numérico.')
                ->required(),
            'dod_item_id' => $schema->integer()
                ->description('ID numérico del criterio DoD a alternar.')
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

        $user = $this->resolveUser($request);
        if (! $user) {
            return Response::error('Usuario no autenticado o no encontrado.');
        }

        $dodItem = WorkItemDodItem::where('work_item_id', $workItem->id)->find($dodItemId);
        if (! $dodItem) {
            return Response::error("Criterio DoD con ID {$dodItemId} no encontrado en este Work Item.");
        }

        $deliverableService = app(WorkItemDeliverableService::class);
        $updatedDod = $deliverableService->toggleDodItem($workItem, $workItem->project, $dodItem, $user);

        return Response::text($this->formatJson([
            'message' => $updatedDod->is_completed
                ? 'Criterio de aceptación marcado como completado.'
                : 'Criterio de aceptación marcado como pendiente.',
            'dod_item' => [
                'id' => $updatedDod->id,
                'work_item_id' => $updatedDod->work_item_id,
                'title' => $updatedDod->title,
                'is_completed' => (bool) $updatedDod->is_completed,
                'completed_by' => $updatedDod->completedBy ? [
                    'id' => $updatedDod->completedBy->id,
                    'name' => $updatedDod->completedBy->name,
                ] : null,
                'completed_at' => $updatedDod->completed_at?->toIso8601String(),
            ],
        ]));
    }
}

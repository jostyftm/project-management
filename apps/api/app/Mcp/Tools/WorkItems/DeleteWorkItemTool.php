<?php

namespace App\Mcp\Tools\WorkItems;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;

#[Name('delete_work_item')]
#[Title('Eliminar Work Item')]
#[Description('Elimina un work item (tarea, historia o bug) de un proyecto de forma definitiva.')]
#[IsDestructive]
class DeleteWorkItemTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'item' => $schema->string()
                ->description('Clave del ítem (ej: "ENG-101") o ID numérico a eliminar.')
                ->required(),
            'project' => $schema->string()
                ->description('Opcional: ID numérico o identificador del proyecto si se provee únicamente el sequence_id.'),
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

        $workItemKey = ($workItem->project ? $workItem->project->identifier : '')."-{$workItem->sequence_id}";
        $title = $workItem->title;

        $workItem->delete();

        return Response::text($this->formatJson([
            'message' => "Work item {$workItemKey} («{$title}») eliminado correctamente.",
            'success' => true,
        ]));
    }
}

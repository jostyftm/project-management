<?php

namespace App\Mcp\Tools\Workflow;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Label;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('list_project_labels')]
#[Title('Listar Etiquetas del Proyecto')]
#[Description('Lista las etiquetas (labels/tags) disponibles en un proyecto con sus colores y descripciones para clasificar tareas e historias.')]
#[IsReadOnly]
class ListProjectLabelsTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::error("Proyecto '{$projectKey}' no encontrado.");
        }

        $labels = Label::where('project_id', $project->id)
            ->orderBy('name')
            ->get();

        $formatted = $labels->map(function ($l) {
            return [
                'id' => $l->id,
                'name' => $l->name,
                'color' => $l->color,
                'description' => $l->description,
                'work_items_count' => $l->workItems()->count(),
            ];
        });

        return Response::text($this->formatJson([
            'project' => [
                'id' => $project->id,
                'identifier' => $project->identifier,
                'name' => $project->name,
            ],
            'total_labels' => $formatted->count(),
            'labels' => $formatted,
        ]));
    }
}

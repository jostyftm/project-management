<?php

namespace App\Mcp\Tools\Workflow;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\State;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('list_project_states')]
#[Title('Listar Estados del Proyecto')]
#[Description('Lista los estados del flujo de trabajo configurados en un proyecto, ordenados por secuencia con sus grupos canónicos (BACKLOG, UNSTARTED, STARTED, COMPLETED, CANCELLED) para saber qué state_id asignar.')]
#[IsReadOnly]
class ListProjectStatesTool extends Tool
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

        if ($authError = $this->authorizeProject($request, $project)) {
            return $authError;
        }

        $states = State::where('project_id', $project->id)
            ->orderBy('sequence')
            ->get();

        $formatted = $states->map(function ($s) {
            return [
                'id' => $s->id,
                'name' => $s->name,
                'group' => $s->group,
                'color' => $s->color,
                'sequence' => $s->sequence,
                'is_default' => (bool) $s->is_default,
                'work_items_count' => $s->workItems()->count(),
            ];
        });

        return Response::text($this->formatJson([
            'project' => [
                'id' => $project->id,
                'identifier' => $project->identifier,
                'name' => $project->name,
            ],
            'total_states' => $formatted->count(),
            'states' => $formatted,
        ]));
    }
}

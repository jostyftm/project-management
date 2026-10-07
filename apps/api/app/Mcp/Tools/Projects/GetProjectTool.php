<?php

namespace App\Mcp\Tools\Projects;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('get_project')]
#[Title('Obtener Detalle del Proyecto')]
#[Description('Obtiene la información completa de un proyecto mediante su ID numérico o identificador de prefijo (ej: "ENG" o 1), incluyendo sus estados, etiquetas y miembros.')]
#[IsReadOnly]
class GetProjectTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG", "FIN", 1).')
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

        $project->load([
            'lead:id,name,email',
            'states' => fn ($q) => $q->orderBy('sequence'),
            'labels',
            'members:id,name,email',
        ]);

        return Response::text($this->formatJson([
            'id' => $project->id,
            'name' => $project->name,
            'identifier' => $project->identifier,
            'description' => $project->description,
            'lead' => $project->lead ? [
                'id' => $project->lead->id,
                'name' => $project->lead->name,
                'email' => $project->lead->email,
            ] : null,
            'estimate_system' => $project->estimate_system,
            'states' => $project->states->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'group' => $s->group,
                'color' => $s->color,
                'is_default' => (bool) $s->is_default,
            ]),
            'labels' => $project->labels->map(fn ($l) => [
                'id' => $l->id,
                'name' => $l->name,
                'color' => $l->color,
            ]),
            'members' => $project->members->map(fn ($u) => [
                'user_id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->pivot?->role,
            ]),
            'counts' => [
                'work_items' => $project->workItems()->count(),
                'cycles' => $project->cycles()->count(),
                'modules' => $project->modules()->count(),
            ],
        ]));
    }
}

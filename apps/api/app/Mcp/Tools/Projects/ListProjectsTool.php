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

#[Name('list_projects')]
#[Title('Listar Proyectos')]
#[Description('Lista todos los proyectos del workspace activo o filtrados por búsqueda, con sus identificadores, líderes y conteo de tareas.')]
#[IsReadOnly]
class ListProjectsTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'workspace_id' => $schema->integer()
                ->description('ID opcional del workspace. Si se omite, se utiliza el workspace activo.'),
            'query' => $schema->string()
                ->description('Término de búsqueda opcional por nombre o identificador del proyecto.'),
        ];
    }

    public function handle(Request $request): Response
    {
        $workspace = $this->resolveWorkspace($request, $request->get('workspace_id'));

        if (! $workspace) {
            return Response::error('No se pudo determinar el workspace activo.');
        }

        $query = $this->resolveProjectsQuery($request, $workspace)
            ->with(['lead:id,name,email'])
            ->withCount(['workItems', 'cycles', 'modules', 'members']);

        if ($search = $request->get('query')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('identifier', 'like', "%{$search}%");
            });
        }

        $projects = $query->orderBy('name')->get()->map(function ($project) {
            return [
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
                'work_items_count' => $project->work_items_count,
                'cycles_count' => $project->cycles_count,
                'modules_count' => $project->modules_count,
                'members_count' => $project->members_count,
            ];
        });

        return Response::text($this->formatJson([
            'workspace' => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
            ],
            'total_projects' => $projects->count(),
            'projects' => $projects,
        ]));
    }
}

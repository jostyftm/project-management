<?php

namespace App\Mcp\Resources;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Project;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Attributes\Uri;
use Laravel\Mcp\Server\Resource;

#[Name('project_list')]
#[Title('Catálogo de Proyectos')]
#[Uri('projects://list')]
#[MimeType('application/json')]
#[Description('Catálogo completo de proyectos activos en el workspace con sus identificadores, nombres y estadísticas.')]
class ProjectListResource extends Resource
{
    use ResolvesWorkspaceContext;

    public function handle(Request $request): Response
    {
        $this->resolveWorkspace($request);

        $projects = Project::with(['lead:id,name,email'])
            ->withCount(['workItems', 'cycles', 'modules'])
            ->get();

        $data = $projects->map(fn ($p) => [
            'id' => $p->id,
            'identifier' => $p->identifier,
            'name' => $p->name,
            'description' => $p->description,
            'lead' => $p->lead?->name,
            'estimate_system' => $p->estimate_system,
            'counts' => [
                'work_items' => $p->work_items_count,
                'cycles' => $p->cycles_count,
                'modules' => $p->modules_count,
            ],
        ]);

        return Response::text($this->formatJson([
            'projects' => $data,
        ]));
    }
}

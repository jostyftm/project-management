<?php

namespace App\Mcp\Tools\Releases;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Release;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('list_releases')]
#[Title('Listar Versiones / Releases')]
#[Description('Lista las versiones o releases programadas y publicadas de un proyecto con sus números de versión SemVer y estado.')]
#[IsReadOnly]
class ListReleasesTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'status' => $schema->string()
                ->enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
                ->description('Filtro opcional por estado de la versión'),
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

        $query = Release::where('project_id', $project->id)
            ->with(['creator:id,name,email'])
            ->withCount(['workItems as total_items']);

        if ($status = $request->get('status')) {
            $query->where('status', strtoupper($status));
        }

        $releases = $query->orderBy('created_at', 'desc')->get();

        $formatted = $releases->map(function ($r) {
            return [
                'id' => $r->id,
                'name' => $r->name,
                'version' => $r->version,
                'description' => $r->description,
                'status' => $r->status,
                'published_at' => $r->published_at?->toIso8601String(),
                'total_items' => $r->total_items,
                'creator' => $r->creator ? [
                    'id' => $r->creator->id,
                    'name' => $r->creator->name,
                ] : null,
            ];
        });

        return Response::text($this->formatJson([
            'project' => [
                'id' => $project->id,
                'identifier' => $project->identifier,
                'name' => $project->name,
            ],
            'total_retrieved' => $formatted->count(),
            'releases' => $formatted,
        ]));
    }
}

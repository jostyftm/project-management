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

#[Name('get_release')]
#[Title('Obtener Detalle de la Versión / Release')]
#[Description('Consulta el detalle completo de una versión de software por ID, incluyendo notas de la versión (changelog) y tareas asociadas.')]
#[IsReadOnly]
class GetReleaseTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'release_id' => $schema->integer()
                ->description('ID numérico de la versión / release')
                ->required(),
        ];
    }

    public function handle(Request $request): Response
    {
        $releaseId = (int) $request->get('release_id');
        $release = Release::with(['project', 'creator:id,name,email', 'workItems' => function ($q) {
            $q->with(['state:id,name,group,color', 'lead:id,name'])->orderBy('sequence_id');
        }])->find($releaseId);

        if (! $release) {
            return Response::error("Versión con ID '{$releaseId}' no encontrada.");
        }

        $this->resolveWorkspace($request, explicitWorkspaceId: $release->workspace_id);

        $project = $release->project;

        return Response::text($this->formatJson([
            'id' => $release->id,
            'name' => $release->name,
            'version' => $release->version,
            'description' => $release->description,
            'changelog' => $release->changelog,
            'status' => $release->status,
            'published_at' => $release->published_at?->toIso8601String(),
            'project' => $project ? [
                'id' => $project->id,
                'identifier' => $project->identifier,
                'name' => $project->name,
            ] : null,
            'creator' => $release->creator ? [
                'id' => $release->creator->id,
                'name' => $release->creator->name,
            ] : null,
            'work_items' => $release->workItems->map(fn ($item) => [
                'id' => $item->id,
                'key' => $project ? "{$project->identifier}-{$item->sequence_id}" : (string) $item->sequence_id,
                'title' => $item->title,
                'state' => $item->state ? [
                    'id' => $item->state->id,
                    'name' => $item->state->name,
                    'group' => $item->state->group,
                ] : null,
            ]),
        ]));
    }
}

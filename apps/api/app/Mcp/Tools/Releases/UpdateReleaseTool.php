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

#[Name('update_release')]
#[Title('Actualizar Versión / Release')]
#[Description('Actualiza una versión existente: cambia su estado (ej: publicar como PUBLISHED), ajusta notas de la versión o su nombre.')]
class UpdateReleaseTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'release_id' => $schema->integer()
                ->description('ID numérico de la versión / release')
                ->required(),
            'name' => $schema->string()
                ->description('Nuevo nombre descriptivo'),
            'version' => $schema->string()
                ->description('Nuevo identificador SemVer'),
            'description' => $schema->string()
                ->description('Nueva descripción'),
            'changelog' => $schema->string()
                ->description('Nuevo contenido de notas de versión (changelog) en Markdown'),
            'status' => $schema->string()
                ->enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
                ->description('Nuevo estado de la versión'),
        ];
    }

    public function handle(Request $request): Response
    {
        $releaseId = (int) $request->get('release_id');
        $release = Release::find($releaseId);

        if (! $release) {
            return Response::error("Versión con ID '{$releaseId}' no encontrada.");
        }

        $this->resolveWorkspace($request, explicitWorkspaceId: $release->workspace_id);

        $updates = [];
        if ($name = $request->get('name')) {
            $updates['name'] = $name;
        }
        if ($version = $request->get('version')) {
            $updates['version'] = $version;
        }
        if ($request->has('description')) {
            $updates['description'] = $request->get('description');
        }
        if ($request->has('changelog')) {
            $updates['changelog'] = $request->get('changelog');
        }
        if ($status = $request->get('status')) {
            $updates['status'] = strtoupper($status);
            if ($updates['status'] === 'PUBLISHED' && ! $release->published_at) {
                $updates['published_at'] = now();
            }
        }

        if (! empty($updates)) {
            $release->update($updates);
        }

        return Response::text($this->formatJson([
            'message' => "Versión '{$release->version}' actualizada exitosamente.",
            'release' => [
                'id' => $release->id,
                'version' => $release->version,
                'name' => $release->name,
                'status' => $release->status,
                'published_at' => $release->published_at?->toIso8601String(),
            ],
        ]));
    }
}

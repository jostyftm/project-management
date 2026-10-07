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

#[Name('create_release')]
#[Title('Crear Versión / Release')]
#[Description('Registra una nueva versión de software (release) en un proyecto especificando número SemVer, nombre, notas y estado.')]
class CreateReleaseTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'version' => $schema->string()
                ->description('Número o identificador semántico de versión (ej: "v1.0.0", "v2.1.0-beta")')
                ->required(),
            'name' => $schema->string()
                ->description('Nombre descriptivo del lanzamiento (ej: "Lanzamiento General v1.0")')
                ->required(),
            'description' => $schema->string()
                ->description('Resumen ejecutivo de la versión'),
            'changelog' => $schema->string()
                ->description('Notas completas de la versión / registro de cambios en Markdown'),
            'status' => $schema->string()
                ->enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
                ->description('Estado de la versión (por defecto DRAFT)')
                ->default('DRAFT'),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::error("Proyecto '{$projectKey}' no encontrado.");
        }

        if ($authError = $this->authorizeProject($request, $project, requiredRole: 'ADMIN')) {
            return $authError;
        }

        $user = $this->resolveUser($request);
        $status = strtoupper($request->get('status', 'DRAFT'));

        $release = Release::create([
            'workspace_id' => $project->workspace_id,
            'project_id' => $project->id,
            'name' => $request->get('name'),
            'version' => $request->get('version'),
            'description' => $request->get('description'),
            'changelog' => $request->get('changelog'),
            'status' => $status,
            'published_at' => $status === 'PUBLISHED' ? now() : null,
            'created_by' => $user?->id,
        ]);

        return Response::text($this->formatJson([
            'message' => 'Versión / release creada exitosamente.',
            'release' => [
                'id' => $release->id,
                'version' => $release->version,
                'name' => $release->name,
                'status' => $release->status,
                'project_id' => $release->project_id,
            ],
        ]));
    }
}

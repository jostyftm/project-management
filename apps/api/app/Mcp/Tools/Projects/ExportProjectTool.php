<?php

namespace App\Mcp\Tools\Projects;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Services\ProjectExportService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('export_project')]
#[Title('Exportar Proyecto Completo a JSON')]
#[Description('Exporta la totalidad de la estructura de un proyecto (metadatos, estados, etiquetas, módulos, ciclos, tareas, DoD y relaciones) en formato JSON canónico.')]
#[IsReadOnly]
class ExportProjectTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o clave de prefijo (ej: "ENG" o 1).')
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

        $exporter = app(ProjectExportService::class);
        $data = $exporter->export($project);

        return Response::text($this->formatJson($data));
    }
}

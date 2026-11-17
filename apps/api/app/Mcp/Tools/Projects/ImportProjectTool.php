<?php

namespace App\Mcp\Tools\Projects;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Services\ProjectImportService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('import_project')]
#[Title('Importar Proyecto desde JSON')]
#[Description('Importa un proyecto completo desde una cadena JSON o archivo hacia un Workspace, recreando catálogos, sprints, módulos, tareas y dependencias.')]
class ImportProjectTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'json_content' => $schema->string()
                ->description('Contenido JSON estructurado del proyecto a importar.'),
            'file_path' => $schema->string()
                ->description('Ruta absoluta o relativa a un archivo .json con los datos del proyecto.'),
            'workspace' => $schema->string()
                ->description('Slug o ID numérico del workspace objetivo (opcional, usa el workspace activo por defecto).'),
            'name' => $schema->string()
                ->description('Nombre personalizado para sobrescribir el del archivo importado (opcional).'),
            'identifier' => $schema->string()
                ->description('Clave de prefijo personalizada (ej: "ENG") para el proyecto (opcional).'),
            'force' => $schema->boolean()
                ->description('Si es true, elimina y recrea el proyecto si la clave ya existe (por defecto false).'),
        ];
    }

    public function handle(Request $request): Response
    {
        $workspace = $this->resolveWorkspace(
            $request,
            explicitWorkspaceId: $request->get('workspace'),
            explicitWorkspaceSlug: $request->get('workspace')
        );

        if (! $workspace) {
            return Response::error('No se pudo resolver el workspace de destino.');
        }

        $actor = $this->resolveUser($request);
        if (! $actor) {
            return Response::error('No se pudo identificar un usuario para ejecutar la importación.');
        }

        // Obtener datos JSON
        $data = null;
        if ($filePath = $request->get('file_path')) {
            if (! file_exists($filePath) || ! is_readable($filePath)) {
                return Response::error("El archivo '{$filePath}' no existe o no tiene permisos de lectura.");
            }
            $data = json_decode(file_get_contents($filePath), true);
        } elseif ($jsonContent = $request->get('json_content')) {
            $data = json_decode($jsonContent, true);
        }

        if (empty($data) || ! is_array($data)) {
            return Response::error('Se requiere proporcionar "json_content" válido o un "file_path" accesible.');
        }

        $options = [
            'name' => $request->get('name'),
            'identifier' => $request->get('identifier'),
            'force' => (bool) $request->get('force'),
        ];

        try {
            $importer = app(ProjectImportService::class);
            $result = $importer->import(
                data: $data,
                workspace: $workspace,
                actor: $actor,
                options: $options
            );

            return Response::text($this->formatJson($result));
        } catch (\Throwable $e) {
            return Response::error("Error durante la importación del proyecto: {$e->getMessage()}");
        }
    }
}

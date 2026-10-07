<?php

namespace App\Mcp\Tools\Projects;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Services\ProjectService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;

#[Name('delete_project')]
#[Title('Eliminar Proyecto')]
#[Description('Elimina un proyecto y todas sus dependencias (ciclos, tareas, entregables, módulos y páginas). Requiere confirmación explícita escribiendo el identificador del proyecto.')]
#[IsDestructive]
class DeleteProjectTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'confirm_identifier' => $schema->string()
                ->description('Identificador del proyecto como confirmación de seguridad para proceder con el borrado.')
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

        if ($authError = $this->authorizeProject($request, $project, requiredRole: 'ADMIN')) {
            return $authError;
        }

        $confirmation = strtoupper(trim((string) $request->get('confirm_identifier')));
        if ($confirmation !== $project->identifier) {
            return Response::error("Confirmación incorrecta. Debe escribir exactamente '{$project->identifier}' para proceder.");
        }

        $projectName = $project->name;
        $projectIdentifier = $project->identifier;

        (new ProjectService)->delete($project);

        return Response::text($this->formatJson([
            'message' => "Proyecto '{$projectName}' ({$projectIdentifier}) y todas sus entidades asociadas han sido eliminados de forma definitiva.",
            'success' => true,
        ]));
    }
}

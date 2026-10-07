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

#[Name('update_project')]
#[Title('Actualizar Proyecto')]
#[Description('Actualiza los atributos de un proyecto existente (nombre, descripción, sistema de estimación o líder).')]
class UpdateProjectTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'name' => $schema->string()
                ->description('Nuevo nombre del proyecto'),
            'description' => $schema->string()
                ->description('Nueva descripción del proyecto'),
            'estimate_system' => $schema->string()
                ->enum(['FIBONACCI', 'TSHIRT', 'NUMERIC', 'NONE'])
                ->description('Nuevo sistema de estimación'),
            'lead_id' => $schema->integer()
                ->description('ID del nuevo usuario líder del proyecto'),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::error("Proyecto '{$projectKey}' no encontrado.");
        }

        $data = [];
        if ($request->has('name')) {
            $data['name'] = trim((string) $request->get('name'));
        }
        if ($request->has('description')) {
            $data['description'] = $request->get('description');
        }
        if ($request->has('estimate_system')) {
            $data['estimate_system'] = $request->get('estimate_system');
        }
        if ($request->has('lead_id')) {
            $data['lead_id'] = $request->get('lead_id');
        }

        if (empty($data)) {
            return Response::error('No se proporcionaron atributos para actualizar.');
        }

        $project->update($data);

        return Response::text($this->formatJson([
            'message' => "Proyecto '{$project->name}' actualizado correctamente.",
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'identifier' => $project->identifier,
                'description' => $project->description,
                'estimate_system' => $project->estimate_system,
            ],
        ]));
    }
}

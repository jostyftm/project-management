<?php

namespace App\Mcp\Tools\Milestones;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Milestone;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('create_milestone')]
#[Title('Crear Hito (Milestone)')]
#[Description('Crea un nuevo hito estratégico en un proyecto indicando su título, alcance y fecha objetivo de cumplimiento.')]
class CreateMilestoneTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'title' => $schema->string()
                ->description('Título del hito (ej: "Lanzamiento Beta v1.0")')
                ->required(),
            'description' => $schema->string()
                ->description('Descripción de los criterios o entregables del hito'),
            'target_date' => $schema->string()
                ->description('Fecha objetivo de cumplimiento (YYYY-MM-DD)'),
            'status' => $schema->string()
                ->enum(['OPEN', 'COMPLETED', 'CANCELLED'])
                ->description('Estado inicial (por defecto OPEN)')
                ->default('OPEN'),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::error("Proyecto '{$projectKey}' no encontrado.");
        }

        $milestone = Milestone::create([
            'workspace_id' => $project->workspace_id,
            'project_id' => $project->id,
            'title' => $request->get('title'),
            'description' => $request->get('description'),
            'target_date' => $request->get('target_date'),
            'status' => strtoupper($request->get('status', 'OPEN')),
        ]);

        return Response::text($this->formatJson([
            'message' => 'Hito creado exitosamente.',
            'milestone' => [
                'id' => $milestone->id,
                'title' => $milestone->title,
                'status' => $milestone->status,
                'target_date' => $milestone->target_date?->format('Y-m-d'),
                'project_id' => $milestone->project_id,
            ],
        ]));
    }
}

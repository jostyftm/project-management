<?php

namespace App\Mcp\Tools\Cycles;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Cycle;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('create_cycle')]
#[Title('Crear Ciclo / Sprint')]
#[Description('Crea un nuevo ciclo de trabajo (sprint) en un proyecto especificando nombre, fechas estimadas de inicio/fin y estado.')]
class CreateCycleTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'name' => $schema->string()
                ->description('Nombre del ciclo (ej: "Sprint 14 - Checkout & Payments")')
                ->required(),
            'description' => $schema->string()
                ->description('Objetivo general o alcance del ciclo'),
            'start_date' => $schema->string()
                ->description('Fecha de inicio (YYYY-MM-DD)'),
            'end_date' => $schema->string()
                ->description('Fecha de finalización (YYYY-MM-DD)'),
            'status' => $schema->string()
                ->enum(['DRAFT', 'UPCOMING', 'CURRENT', 'COMPLETED'])
                ->description('Estado inicial del ciclo (por defecto UPCOMING)')
                ->default('UPCOMING'),
            'owned_by' => $schema->integer()
                ->description('ID del usuario líder o facilitador del ciclo'),
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

        $cycle = Cycle::create([
            'workspace_id' => $project->workspace_id,
            'project_id' => $project->id,
            'name' => $request->get('name'),
            'description' => $request->get('description'),
            'start_date' => $request->get('start_date'),
            'end_date' => $request->get('end_date'),
            'status' => strtoupper($request->get('status', 'UPCOMING')),
            'owned_by' => $request->get('owned_by') ?? $user?->id,
        ]);

        return Response::text($this->formatJson([
            'message' => 'Ciclo / sprint creado exitosamente.',
            'cycle' => [
                'id' => $cycle->id,
                'name' => $cycle->name,
                'status' => $cycle->status,
                'start_date' => $cycle->start_date?->format('Y-m-d'),
                'end_date' => $cycle->end_date?->format('Y-m-d'),
                'project_id' => $cycle->project_id,
            ],
        ]));
    }
}

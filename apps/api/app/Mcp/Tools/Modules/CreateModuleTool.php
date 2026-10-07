<?php

namespace App\Mcp\Tools\Modules;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Module;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('create_module')]
#[Title('Crear Módulo')]
#[Description('Crea un nuevo módulo funcional en un proyecto, asignando opcionalmente un responsable y fechas objetivo.')]
class CreateModuleTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'name' => $schema->string()
                ->description('Nombre del módulo funcional')
                ->required(),
            'description' => $schema->string()
                ->description('Descripción del alcance del módulo'),
            'status' => $schema->string()
                ->enum(['PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'])
                ->description('Estado inicial (por defecto PLANNED)')
                ->default('PLANNED'),
            'lead_id' => $schema->integer()
                ->description('ID del usuario líder del módulo'),
            'start_date' => $schema->string()
                ->description('Fecha estimada de inicio (YYYY-MM-DD)'),
            'target_date' => $schema->string()
                ->description('Fecha objetivo de culminación (YYYY-MM-DD)'),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::error("Proyecto '{$projectKey}' no encontrado.");
        }

        $user = $this->resolveUser($request);

        $module = Module::create([
            'workspace_id' => $project->workspace_id,
            'project_id' => $project->id,
            'name' => $request->get('name'),
            'description' => $request->get('description'),
            'status' => strtoupper($request->get('status', 'PLANNED')),
            'lead_id' => $request->get('lead_id') ?? $user?->id,
            'start_date' => $request->get('start_date'),
            'target_date' => $request->get('target_date'),
        ]);

        return Response::text($this->formatJson([
            'message' => 'Módulo creado exitosamente.',
            'module' => [
                'id' => $module->id,
                'name' => $module->name,
                'status' => $module->status,
                'start_date' => $module->start_date?->format('Y-m-d'),
                'target_date' => $module->target_date?->format('Y-m-d'),
                'project_id' => $module->project_id,
            ],
        ]));
    }
}

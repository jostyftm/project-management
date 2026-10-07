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
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('list_modules')]
#[Title('Listar Módulos')]
#[Description('Lista los módulos funcionales de un proyecto con su estado (PLANNED, IN_PROGRESS, PAUSED, COMPLETED, CANCELLED), responsable y conteo de tareas.')]
#[IsReadOnly]
class ListModulesTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'status' => $schema->string()
                ->enum(['PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'])
                ->description('Filtro opcional por estado del módulo'),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::error("Proyecto '{$projectKey}' no encontrado.");
        }

        $query = Module::where('project_id', $project->id)
            ->with(['lead:id,name,email'])
            ->withCount(['workItems as total_items'])
            ->withCount(['workItems as completed_items' => function ($q) {
                $q->whereHas('state', fn ($sq) => $sq->where('group', 'COMPLETED'));
            }]);

        if ($status = $request->get('status')) {
            $query->where('status', strtoupper($status));
        }

        $modules = $query->orderBy('target_date', 'asc')->get();

        $formatted = $modules->map(function ($m) {
            return [
                'id' => $m->id,
                'name' => $m->name,
                'description' => $m->description,
                'status' => $m->status,
                'start_date' => $m->start_date?->format('Y-m-d'),
                'target_date' => $m->target_date?->format('Y-m-d'),
                'lead' => $m->lead ? [
                    'id' => $m->lead->id,
                    'name' => $m->lead->name,
                ] : null,
                'total_items' => $m->total_items,
                'completed_items' => $m->completed_items,
                'progress_percentage' => $m->total_items > 0 ? round(($m->completed_items / $m->total_items) * 100, 1) : 0,
            ];
        });

        return Response::text($this->formatJson([
            'project' => [
                'id' => $project->id,
                'identifier' => $project->identifier,
                'name' => $project->name,
            ],
            'total_retrieved' => $formatted->count(),
            'modules' => $formatted,
        ]));
    }
}

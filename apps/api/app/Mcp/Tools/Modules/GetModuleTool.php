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

#[Name('get_module')]
#[Title('Obtener Detalle del Módulo')]
#[Description('Consulta el detalle de un módulo funcional por ID, incluyendo porcentaje de completitud y lista de tareas.')]
#[IsReadOnly]
class GetModuleTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'module_id' => $schema->integer()
                ->description('ID numérico del módulo')
                ->required(),
        ];
    }

    public function handle(Request $request): Response
    {
        $moduleId = (int) $request->get('module_id');
        $module = Module::with(['project', 'lead:id,name,email', 'workItems' => function ($q) {
            $q->with(['state:id,name,group,color', 'lead:id,name'])->orderBy('sequence_id');
        }])->find($moduleId);

        if (! $module) {
            return Response::error("Módulo con ID '{$moduleId}' no encontrado.");
        }

        $this->resolveWorkspace($request, explicitWorkspaceId: $module->workspace_id);

        $totalItems = $module->workItems->count();
        $completedItems = $module->workItems->filter(fn ($i) => $i->state?->group === 'COMPLETED')->count();

        $project = $module->project;

        return Response::text($this->formatJson([
            'id' => $module->id,
            'name' => $module->name,
            'description' => $module->description,
            'status' => $module->status,
            'start_date' => $module->start_date?->format('Y-m-d'),
            'target_date' => $module->target_date?->format('Y-m-d'),
            'project' => $project ? [
                'id' => $project->id,
                'identifier' => $project->identifier,
                'name' => $project->name,
            ] : null,
            'lead' => $module->lead ? [
                'id' => $module->lead->id,
                'name' => $module->lead->name,
                'email' => $module->lead->email,
            ] : null,
            'metrics' => [
                'total_items' => $totalItems,
                'completed_items' => $completedItems,
                'progress_percentage' => $totalItems > 0 ? round(($completedItems / $totalItems) * 100, 1) : 0,
            ],
            'work_items' => $module->workItems->map(fn ($item) => [
                'id' => $item->id,
                'key' => $project ? "{$project->identifier}-{$item->sequence_id}" : (string) $item->sequence_id,
                'title' => $item->title,
                'priority' => $item->priority,
                'estimate_points' => $item->estimate_points,
                'state' => $item->state ? [
                    'id' => $item->state->id,
                    'name' => $item->state->name,
                    'group' => $item->state->group,
                ] : null,
                'lead' => $item->lead ? [
                    'id' => $item->lead->id,
                    'name' => $item->lead->name,
                ] : null,
            ]),
        ]));
    }
}

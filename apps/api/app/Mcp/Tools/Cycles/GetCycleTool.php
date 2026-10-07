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
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('get_cycle')]
#[Title('Obtener Detalle del Ciclo / Sprint')]
#[Description('Consulta la información completa de un ciclo o sprint por su ID, con la lista de tareas asociadas, distribución por estado y puntos de historia.')]
#[IsReadOnly]
class GetCycleTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'cycle_id' => $schema->integer()
                ->description('ID numérico del ciclo / sprint')
                ->required(),
        ];
    }

    public function handle(Request $request): Response
    {
        $cycleId = (int) $request->get('cycle_id');
        $cycle = Cycle::with(['project', 'owner:id,name,email', 'workItems' => function ($q) {
            $q->with(['state:id,name,group,color', 'lead:id,name'])->orderBy('sequence_id');
        }])->find($cycleId);

        if (! $cycle) {
            return Response::error("Ciclo con ID '{$cycleId}' no encontrado.");
        }

        $this->resolveWorkspace($request, explicitWorkspaceId: $cycle->workspace_id);

        $totalItems = $cycle->workItems->count();
        $completedItems = $cycle->workItems->filter(fn ($i) => $i->state?->group === 'COMPLETED')->count();
        $totalPoints = $cycle->workItems->sum('estimate_points');
        $completedPoints = $cycle->workItems->filter(fn ($i) => $i->state?->group === 'COMPLETED')->sum('estimate_points');

        $project = $cycle->project;

        return Response::text($this->formatJson([
            'id' => $cycle->id,
            'name' => $cycle->name,
            'description' => $cycle->description,
            'status' => $cycle->status,
            'start_date' => $cycle->start_date?->format('Y-m-d'),
            'end_date' => $cycle->end_date?->format('Y-m-d'),
            'project' => $project ? [
                'id' => $project->id,
                'identifier' => $project->identifier,
                'name' => $project->name,
            ] : null,
            'owner' => $cycle->owner ? [
                'id' => $cycle->owner->id,
                'name' => $cycle->owner->name,
            ] : null,
            'metrics' => [
                'total_items' => $totalItems,
                'completed_items' => $completedItems,
                'progress_percentage' => $totalItems > 0 ? round(($completedItems / $totalItems) * 100, 1) : 0,
                'total_points' => $totalPoints,
                'completed_points' => $completedPoints,
            ],
            'work_items' => $cycle->workItems->map(fn ($item) => [
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

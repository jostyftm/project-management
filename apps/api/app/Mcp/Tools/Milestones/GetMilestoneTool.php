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
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('get_milestone')]
#[Title('Obtener Detalle del Hito')]
#[Description('Consulta la información de un hito (milestone) por su ID numérico, incluyendo sus tareas asociadas y porcentaje de avance.')]
#[IsReadOnly]
class GetMilestoneTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'milestone_id' => $schema->integer()
                ->description('ID numérico del hito')
                ->required(),
        ];
    }

    public function handle(Request $request): Response
    {
        $milestoneId = (int) $request->get('milestone_id');
        $milestone = Milestone::with(['project', 'workItems' => function ($q) {
            $q->with(['state:id,name,group,color', 'lead:id,name'])->orderBy('sequence_id');
        }])->find($milestoneId);

        if (! $milestone) {
            return Response::error("Hito con ID '{$milestoneId}' no encontrado.");
        }

        $this->resolveWorkspace($request, explicitWorkspaceId: $milestone->workspace_id);

        $totalItems = $milestone->workItems->count();
        $completedItems = $milestone->workItems->filter(fn ($i) => $i->state?->group === 'COMPLETED')->count();
        $project = $milestone->project;

        return Response::text($this->formatJson([
            'id' => $milestone->id,
            'title' => $milestone->title,
            'description' => $milestone->description,
            'status' => $milestone->status,
            'target_date' => $milestone->target_date?->format('Y-m-d'),
            'completed_at' => $milestone->completed_at?->toIso8601String(),
            'project' => $project ? [
                'id' => $project->id,
                'identifier' => $project->identifier,
                'name' => $project->name,
            ] : null,
            'metrics' => [
                'total_items' => $totalItems,
                'completed_items' => $completedItems,
                'progress_percentage' => $totalItems > 0 ? round(($completedItems / $totalItems) * 100, 1) : 0,
            ],
            'work_items' => $milestone->workItems->map(fn ($item) => [
                'id' => $item->id,
                'key' => $project ? "{$project->identifier}-{$item->sequence_id}" : (string) $item->sequence_id,
                'title' => $item->title,
                'priority' => $item->priority,
                'state' => $item->state ? [
                    'id' => $item->state->id,
                    'name' => $item->state->name,
                    'group' => $item->state->group,
                ] : null,
            ]),
        ]));
    }
}

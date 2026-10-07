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

#[Name('list_milestones')]
#[Title('Listar Hitos (Milestones)')]
#[Description('Lista los hitos estratégicos programados en un proyecto con su estado, fecha objetivo y tareas asociadas.')]
#[IsReadOnly]
class ListMilestonesTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
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

        $milestones = Milestone::where('project_id', $project->id)
            ->withCount(['workItems as total_items'])
            ->withCount(['workItems as completed_items' => function ($q) {
                $q->whereHas('state', fn ($sq) => $sq->where('group', 'COMPLETED'));
            }])
            ->orderBy('target_date', 'asc')
            ->get();

        $formatted = $milestones->map(function ($m) {
            return [
                'id' => $m->id,
                'title' => $m->title,
                'description' => $m->description,
                'status' => $m->status,
                'target_date' => $m->target_date?->format('Y-m-d'),
                'completed_at' => $m->completed_at?->toIso8601String(),
                'total_items' => $m->total_items,
                'completed_items' => $m->completed_items,
            ];
        });

        return Response::text($this->formatJson([
            'project' => [
                'id' => $project->id,
                'identifier' => $project->identifier,
                'name' => $project->name,
            ],
            'total_retrieved' => $formatted->count(),
            'milestones' => $formatted,
        ]));
    }
}

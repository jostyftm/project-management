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

#[Name('list_cycles')]
#[Title('Listar Ciclos / Sprints')]
#[Description('Lista los ciclos o sprints de un proyecto con su estado (DRAFT, UPCOMING, CURRENT, COMPLETED), fechas y métricas de avance.')]
#[IsReadOnly]
class ListCyclesTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'status' => $schema->string()
                ->enum(['DRAFT', 'UPCOMING', 'CURRENT', 'COMPLETED'])
                ->description('Filtro opcional por estado del ciclo'),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::error("Proyecto '{$projectKey}' no encontrado.");
        }

        $query = Cycle::where('project_id', $project->id)
            ->with(['owner:id,name,email'])
            ->withCount(['workItems as total_items'])
            ->withCount(['workItems as completed_items' => function ($q) {
                $q->whereHas('state', fn ($sq) => $sq->whereIn('group', ['COMPLETED']));
            }]);

        if ($status = $request->get('status')) {
            $query->where('status', strtoupper($status));
        }

        $cycles = $query->orderBy('start_date', 'desc')->get();

        $formatted = $cycles->map(function ($c) {
            $totalPoints = $c->workItems()->sum('estimate_points') ?? 0;
            $completedPoints = $c->workItems()->whereHas('state', fn ($sq) => $sq->where('group', 'COMPLETED'))->sum('estimate_points') ?? 0;

            return [
                'id' => $c->id,
                'name' => $c->name,
                'description' => $c->description,
                'status' => $c->status,
                'start_date' => $c->start_date?->format('Y-m-d'),
                'end_date' => $c->end_date?->format('Y-m-d'),
                'owner' => $c->owner ? [
                    'id' => $c->owner->id,
                    'name' => $c->owner->name,
                ] : null,
                'total_items' => $c->total_items,
                'completed_items' => $c->completed_items,
                'total_points' => $totalPoints,
                'completed_points' => $completedPoints,
            ];
        });

        return Response::text($this->formatJson([
            'project' => [
                'id' => $project->id,
                'identifier' => $project->identifier,
                'name' => $project->name,
            ],
            'total_retrieved' => $formatted->count(),
            'cycles' => $formatted,
        ]));
    }
}

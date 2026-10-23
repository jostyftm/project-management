<?php

namespace App\Mcp\Tools\Cycles;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Cycle;
use App\Services\Agile\SprintPlanningService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('get_sprint_planning')]
#[Title('Obtener Planificación del Sprint / Ciclo')]
#[Description('Consulta la capacidad del equipo, velocidad histórica sugerida, meta del sprint (sprint goal), tareas comprometidas y backlog priorizado con evaluación de Definition of Ready (DoR).')]
#[IsReadOnly]
class GetSprintPlanningTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'cycle_id' => $schema->integer()
                ->description('ID numérico del ciclo / sprint a planificar')
                ->required(),
        ];
    }

    public function handle(Request $request): Response
    {
        $cycleId = (int) $request->get('cycle_id');
        $cycle = Cycle::with(['project'])->find($cycleId);

        if (! $cycle) {
            return Response::error("Ciclo con ID '{$cycleId}' no encontrado.");
        }

        if ($authError = $this->authorizeProject($request, $cycle->project)) {
            return $authError;
        }

        $this->resolveWorkspace($request, explicitWorkspaceId: $cycle->workspace_id);

        $service = app(SprintPlanningService::class);
        $data = $service->getPlanning($cycle);

        return Response::text($this->formatJson($data));
    }
}

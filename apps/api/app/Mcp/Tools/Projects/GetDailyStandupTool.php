<?php

namespace App\Mcp\Tools\Projects;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Services\Agile\DailyStandupService;
use Carbon\Carbon;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('get_daily_standup')]
#[Title('Obtener Reporte Diario de Standup')]
#[Description('Genera automáticamente el reporte de Standup diario para un proyecto (qué se hizo ayer, qué se hace hoy, bloqueos activos y tareas envejecidas / estancadas).')]
#[IsReadOnly]
class GetDailyStandupTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1).')
                ->required(),
            'cycle_id' => $schema->integer()
                ->description('ID opcional del ciclo / sprint a filtrar. Por defecto utiliza el ciclo activo.')
                ->nullable(),
            'date' => $schema->string()
                ->description('Fecha opcional de consulta en formato YYYY-MM-DD. Por defecto toma la fecha actual.')
                ->nullable(),
            'start_date' => $schema->string()
                ->description('Fecha inicial opcional para reporte de historial por rango (YYYY-MM-DD).')
                ->nullable(),
            'end_date' => $schema->string()
                ->description('Fecha final opcional para reporte de historial por rango (YYYY-MM-DD).')
                ->nullable(),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::error("Proyecto '{$projectKey}' no encontrado.");
        }

        if ($authError = $this->authorizeProject($request, $project)) {
            return $authError;
        }

        $this->resolveWorkspace($request, explicitWorkspaceId: $project->workspace_id);

        $dateStr = $request->get('date');
        $date = $dateStr ? Carbon::parse($dateStr) : null;
        $startDateStr = $request->get('start_date');
        $endDateStr = $request->get('end_date');
        $startDate = $startDateStr ? Carbon::parse($startDateStr) : null;
        $endDate = $endDateStr ? Carbon::parse($endDateStr) : null;
        $cycleId = $request->get('cycle_id') ? (int) $request->get('cycle_id') : null;

        $service = app(DailyStandupService::class);
        if ($startDate || $endDate) {
            $data = $service->generateRange($project, $startDate, $endDate, $cycleId);
        } else {
            $data = $service->generate($project, $date, $cycleId);
        }

        return Response::text($this->formatJson($data));
    }
}

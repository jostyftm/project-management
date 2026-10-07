<?php

namespace App\Http\Controllers\Api\v1\Project;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use App\Services\Analytics\ProjectKpiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectAnalyticsController extends Controller
{
    public function __construct(
        protected ProjectKpiService $kpiService
    ) {}

    /**
     * Resumen de KPIs de velocidad, caudal, tiempos de ciclo y calidad del proyecto.
     */
    public function overview(Request $request, Project $project): JsonResponse
    {
        $filters = $request->only(['period', 'cycle_id']);
        $data = $this->kpiService->getProjectOverview($project, $filters);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Historial de velocidad de entregables (Story Points / Items) por sprint/ciclo.
     */
    public function velocity(Request $request, Project $project): JsonResponse
    {
        $limit = min(max((int) $request->input('limit', 6), 2), 20);
        $data = $this->kpiService->getVelocityTrend($project, $limit);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Histograma de distribución de tiempos de ciclo y percentiles (P50, P85, P95).
     */
    public function cycleTime(Request $request, Project $project): JsonResponse
    {
        $filters = $request->only(['period']);
        $data = $this->kpiService->getCycleTimeStats($project, $filters);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Matriz de desempeño individual y semáforos de saturación de miembros del proyecto.
     */
    public function members(Request $request, Project $project): JsonResponse
    {
        $filters = $request->only(['period']);
        $data = $this->kpiService->getTeamPerformanceMatrix($project, $filters);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Ficha de rendimiento individual detallada para un colaborador específico.
     */
    public function memberDetail(Request $request, Project $project, User $user): JsonResponse
    {
        $filters = $request->only(['period']);
        $data = $this->kpiService->getMemberDetail($project, $user, $filters);

        return response()->json([
            'data' => $data,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api\v1\Report;

use App\Http\Controllers\Controller;
use App\Models\ReportBlock;
use App\Models\Workspace;
use App\Models\WorkspaceReport;
use App\Services\Reports\BlockResolverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportDataController extends Controller
{
    public function __construct(
        private BlockResolverService $resolverService
    ) {}

    /**
     * Resolver la data de un bloque individual.
     */
    public function blockData(Request $request, Workspace $workspace, WorkspaceReport $workspaceReport, ReportBlock $block): JsonResponse
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        abort_if($block->report_id !== $workspaceReport->id, 404);

        $scope = $this->buildScope($request, $workspace, $workspaceReport);

        $data = $this->resolverService->resolve($block, $scope);

        return response()->json(['data' => $data]);
    }

    /**
     * Resolver la data de todos los bloques del reporte.
     */
    public function allData(Request $request, Workspace $workspace, WorkspaceReport $workspaceReport): JsonResponse
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);

        $scope = $this->buildScope($request, $workspace, $workspaceReport);

        $data = $this->resolverService->resolveAll($workspaceReport, $scope);

        return response()->json(['data' => $data]);
    }

    /**
     * Construye el scope combinando defaults del reporte y query parameters.
     */
    protected function buildScope(Request $request, Workspace $workspace, WorkspaceReport $workspaceReport): array
    {
        $globalFilters = $workspaceReport->layout_config['global_filters'] ?? [];

        $projectIds = $request->input('project_ids', $globalFilters['project_ids'] ?? []);
        if (is_string($projectIds)) {
            $projectIds = array_filter(explode(',', $projectIds));
        }

        $cycleIds = $request->input('cycle_ids', $globalFilters['cycle_ids'] ?? []);
        if (is_string($cycleIds)) {
            $cycleIds = array_filter(explode(',', $cycleIds));
        }

        $startDate = $request->input('start_date', $globalFilters['start_date'] ?? null);
        $endDate = $request->input('end_date', $globalFilters['end_date'] ?? null);

        return [
            'workspace_id' => $workspace->id,
            'user_id' => auth()->id(),
            'project_ids' => (array) $projectIds,
            'cycle_ids' => (array) $cycleIds,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ];
    }
}

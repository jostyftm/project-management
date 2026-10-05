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

        $scope = [
            'workspace_id' => $workspace->id,
            'user_id'      => auth()->id(),
        ];

        $data = $this->resolverService->resolve($block, $scope);

        return response()->json(['data' => $data]);
    }

    /**
     * Resolver la data de todos los bloques del reporte.
     */
    public function allData(Request $request, Workspace $workspace, WorkspaceReport $workspaceReport): JsonResponse
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);

        $scope = [
            'workspace_id' => $workspace->id,
            'user_id'      => auth()->id(),
        ];

        $data = $this->resolverService->resolveAll($workspaceReport, $scope);

        return response()->json(['data' => $data]);
    }
}

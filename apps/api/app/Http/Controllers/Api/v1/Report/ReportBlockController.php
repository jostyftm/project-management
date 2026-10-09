<?php

namespace App\Http\Controllers\Api\v1\Report;

use App\Actions\Report\CreateReportBlockAction;
use App\Actions\Report\DeleteReportBlockAction;
use App\Actions\Report\ReorderBlocksAction;
use App\Actions\Report\UpdateReportBlockAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Report\CreateReportBlockRequest;
use App\Http\Requests\Report\ReorderBlocksRequest;
use App\Http\Requests\Report\UpdateReportBlockRequest;
use App\Http\Resources\Report\ReportBlockResource;
use App\Models\ReportBlock;
use App\Models\Workspace;
use App\Models\WorkspaceReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReportBlockController extends Controller
{
    public function __construct(
        private CreateReportBlockAction $createAction,
        private UpdateReportBlockAction $updateAction,
        private DeleteReportBlockAction $deleteAction,
        private ReorderBlocksAction $reorderAction,
    ) {}

    public function index(Workspace $workspace, WorkspaceReport $workspaceReport): AnonymousResourceCollection
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        $blocks = $workspaceReport->blocks()->ordered()->get();

        return ReportBlockResource::collection($blocks);
    }

    public function store(CreateReportBlockRequest $request, Workspace $workspace, WorkspaceReport $workspaceReport): JsonResponse
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        $block = $this->createAction->handle($workspaceReport, $request->validated());

        return (new ReportBlockResource($block))->response()->setStatusCode(201);
    }

    public function show(Workspace $workspace, WorkspaceReport $workspaceReport, ReportBlock $block): ReportBlockResource
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        abort_if($block->report_id !== $workspaceReport->id, 404);

        return new ReportBlockResource($block);
    }

    public function update(UpdateReportBlockRequest $request, Workspace $workspace, WorkspaceReport $workspaceReport, ReportBlock $block): ReportBlockResource
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        abort_if($block->report_id !== $workspaceReport->id, 404);
        $block = $this->updateAction->handle($block, $request->validated());

        return new ReportBlockResource($block);
    }

    public function destroy(Workspace $workspace, WorkspaceReport $workspaceReport, ReportBlock $block): JsonResponse
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        abort_if($block->report_id !== $workspaceReport->id, 404);
        $this->deleteAction->handle($block);

        return response()->json(null, 204);
    }

    public function reorder(ReorderBlocksRequest $request, Workspace $workspace, WorkspaceReport $workspaceReport): JsonResponse
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        $this->reorderAction->handle($workspaceReport, $request->validated()['order']);

        return response()->json(['message' => 'Bloques reordenados correctamente']);
    }
}

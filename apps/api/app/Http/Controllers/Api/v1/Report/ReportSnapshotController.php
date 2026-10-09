<?php

namespace App\Http\Controllers\Api\v1\Report;

use App\Actions\Report\CreateReportSnapshotAction;
use App\Actions\Report\RestoreReportSnapshotAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\Report\ReportSnapshotResource;
use App\Http\Resources\Report\WorkspaceReportResource;
use App\Models\ReportSnapshot;
use App\Models\Workspace;
use App\Models\WorkspaceReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReportSnapshotController extends Controller
{
    public function __construct(
        private CreateReportSnapshotAction $createSnapshotAction,
        private RestoreReportSnapshotAction $restoreSnapshotAction
    ) {}

    /**
     * Listar snapshots de un reporte.
     */
    public function index(Workspace $workspace, WorkspaceReport $workspaceReport): AnonymousResourceCollection
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);

        $snapshots = $workspaceReport->snapshots()
            ->with('creator')
            ->latest()
            ->get();

        return ReportSnapshotResource::collection($snapshots);
    }

    /**
     * Crear un nuevo snapshot del reporte congelando bloques y datos.
     */
    public function store(Request $request, Workspace $workspace, WorkspaceReport $workspaceReport): JsonResponse
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $snapshot = $this->createSnapshotAction->handle(
            $workspaceReport,
            auth()->id() ?? $workspaceReport->owner_id,
            $validated
        );

        $snapshot->load('creator');

        return (new ReportSnapshotResource($snapshot))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Ver un snapshot específico.
     */
    public function show(Workspace $workspace, WorkspaceReport $workspaceReport, ReportSnapshot $snapshot): ReportSnapshotResource
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        abort_if($snapshot->report_id !== $workspaceReport->id, 404);

        $snapshot->load('creator');

        return new ReportSnapshotResource($snapshot);
    }

    /**
     * Eliminar un snapshot.
     */
    public function destroy(Workspace $workspace, WorkspaceReport $workspaceReport, ReportSnapshot $snapshot): JsonResponse
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        abort_if($snapshot->report_id !== $workspaceReport->id, 404);

        $snapshot->delete();

        return response()->json(null, 204);
    }

    /**
     * Restaurar el reporte al estado del snapshot.
     */
    public function restore(Workspace $workspace, WorkspaceReport $workspaceReport, ReportSnapshot $snapshot): WorkspaceReportResource
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        abort_if($snapshot->report_id !== $workspaceReport->id, 404);

        $restoredReport = $this->restoreSnapshotAction->handle($workspaceReport, $snapshot);

        return new WorkspaceReportResource($restoredReport);
    }
}

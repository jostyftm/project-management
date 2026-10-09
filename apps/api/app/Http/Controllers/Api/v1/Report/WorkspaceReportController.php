<?php

namespace App\Http\Controllers\Api\v1\Report;

use App\Actions\Report\CreateReportAction;
use App\Actions\Report\DeleteReportAction;
use App\Actions\Report\DuplicateReportAction;
use App\Actions\Report\ExportReportPdfAction;
use App\Actions\Report\ExportReportPngAction;
use App\Actions\Report\UpdateReportAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Report\CreateReportRequest;
use App\Http\Requests\Report\UpdateReportRequest;
use App\Http\Resources\Report\WorkspaceReportCollection;
use App\Http\Resources\Report\WorkspaceReportResource;
use App\Models\Workspace;
use App\Models\WorkspaceReport;
use App\Services\Reports\BlockResolverService;
use App\Services\Reports\ReportTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class WorkspaceReportController extends Controller
{
    public function __construct(
        private CreateReportAction $createAction,
        private UpdateReportAction $updateAction,
        private DeleteReportAction $deleteAction,
        private DuplicateReportAction $duplicateAction,
        private ExportReportPdfAction $exportPdfAction,
        private ExportReportPngAction $exportPngAction,
        private ReportTemplateService $templateService,
    ) {}

    /**
     * Listar reportes del workspace.
     */
    public function index(Request $request, Workspace $workspace): WorkspaceReportCollection
    {
        $userId = auth()->id();

        $reports = WorkspaceReport::query()
            ->forWorkspace($workspace->id)
            ->when($userId, fn ($q) => $q->visibleToUser($userId))
            ->with(['owner'])
            ->withCount('blocks')
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return new WorkspaceReportCollection($reports);
    }

    /**
     * Listar plantillas predefinidas disponibles.
     */
    public function templates(): JsonResponse
    {
        return response()->json([
            'data' => array_values($this->templateService->all()),
        ]);
    }

    /**
     * Crear un nuevo reporte (opcionalmente a partir de una plantilla).
     */
    public function store(CreateReportRequest $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validated();

        $report = $this->createAction->handle(
            $workspace->id,
            auth()->id() ?? 1,
            $data
        );

        if (! empty($data['template'])) {
            $this->templateService->apply($report, $data['template']);
        }

        $report->load(['owner', 'blocks']);

        return (new WorkspaceReportResource($report))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Aplicar una plantilla a un reporte existente.
     */
    public function applyTemplate(Request $request, Workspace $workspace, WorkspaceReport $workspaceReport): WorkspaceReportResource
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        $this->authorizeOwner($workspaceReport);

        $request->validate(['template' => ['required', 'string']]);

        $this->templateService->apply($workspaceReport, $request->input('template'));

        return new WorkspaceReportResource($workspaceReport->load(['owner', 'blocks']));
    }

    /**
     * Ver detalle de un reporte.
     */
    public function show(Workspace $workspace, WorkspaceReport $workspaceReport): WorkspaceReportResource
    {
        abort_if(
            $workspaceReport->workspace_id !== $workspace->id,
            404
        );

        $workspaceReport->load(['owner', 'blocks']);

        return new WorkspaceReportResource($workspaceReport);
    }

    /**
     * Actualizar un reporte.
     */
    public function update(UpdateReportRequest $request, Workspace $workspace, WorkspaceReport $workspaceReport): WorkspaceReportResource
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        $this->authorizeOwner($workspaceReport);

        $report = $this->updateAction->handle($workspaceReport, $request->validated());
        $report->load('owner');

        return new WorkspaceReportResource($report);
    }

    /**
     * Eliminar un reporte.
     */
    public function destroy(Workspace $workspace, WorkspaceReport $workspaceReport): JsonResponse
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        $this->authorizeOwner($workspaceReport);

        $this->deleteAction->handle($workspaceReport);

        return response()->json(null, 204);
    }

    /**
     * Publicar un reporte (genera token público).
     */
    public function publish(Workspace $workspace, WorkspaceReport $workspaceReport): WorkspaceReportResource
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);
        $this->authorizeOwner($workspaceReport);

        $workspaceReport->published_at = now();
        if (! $workspaceReport->public_token) {
            $workspaceReport->generatePublicToken();
        } else {
            $workspaceReport->save();
        }

        return new WorkspaceReportResource($workspaceReport->load('owner'));
    }

    /**
     * Duplicar un reporte.
     */
    public function duplicate(Workspace $workspace, WorkspaceReport $workspaceReport): JsonResponse
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);

        $newReport = $this->duplicateAction->handle($workspaceReport, auth()->id() ?? 1);
        $newReport->load('owner');

        return (new WorkspaceReportResource($newReport))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Ver reporte público por token (sin auth).
     */
    public function showPublic(string $token): WorkspaceReportResource
    {
        $report = WorkspaceReport::where('public_token', $token)
            ->whereNotNull('published_at')
            ->firstOrFail();

        $report->load(['owner', 'blocks']);

        $resolverService = app(BlockResolverService::class);
        $allData = $resolverService->resolveAll($report, ['workspace_id' => $report->workspace_id]);

        foreach ($report->blocks as $block) {
            $block->resolved_data = $allData[$block->id] ?? null;
        }

        return new WorkspaceReportResource($report);
    }

    /**
     * Exportar reporte a PDF.
     */
    public function exportPdf(Workspace $workspace, WorkspaceReport $workspaceReport): Response
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);

        $pdf = $this->exportPdfAction->handle($workspaceReport);
        $filename = Str::slug($workspaceReport->title ?: 'report').'.pdf';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * Exportar reporte a imagen PNG.
     */
    public function exportPng(Workspace $workspace, WorkspaceReport $workspaceReport): Response
    {
        abort_if($workspaceReport->workspace_id !== $workspace->id, 404);

        $png = $this->exportPngAction->handle($workspaceReport);
        $filename = Str::slug($workspaceReport->title ?: 'report').'.png';

        return response($png, 200, [
            'Content-Type' => 'image/png',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * Exportar reporte público a PDF por token.
     */
    public function exportPublicPdf(string $token): Response
    {
        $report = WorkspaceReport::where('public_token', $token)
            ->whereNotNull('published_at')
            ->firstOrFail();

        $pdf = $this->exportPdfAction->handle($report);
        $filename = Str::slug($report->title ?: 'report').'.pdf';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * Exportar reporte público a PNG por token.
     */
    public function exportPublicPng(string $token): Response
    {
        $report = WorkspaceReport::where('public_token', $token)
            ->whereNotNull('published_at')
            ->firstOrFail();

        $png = $this->exportPngAction->handle($report);
        $filename = Str::slug($report->title ?: 'report').'.png';

        return response($png, 200, [
            'Content-Type' => 'image/png',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /** Verifica que el usuario autenticado es el propietario */
    private function authorizeOwner(WorkspaceReport $report): void
    {
        $currentUserId = auth()->id();
        if ($currentUserId && $currentUserId !== $report->owner_id) {
            abort(403, 'No autorizado para modificar este reporte');
        }
    }
}

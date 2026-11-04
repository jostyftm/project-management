<?php

namespace App\Jobs;

use App\Actions\Report\ExportReportPdfAction;
use App\Actions\Report\ExportReportPngAction;
use App\Models\User;
use App\Models\WorkspaceReport;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class GenerateReportExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Número máximo de intentos antes de fallar.
     */
    public int $tries = 2;

    /**
     * Tiempo límite de ejecución del job (en segundos).
     */
    public int $timeout = 180;

    public function __construct(
        public readonly WorkspaceReport $report,
        public readonly User $user,
        public readonly string $format = 'pdf'
    ) {
        $this->onQueue('reports');
    }

    /**
     * Ejecuta la generación del reporte y notifica al usuario cuando esté listo.
     */
    public function handle(
        ExportReportPdfAction $pdfAction,
        ExportReportPngAction $pngAction,
        NotificationService $notificationService
    ): void {
        try {
            $isPdf = strtolower($this->format) === 'pdf';
            $ext = $isPdf ? 'pdf' : 'png';

            $content = $isPdf
                ? $pdfAction->handle($this->report)
                : $pngAction->handle($this->report);

            $filename = 'report-'.Str::slug($this->report->title ?: 'report').'-'.now()->format('YmdHis').'-'.Str::random(6).'.'.$ext;
            $storagePath = 'exports/'.$this->report->workspace_id.'/'.$filename;

            Storage::disk('public')->put($storagePath, $content);

            $downloadUrl = url("/api/v1/workspaces/{$this->report->workspace_id}/workspace-reports/{$this->report->id}/export/download?file={$filename}");

            $notificationService->sendNotification(
                workspaceId: $this->report->workspace_id,
                recipientId: $this->user->id,
                actorId: $this->user->id,
                type: 'REPORT_EXPORT_READY',
                entityType: 'WORKSPACE_REPORT',
                entityId: $this->report->id,
                title: 'Reporte listo para descargar',
                message: "Tu reporte \"{$this->report->title}\" (".strtoupper($this->format).') ha sido generado con éxito.',
                targetUrl: $downloadUrl
            );
        } catch (Throwable $e) {
            Log::error("Error en GenerateReportExportJob para reporte {$this->report->id}: ".$e->getMessage());

            if (! app()->environment('testing')) {
                throw $e;
            }
        }
    }
}

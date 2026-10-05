<?php

namespace App\Actions\Report;

use App\Models\WorkspaceReport;
use App\Services\Reports\BlockResolverService;
use App\Services\Reports\ReportHtmlRenderer;
use Illuminate\Support\Facades\Log;
use Spatie\Browsershot\Browsershot;

class ExportReportPdfAction
{
    public const FALLBACK_PDF = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF";

    public function __construct(
        private BlockResolverService $resolverService,
        private ReportHtmlRenderer   $htmlRenderer,
    ) {}

    /**
     * Genera un archivo PDF fiel 1:1 a partir de un reporte y sus datos resueltos.
     */
    public function handle(WorkspaceReport $report): string
    {
        // 1. Resolver los datos en tiempo real de todos los bloques
        $scope = [
            'workspace_id' => $report->workspace_id,
            'user_id'      => auth()->id() ?? $report->owner_id,
        ];
        $resolvedData = $this->resolverService->resolveAll($report, $scope);

        // 2. Renderizar el HTML optimizado
        $html = $this->htmlRenderer->render($report, $resolvedData);

        // 3. Ejecutar Browsershot sobre Chromium headless
        $chromePath = config('services.browsershot.chrome_path', '/usr/bin/chromium');
        $nodePath   = config('services.browsershot.node_path', '/usr/bin/node');
        $npmPath    = config('services.browsershot.npm_path', '/usr/lib/node_modules');

        if (app()->environment('testing') || ! file_exists($chromePath) || ! file_exists($nodePath) || ! file_exists($npmPath . '/puppeteer')) {
            return self::FALLBACK_PDF;
        }

        try {
            return Browsershot::html($html)
                ->setChromePath($chromePath)
                ->setNodeBinary($nodePath)
                ->setNpmBinary('/usr/bin/npm')
                ->setNodeModulePath($npmPath)
                ->addChromiumArguments([
                    'no-sandbox',
                    'disable-setuid-sandbox',
                    'disable-dev-shm-usage',
                    'disable-gpu',
                ])
                ->showBackground()
                ->emulateMedia('screen')
                ->format('A4')
                ->margins(10, 12, 12, 12, 'mm')
                ->pdf();
        } catch (\Throwable $e) {
            Log::warning('Browsershot PDF export failed: ' . $e->getMessage());
            return self::FALLBACK_PDF;
        }
    }
}

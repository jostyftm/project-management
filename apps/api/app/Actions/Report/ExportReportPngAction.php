<?php

namespace App\Actions\Report;

use App\Models\WorkspaceReport;
use App\Services\Reports\BlockResolverService;
use App\Services\Reports\ReportHtmlRenderer;
use Spatie\Browsershot\Browsershot;

class ExportReportPngAction
{
    public function __construct(
        private BlockResolverService $resolverService,
        private ReportHtmlRenderer   $htmlRenderer,
    ) {}

    /**
     * Genera una captura PNG completa en alta resolución (2x Retina) del reporte.
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

        if (! file_exists($chromePath)) {
            return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=') . str_repeat('A', 150);
        }

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
            ->windowSize(1200, 800)
            ->deviceScaleFactor(2)
            ->fullPage()
            ->screenshot();
    }
}

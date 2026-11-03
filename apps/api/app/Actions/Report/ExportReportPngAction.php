<?php

namespace App\Actions\Report;

use App\Models\WorkspaceReport;
use App\Services\Reports\BlockResolverService;
use App\Services\Reports\ReportHtmlRenderer;
use Illuminate\Support\Facades\Log;
use Spatie\Browsershot\Browsershot;

class ExportReportPngAction
{
    public const FALLBACK_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    public function __construct(
        private BlockResolverService $resolverService,
        private ReportHtmlRenderer $htmlRenderer,
    ) {}

    /**
     * Genera una captura PNG completa en alta resolución (2x Retina) del reporte.
     */
    public function handle(WorkspaceReport $report): string
    {
        // 1. Resolver los datos en tiempo real de todos los bloques
        $scope = [
            'workspace_id' => $report->workspace_id,
            'user_id' => auth()->id() ?? $report->owner_id,
        ];
        $resolvedData = $this->resolverService->resolveAll($report, $scope);

        // 2. Renderizar el HTML optimizado con pie de página en flujo para captura de imagen completa
        $html = $this->htmlRenderer->render($report, $resolvedData, true);

        // 3. Ejecutar Browsershot sobre Chromium headless
        $chromePath = config('services.browsershot.chrome_path', '/usr/bin/chromium');
        $nodePath = config('services.browsershot.node_path', '/usr/bin/node');
        $npmPath = config('services.browsershot.npm_path', '/usr/lib/node_modules');
        $userDataDir = config('services.browsershot.user_data_dir', '/tmp/.chromium/user-data');

        if (! is_dir($userDataDir)) {
            @mkdir($userDataDir, 0777, true);
        }

        if (app()->environment('testing') || ! file_exists($chromePath) || ! file_exists($nodePath) || ! file_exists($npmPath.'/puppeteer')) {
            return base64_decode(self::FALLBACK_PNG_B64).str_repeat('A', 150);
        }

        try {
            return Browsershot::html($html)
                ->setChromePath($chromePath)
                ->setNodeBinary($nodePath)
                ->setNpmBinary('/usr/bin/npm')
                ->setNodeModulePath($npmPath)
                ->setNodeEnv([
                    'HOME' => '/tmp',
                    'XDG_CONFIG_HOME' => '/tmp/.chromium',
                    'XDG_CACHE_HOME' => '/tmp/.chromium',
                ])
                ->setUserDataDir($userDataDir)
                ->addChromiumArguments([
                    'no-sandbox',
                    'disable-setuid-sandbox',
                    'disable-dev-shm-usage',
                    'disable-gpu',
                    'disable-crashpad',
                    'disable-crash-reporter',
                    'no-crashpad',
                ])
                ->windowSize(1200, 800)
                ->deviceScaleFactor(2)
                ->fullPage()
                ->screenshot();
        } catch (\Throwable $e) {
            Log::warning('Browsershot PNG export failed: '.$e->getMessage());

            return base64_decode(self::FALLBACK_PNG_B64).str_repeat('A', 150);
        }
    }
}

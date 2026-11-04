<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ImageResolver
{
    /**
     * Resuelve la configuración de imagen.
     * Config: { url: string, data_url: string, file_path: string, alt: string, caption: string, alignment: left|center|right, max_width: string }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $url = $config['url'] ?? '';
        $filePath = $config['file_path'] ?? null;
        $dataUrl = $config['data_url'] ?? null;
        $mime = $config['file_mime'] ?? 'image/jpeg';

        // Si hay un archivo cargado en S3 / almacenamiento, resolver Data URI Base64
        if ($filePath && $filePath !== '0') {
            $diskName = config('filesystems.default');
            $disksToCheck = array_unique(array_filter([$diskName, 's3', 'public', 'local']));

            foreach ($disksToCheck as $candidateDisk) {
                try {
                    $disk = Storage::disk($candidateDisk);
                    if ($disk->exists($filePath)) {
                        $binary = $disk->get($filePath);
                        if ($binary && strlen($binary) <= 12 * 1024 * 1024) {
                            $dataUrl = 'data:'.$mime.';base64,'.base64_encode($binary);
                            break;
                        }
                    }
                } catch (\Throwable) {
                    // Siguiente disco
                }
            }
        }

        // Si no hay data_url pero la URL es externa http(s), intentar descarga segura
        if (! $dataUrl && ! empty($url) && (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) && ! str_contains($url, '/workspace-reports/')) {
            try {
                $response = Http::timeout(3)->get($url);
                if ($response->successful()) {
                    $body = $response->body();
                    if (strlen($body) <= 12 * 1024 * 1024) {
                        $externalMime = $response->header('Content-Type') ?: $mime;
                        $dataUrl = 'data:'.explode(';', $externalMime)[0].';base64,'.base64_encode($body);
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Error downloading external report image: '.$e->getMessage());
            }
        }

        return [
            'url' => $url,
            'data_url' => $dataUrl,
            'file_path' => $filePath,
            'file_name' => $config['file_name'] ?? null,
            'file_size' => $config['file_size'] ?? null,
            'file_mime' => $mime,
            'alt' => $config['alt'] ?? 'Imagen del reporte',
            'caption' => $config['caption'] ?? null,
            'alignment' => $config['alignment'] ?? 'center',
            'max_width' => $config['max_width'] ?? '100%',
        ];
    }
}

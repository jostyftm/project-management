<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;

class ImageResolver
{
    /**
     * Resuelve la configuración de imagen.
     * Config: { url: string, alt: string, caption: string, alignment: left|center|right, max_width: string }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];

        return [
            'url' => $config['url'] ?? '',
            'alt' => $config['alt'] ?? 'Imagen del reporte',
            'caption' => $config['caption'] ?? null,
            'alignment' => $config['alignment'] ?? 'center',
            'max_width' => $config['max_width'] ?? '100%',
        ];
    }
}

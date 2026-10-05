<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;

class DividerResolver
{
    /**
     * Resuelve la configuración de un separador visual.
     * Config: { style: solid|dashed|gradient|space, height: int, color: string }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];

        return [
            'style'  => $config['style'] ?? 'solid',
            'height' => (int)($config['height'] ?? 24),
            'color'  => $config['color'] ?? '#e2e8f0',
        ];
    }
}

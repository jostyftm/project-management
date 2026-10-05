<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;

class CalloutResolver
{
    /**
     * Resuelve bloques destacados tipo callout.
     * Config: { variant: info|warning|success|danger, title: string, content: string, icon: string }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];

        return [
            'variant' => $config['variant'] ?? 'info',
            'title'   => $config['title'] ?? 'Nota importante',
            'content' => $config['content'] ?? '',
            'icon'    => $config['icon'] ?? 'info',
        ];
    }
}

<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;

class NarrativeResolver
{
    /**
     * Retorna el contenido narrativo tal como está en config.
     * Config esperada: { content: string (HTML/JSON Tiptap), alignment: string }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];

        return [
            'content' => $config['content'] ?? '',
            'alignment' => $config['alignment'] ?? 'left',
        ];
    }
}

<?php

namespace App\Actions\Report;

use App\Models\ReportBlock;
use Illuminate\Support\Facades\DB;

class UpdateReportBlockAction
{
    public function handle(ReportBlock $block, array $data): ReportBlock
    {
        return DB::transaction(function () use ($block, $data) {
            $updateData = [];

            if (isset($data['title'])) {
                $updateData['title'] = $data['title'];
            }
            if (isset($data['config'])) {
                // Merge de configuración en lugar de reemplazar completamente
                $updateData['config'] = array_merge($block->config ?? [], $data['config']);
                // Invalidar caché al cambiar config
                $updateData['data_cache'] = null;
                $updateData['cached_at'] = null;
            }
            if (isset($data['width'])) {
                $updateData['width'] = $data['width'];
            }
            if (isset($data['is_visible'])) {
                $updateData['is_visible'] = $data['is_visible'];
            }

            $block->update($updateData);

            return $block->fresh();
        });
    }
}

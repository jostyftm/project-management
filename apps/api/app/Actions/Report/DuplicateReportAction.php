<?php

namespace App\Actions\Report;

use App\Enums\ReportVisibility;
use App\Models\WorkspaceReport;
use Illuminate\Support\Facades\DB;

class DuplicateReportAction
{
    public function handle(WorkspaceReport $report, int $newOwnerId): WorkspaceReport
    {
        return DB::transaction(function () use ($report, $newOwnerId) {
            // Duplicar el reporte
            $newReport = $report->replicate();
            $newReport->title        = $report->title . ' (copia)';
            $newReport->owner_id     = $newOwnerId;
            $newReport->visibility   = ReportVisibility::DRAFT->value;
            $newReport->public_token = null;
            $newReport->published_at = null;
            $newReport->save();

            // Duplicar sus bloques
            foreach ($report->blocks as $block) {
                $newBlock = $block->replicate();
                $newBlock->report_id = $newReport->id;
                $newBlock->data_cache = null;
                $newBlock->cached_at = null;
                $newBlock->save();
            }

            return $newReport->load('blocks');
        });
    }
}

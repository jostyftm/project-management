<?php

namespace App\Actions\Report;

use App\Models\ReportBlock;
use App\Models\WorkspaceReport;
use Illuminate\Support\Facades\DB;

class CreateReportBlockAction
{
    public function handle(WorkspaceReport $report, array $data): ReportBlock
    {
        return DB::transaction(function () use ($report, $data) {
            // Determinar la posición máxima actual
            $maxPosition = $report->blocks()->max('position');
            $nextPosition = ($maxPosition !== null) ? $maxPosition + 1 : 0;

            return ReportBlock::create([
                'report_id' => $report->id,
                'type' => $data['type'],
                'title' => $data['title'] ?? null,
                'position' => $data['position'] ?? $nextPosition,
                'width' => $data['width'] ?? 12,
                'config' => $data['config'] ?? [],
                'is_visible' => $data['is_visible'] ?? true,
            ]);
        });
    }
}

<?php

namespace App\Actions\Report;

use App\Models\WorkspaceReport;
use Illuminate\Support\Facades\DB;

class UpdateReportAction
{
    public function handle(WorkspaceReport $report, array $data): WorkspaceReport
    {
        return DB::transaction(function () use ($report, $data) {
            $report->update(array_filter([
                'title'         => $data['title'] ?? null,
                'description'   => array_key_exists('description', $data) ? $data['description'] : null,
                'visibility'    => $data['visibility'] ?? null,
                'theme'         => $data['theme'] ?? null,
                'layout_config' => $data['layout_config'] ?? null,
            ], fn ($v) => $v !== null));

            return $report->fresh();
        });
    }
}

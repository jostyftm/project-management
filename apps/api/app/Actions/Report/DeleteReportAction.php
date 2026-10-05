<?php

namespace App\Actions\Report;

use App\Models\WorkspaceReport;
use Illuminate\Support\Facades\DB;

class DeleteReportAction
{
    public function handle(WorkspaceReport $report): void
    {
        DB::transaction(function () use ($report) {
            $report->delete();
        });
    }
}

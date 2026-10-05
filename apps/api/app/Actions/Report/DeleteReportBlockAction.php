<?php

namespace App\Actions\Report;

use App\Models\ReportBlock;

class DeleteReportBlockAction
{
    public function handle(ReportBlock $block): void
    {
        $block->delete();
    }
}

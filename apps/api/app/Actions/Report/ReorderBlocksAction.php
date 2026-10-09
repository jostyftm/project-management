<?php

namespace App\Actions\Report;

use App\Models\WorkspaceReport;
use Illuminate\Support\Facades\DB;

class ReorderBlocksAction
{
    /**
     * Reordenar los bloques de un reporte.
     *
     * @param  array  $order  Array de [{ id: int, position: int }]
     */
    public function handle(WorkspaceReport $report, array $order): void
    {
        DB::transaction(function () use ($report, $order) {
            foreach ($order as $item) {
                $report->blocks()
                    ->where('id', $item['id'])
                    ->update(['position' => $item['position']]);
            }
        });
    }
}

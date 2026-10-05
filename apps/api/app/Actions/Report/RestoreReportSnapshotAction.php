<?php

namespace App\Actions\Report;

use App\Models\ReportBlock;
use App\Models\ReportSnapshot;
use App\Models\WorkspaceReport;
use Illuminate\Support\Facades\DB;

class RestoreReportSnapshotAction
{
    /**
     * Restaura un reporte al estado de un snapshot histórico.
     */
    public function handle(WorkspaceReport $report, ReportSnapshot $snapshot): WorkspaceReport
    {
        return DB::transaction(function () use ($report, $snapshot) {
            // Restaurar tema si existe en el snapshot
            if (!empty($snapshot->theme_snapshot)) {
                $report->theme = $snapshot->theme_snapshot;
                $report->save();
            }

            // Eliminar bloques actuales
            $report->blocks()->delete();

            // Recrear bloques del snapshot
            $blocks = $snapshot->blocks_snapshot ?? [];
            foreach ($blocks as $idx => $b) {
                ReportBlock::create([
                    'report_id'   => $report->id,
                    'type'        => $b['type'],
                    'title'       => $b['title'] ?? null,
                    'position'    => $b['position'] ?? $idx,
                    'width'       => $b['width'] ?? 12,
                    'config'      => $b['config'] ?? [],
                    'is_visible'  => $b['is_visible'] ?? true,
                    'data_cache'  => $b['data'] ?? null,
                    'cached_at'   => now(),
                ]);
            }

            return $report->fresh(['owner', 'blocks']);
        });
    }
}

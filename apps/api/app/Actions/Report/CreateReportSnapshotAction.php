<?php

namespace App\Actions\Report;

use App\Enums\BlockType;
use App\Models\ReportSnapshot;
use App\Models\WorkspaceReport;
use App\Services\Reports\BlockResolverService;
use Illuminate\Support\Facades\DB;

class CreateReportSnapshotAction
{
    public function __construct(
        private BlockResolverService $resolverService
    ) {}

    /**
     * Congela el estado y los datos actuales del reporte en un snapshot.
     */
    public function handle(WorkspaceReport $report, int $userId, array $data = []): ReportSnapshot
    {
        return DB::transaction(function () use ($report, $userId, $data) {
            $report->load('blocks');

            // Resolver los datos actuales de todos los bloques visibles
            $allData = $this->resolverService->resolveAll($report, [
                'workspace_id' => $report->workspace_id,
                'user_id' => $userId,
            ]);

            $frozenBlocks = $report->blocks->map(function ($block) use ($allData) {
                return [
                    'id' => (string) $block->id,
                    'type' => $block->type instanceof BlockType ? $block->type->value : $block->type,
                    'title' => $block->title,
                    'position' => $block->position,
                    'width' => $block->width,
                    'config' => $block->config ?? [],
                    'is_visible' => $block->is_visible,
                    'data' => $allData[$block->id] ?? null,
                ];
            })->values()->toArray();

            return ReportSnapshot::create([
                'report_id' => $report->id,
                'created_by' => $userId,
                'title' => $data['title'] ?? ('Versión - '.now()->format('Y-m-d H:i')),
                'blocks_snapshot' => $frozenBlocks,
                'theme_snapshot' => $report->theme ?? [],
                'note' => $data['note'] ?? null,
            ]);
        });
    }
}

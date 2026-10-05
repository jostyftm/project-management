<?php

namespace App\Actions\Report;

use App\Enums\ReportVisibility;
use App\Models\WorkspaceReport;
use Illuminate\Support\Facades\DB;

class CreateReportAction
{
    /**
     * Crear un nuevo reporte en un workspace.
     */
    public function handle(int $workspaceId, int $ownerId, array $data): WorkspaceReport
    {
        return DB::transaction(function () use ($workspaceId, $ownerId, $data) {
            return WorkspaceReport::create([
                'workspace_id'  => $workspaceId,
                'owner_id'      => $ownerId,
                'title'         => $data['title'],
                'description'   => $data['description'] ?? null,
                'visibility'    => $data['visibility'] ?? ReportVisibility::DRAFT->value,
                'theme'         => $data['theme'] ?? $this->defaultTheme(),
                'layout_config' => $data['layout_config'] ?? [],
            ]);
        });
    }

    /** Tema por defecto del reporte */
    private function defaultTheme(): array
    {
        return [
            'primaryColor'    => '#6366f1',
            'accentColor'     => '#8b5cf6',
            'backgroundColor' => '#ffffff',
            'surfaceColor'    => '#f8fafc',
            'textColor'       => '#0f172a',
            'fontFamily'      => 'Inter, sans-serif',
            'borderRadius'    => '8px',
            'shadow'          => 'sm',
        ];
    }
}

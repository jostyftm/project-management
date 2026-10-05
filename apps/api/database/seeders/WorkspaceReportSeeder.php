<?php

namespace Database\Seeders;

use App\Enums\BlockType;
use App\Enums\ReportVisibility;
use App\Models\ReportBlock;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceReport;
use Illuminate\Database\Seeder;

class WorkspaceReportSeeder extends Seeder
{
    public function run(): void
    {
        $workspace = Workspace::first();
        $owner     = User::first();

        if (!$workspace || !$owner) {
            $this->command->warn('Se necesita al menos un workspace y un usuario para ejecutar el seeder.');
            return;
        }

        // Reporte de ejemplo: Weekly Executive Report
        $report = WorkspaceReport::create([
            'workspace_id' => $workspace->id,
            'owner_id'     => $owner->id,
            'title'        => 'Reporte Ejecutivo Semanal',
            'description'  => 'Resumen semanal del estado del proyecto con KPIs, narrativa y evolución de trabajo.',
            'visibility'   => ReportVisibility::WORKSPACE->value,
            'theme' => [
                'primaryColor'    => '#6366f1',
                'accentColor'     => '#8b5cf6',
                'backgroundColor' => '#ffffff',
                'surfaceColor'    => '#f8fafc',
                'textColor'       => '#0f172a',
                'fontFamily'      => 'Inter, sans-serif',
                'borderRadius'    => '8px',
                'shadow'          => 'sm',
            ],
            'layout_config' => ['columns' => 12],
        ]);

        // Bloque 1: KPI Row
        ReportBlock::create([
            'report_id' => $report->id,
            'type'      => BlockType::KPI_ROW->value,
            'title'     => 'KPIs del Proyecto',
            'position'  => 0,
            'width'     => 12,
            'config'    => [
                'project_ids' => [],
                'metrics'     => ['total', 'completed', 'in_progress', 'overdue'],
                'date_from'   => now()->subDays(30)->toDateString(),
                'date_to'     => now()->toDateString(),
            ],
        ]);

        // Bloque 2: Narrativa
        ReportBlock::create([
            'report_id' => $report->id,
            'type'      => BlockType::NARRATIVE->value,
            'title'     => 'Resumen del Período',
            'position'  => 1,
            'width'     => 12,
            'config'    => [
                'content'   => '<h2>Resumen Ejecutivo</h2><p>Este reporte muestra el estado general del equipo durante el período seleccionado. Los KPIs reflejan el avance en tareas completadas y el trabajo pendiente.</p>',
                'alignment' => 'left',
            ],
        ]);

        // Bloque 3: Line Chart
        ReportBlock::create([
            'report_id' => $report->id,
            'type'      => BlockType::LINE_CHART->value,
            'title'     => 'Evolución de Work Items Completados',
            'position'  => 2,
            'width'     => 12,
            'config'    => [
                'project_ids' => [],
                'metric'      => 'work_items_completed',
                'grouping'    => 'week',
                'date_from'   => now()->subDays(90)->toDateString(),
                'date_to'     => now()->toDateString(),
                'color'       => '#6366f1',
            ],
        ]);

        $this->command->info('Reporte de ejemplo creado: "' . $report->title . '" (ID: ' . $report->id . ')');
    }
}

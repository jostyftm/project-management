<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Services\CycleService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SyncCyclesIdealAndStatusBurndownCommand extends Command
{
    protected $signature = 'cycles:sync-ideal
                            {--project= : ID del proyecto específico a procesar}
                            {--cycle= : ID de un ciclo específico a reconstruir}
                            {--dry-run : Simula la reconstrucción sin modificar la base de datos}
                            {--force : Forzar ejecución sin confirmación}';

    protected $aliases = ['cycles:recalculate-ideal'];

    protected $description = 'Sincroniza estados de ciclos según fechas y reconstruye las gráficas (work items y estimates) de los ciclos de los proyectos';

    public function handle(CycleService $cycleService): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $projectId = $this->option('project');
        $cycleId = $this->option('cycle');

        $modeLabel = $dryRun ? ' [DRY-RUN]' : '';
        $this->info("🚀 Iniciando sincronización de ciclos y reconstrucción de gráficas{$modeLabel}...");

        $query = Project::query();

        if ($projectId) {
            $query->where('id', $projectId);
        } elseif ($cycleId) {
            $query->whereHas('cycles', fn ($q) => $q->where('cycles.id', $cycleId));
        }

        $projects = $query->with(['cycles'])->get();

        if ($projects->isEmpty()) {
            $this->warn('No se encontraron proyectos para procesar.');

            return Command::SUCCESS;
        }

        $totalUpdatedStatuses = 0;
        $totalCyclesProcessed = 0;
        $totals = [
            'pivots_adjusted' => 0,
            'completion_dates_fixed' => 0,
            'state_dates_fixed' => 0,
            'points_synced' => 0,
            'completion_snapshots_updated' => 0,
        ];
        $tableRows = [];

        foreach ($projects as $project) {
            $this->line("<comment>Procesando Proyecto:</comment> [{$project->id}] {$project->name} ({$project->identifier})");

            // 1. Sincronizar estados de los ciclos del proyecto por fecha
            $updatedStatuses = 0;
            if (! $dryRun) {
                $updatedStatuses = $cycleService->syncProjectCycleStatuses($project);
                $totalUpdatedStatuses += $updatedStatuses;
            }

            // 2. Reconstruir datos históricos y recalcular gráficas para cada ciclo
            $cyclesQuery = $project->cycles()->orderBy('start_date', 'asc');
            if ($cycleId) {
                $cyclesQuery->where('id', $cycleId);
            }
            $cycles = $cyclesQuery->get();

            $projectHadChanges = false;

            foreach ($cycles as $cycle) {
                $totalCyclesProcessed++;
                $stats = $cycleService->rebuildCycleTimelineData($cycle, $dryRun);

                foreach ($totals as $key => $val) {
                    $totals[$key] += $stats[$key] ?? 0;
                    if (($stats[$key] ?? 0) > 0) {
                        $projectHadChanges = true;
                    }
                }

                if (! $dryRun) {
                    $cycle->refresh();
                }

                $analytics = $cycleService->getAnalytics($cycle);

                $startStr = $cycle->start_date ? Carbon::parse($cycle->start_date)->format('Y-m-d') : 'N/A';
                $endStr = $cycle->end_date ? Carbon::parse($cycle->end_date)->format('Y-m-d') : 'N/A';

                $totalItems = $analytics['metrics']['total_items'] ?? 0;
                $totalPoints = $analytics['metrics']['total_points'] ?? 0;
                $todayIndex = (int) ($analytics['today_index'] ?? 0);

                $workItemsTimeline = $analytics['timeline']['work_items'] ?? [];
                $estimatesTimeline = $analytics['timeline']['estimates'] ?? [];

                $refItemPoint = $workItemsTimeline[$todayIndex] ?? end($workItemsTimeline) ?: [];
                $refEstPoint = $estimatesTimeline[$todayIndex] ?? end($estimatesTimeline) ?: [];

                $itemIdealPending = $refItemPoint['ideal_pending'] ?? ($analytics['breakdown']['today_ideal_pending'] ?? 0);
                $itemPending = $refItemPoint['pending'] ?? ($analytics['breakdown']['pending'] ?? 0);

                $estIdealPending = $refEstPoint['ideal_pending'] ?? 0;
                $estPending = $refEstPoint['pending'] ?? max(0, $totalPoints - ($analytics['metrics']['completed_points'] ?? 0));

                $statusLabel = match ($cycle->status) {
                    'CURRENT' => '<info>CURRENT</info>',
                    'UPCOMING' => '<comment>UPCOMING</comment>',
                    'COMPLETED' => '<fg=magenta>COMPLETED</fg=magenta>',
                    default => $cycle->status,
                };

                $datesRepaired = ($stats['completion_dates_fixed'] ?? 0) + ($stats['state_dates_fixed'] ?? 0);
                $fixesLabel = sprintf(
                    'piv:%d fec:%d pts:%d',
                    $stats['pivots_adjusted'] ?? 0,
                    $datesRepaired,
                    $stats['points_synced'] ?? 0
                );

                $tableRows[] = [
                    $project->identifier,
                    "#{$cycle->id} {$cycle->name}",
                    $statusLabel,
                    "{$startStr} → {$endStr}",
                    "{$totalItems} items ({$totalPoints} pts)",
                    "Ideal: {$itemIdealPending} | Real: {$itemPending}",
                    "Ideal: {$estIdealPending} | Real: {$estPending}",
                    $fixesLabel,
                ];
            }

            if (! $dryRun && ($projectHadChanges || $updatedStatuses > 0)) {
                $cycleService->clearProjectAnalyticsCache($project);
            }
        }

        if (! empty($tableRows)) {
            $this->table(
                ['Proyecto', 'Ciclo', 'Estado', 'Fechas', 'Alcance Total', 'Items (Pend)', 'Puntos (Pend)', 'Reconstrucción'],
                $tableRows
            );
        }

        $this->newLine();
        $this->info($dryRun ? '✓ Simulación (dry-run) completada sin modificar la BD.' : '✓ Reconstrucción de gráficas completada con éxito.');
        $this->line("  • Proyectos procesados: {$projects->count()}");
        $this->line("  • Ciclos evaluados y reconstruidos: {$totalCyclesProcessed}");
        $this->line("  • Estados de ciclos transicionados: {$totalUpdatedStatuses}");
        $this->line("  • Pivotes cycle_work_items ajustados por fechas: {$totals['pivots_adjusted']}");
        $this->line("  • Fechas de completado reparadas: {$totals['completion_dates_fixed']}");
        $this->line("  • Fechas de cambio de estado reparadas: {$totals['state_dates_fixed']}");
        $this->line("  • Puntos de estimación sincronizados: {$totals['points_synced']}");
        $this->line("  • Snapshots status_at_completion actualizados: {$totals['completion_snapshots_updated']}");

        return Command::SUCCESS;
    }
}

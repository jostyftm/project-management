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
                            {--force : Forzar ejecución sin confirmación}';

    protected $aliases = ['cycles:recalculate-ideal'];

    protected $description = 'Sincroniza estados de ciclos según la fecha actual y recalcula la línea de avance ideal para todos los proyectos';

    public function handle(CycleService $cycleService): int
    {
        $this->info('🚀 Iniciando sincronización de ciclos y recálculo de avance ideal...');

        $projectId = $this->option('project');
        $query = Project::query();

        if ($projectId) {
            $query->where('id', $projectId);
        }

        $projects = $query->with(['cycles'])->get();

        if ($projects->isEmpty()) {
            $this->warn('No se encontraron proyectos para procesar.');

            return Command::SUCCESS;
        }

        $totalUpdatedStatuses = 0;
        $totalCyclesProcessed = 0;
        $tableRows = [];

        foreach ($projects as $project) {
            $this->line("<comment>Procesando Proyecto:</comment> [{$project->id}] {$project->name} ({$project->identifier})");

            // 1. Sincronizar estados de los ciclos del proyecto por fecha
            $updatedStatuses = $cycleService->syncProjectCycleStatuses($project);
            $totalUpdatedStatuses += $updatedStatuses;

            // 2. Recalcular analíticas y línea de avance ideal para cada ciclo
            $cycles = $project->cycles()->orderBy('start_date', 'asc')->get();

            foreach ($cycles as $cycle) {
                $totalCyclesProcessed++;
                $analytics = $cycleService->getAnalytics($cycle);

                $startStr = $cycle->start_date ? Carbon::parse($cycle->start_date)->format('Y-m-d') : 'N/A';
                $endStr = $cycle->end_date ? Carbon::parse($cycle->end_date)->format('Y-m-d') : 'N/A';

                $totalItems = $analytics['metrics']['total_items'] ?? 0;
                $totalPoints = $analytics['metrics']['total_points'] ?? 0;
                $todayIdealPending = $analytics['breakdown']['today_ideal_pending'] ?? 0;
                $currentPending = $analytics['breakdown']['pending'] ?? 0;
                $trailing = $analytics['breakdown']['trailing_count'] ?? 0;

                $statusLabel = match ($cycle->status) {
                    'CURRENT' => '<info>CURRENT</info>',
                    'UPCOMING' => '<comment>UPCOMING</comment>',
                    'COMPLETED' => '<fg=magenta>COMPLETED</fg=magenta>',
                    default => $cycle->status,
                };

                $tableRows[] = [
                    $project->identifier,
                    "#{$cycle->id} {$cycle->name}",
                    $statusLabel,
                    "{$startStr} → {$endStr}",
                    "{$totalItems} items ({$totalPoints} pts)",
                    "Ideal: {$todayIdealPending} | Real: {$currentPending}",
                    $trailing > 0 ? "<fg=red>+{$trailing} retraso</fg=red>" : '<fg=green>Al día</fg=green>',
                ];
            }
        }

        if (! empty($tableRows)) {
            $this->table(
                ['Proyecto', 'Ciclo', 'Estado', 'Fechas', 'Alcance Total', 'Pendiente Hoy', 'Desempeño'],
                $tableRows
            );
        }

        $this->newLine();
        $this->info('✓ Procesamiento completado con éxito.');
        $this->line("  • Proyectos procesados: {$projects->count()}");
        $this->line("  • Ciclos evaluados y recalculados: {$totalCyclesProcessed}");
        $this->line("  • Estados de ciclos transicionados automáticamente: {$totalUpdatedStatuses}");

        return Command::SUCCESS;
    }
}

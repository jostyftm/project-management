<?php

namespace App\Console\Commands;

use App\Services\AutomationRuleService;
use App\Services\RecurringWorkItemService;
use Illuminate\Console\Command;

class RunPlaneAutomationsCommand extends Command
{
    protected $signature = 'plane:run-automations {--project= : ID del proyecto específico}';

    protected $description = 'Ejecuta tareas recurrentes vencidas y evalúa reglas de automatización programadas';

    public function handle(
        RecurringWorkItemService $recurringService,
        AutomationRuleService $ruleService
    ): int {
        $this->info('Iniciando procesamiento de automatizaciones de Plane...');

        // 1. Tareas recurrentes vencidas
        $recurringCount = $recurringService->runDueRecurringItems();
        $this->line("  ✓ Tareas recurrentes procesadas y generadas: {$recurringCount}");

        // 2. Reglas automáticas de temporizador
        $projectId = $this->option('project') ? (int) $this->option('project') : null;
        $rulesCount = $ruleService->runScheduledRules($projectId);
        $this->line("  ✓ Reglas de automatización programadas ejecutadas: {$rulesCount}");

        $this->info('Automatizaciones finalizadas con éxito.');

        return Command::SUCCESS;
    }
}

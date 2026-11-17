<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Services\ProjectExportService;
use Illuminate\Console\Command;

class ExportProjectCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'project:export
                            {project : ID numérico o identificador del proyecto (ej: JSVRC o 1)}
                            {--path= : Ruta absoluta o relativa del archivo de salida}
                            {--stdout : Imprimir el JSON directamente en consola sin guardar archivo}';

    /**
     * The console command description.
     */
    protected $description = 'Exporta la totalidad de la estructura de un proyecto (metadatos, estados, etiquetas, módulos, ciclos, tareas, DoD y relaciones) a formato JSON.';

    /**
     * Execute the console command.
     */
    public function handle(ProjectExportService $exporter): int
    {
        $projectKey = $this->argument('project');

        $project = is_numeric($projectKey)
            ? Project::withoutGlobalScopes()->find($projectKey)
            : Project::withoutGlobalScopes()->where('identifier', strtoupper($projectKey))->first();

        if (! $project) {
            $this->error("Proyecto '{$projectKey}' no encontrado.");

            return Command::FAILURE;
        }

        $this->info("Exportando proyecto {$project->name} [{$project->identifier}]...");

        try {
            $data = $exporter->export($project);
            $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            if ($this->option('stdout')) {
                $this->line($json);

                return Command::SUCCESS;
            }

            $outputPath = $this->option('path') ?: storage_path("app/exports/{$project->identifier}-export.json");
            $dir = dirname($outputPath);
            if (! is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            file_put_contents($outputPath, $json);

            $this->info('✓ ¡Exportación completada exitosamente!');
            $this->line("• Archivo generado: <comment>{$outputPath}</comment>");
            $this->line('• Tamaño: <comment>'.number_format(strlen($json) / 1024, 2).' KB</comment>');
            $this->line('• Total Work Items exportados: <comment>'.count($data['work_items']).'</comment>');

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("Error durante la exportación: {$e->getMessage()}");
            $this->line($e->getTraceAsString());

            return Command::FAILURE;
        }
    }
}

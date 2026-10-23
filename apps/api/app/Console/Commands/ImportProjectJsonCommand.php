<?php

namespace App\Console\Commands;

use App\Services\ProjectJsonImporterService;
use Illuminate\Console\Command;

class ImportProjectJsonCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'project:import-json
                            {file? : Ruta al archivo JSON (por defecto storage/app/imports/jsvr_coding.json)}
                            {--workspace=univalle : Slug del espacio de trabajo objetivo (ej: univalle)}
                            {--owner=joe.valencia@correounivalle.edu.co : Correo del líder / propietario del proyecto}
                            {--force : Si el proyecto existe, eliminarlo y recrearlo desde cero}';

    /**
     * The console command description.
     */
    protected $description = 'Importa y acomoda el dataset del proyecto jsvr_coding.json dentro del modelo de datos de Plane (Workspaces, Projects, Sprints, Módulos y WorkItems).';

    /**
     * Execute the console command.
     */
    public function handle(ProjectJsonImporterService $importer): int
    {
        $defaultPath = file_exists(database_path('data/jsvr_coding.json'))
            ? database_path('data/jsvr_coding.json')
            : storage_path('app/imports/jsvr_coding.json');

        $filePath = $this->argument('file') ?: $defaultPath;
        $workspaceSlug = (string) $this->option('workspace');
        $ownerEmail = (string) $this->option('owner');
        $forceClean = (bool) $this->option('force');

        $this->info('================================================================================');
        $this->info('           INICIANDO IMPORTACIÓN DE PROYECTO MAESTRÍA (JSON A PLANE)            ');
        $this->info('================================================================================');
        $this->line("• Archivo JSON:     <comment>{$filePath}</comment>");
        $this->line("• Workspace:        <comment>{$workspaceSlug}</comment>");
        $this->line("• Propietario:      <comment>{$ownerEmail}</comment>");
        $this->line('• Modo Force:       <comment>'.($forceClean ? 'Sí' : 'No').'</comment>');
        $this->newLine();

        try {
            $result = $importer->import(
                jsonFilePath: $filePath,
                workspaceSlug: $workspaceSlug,
                ownerEmail: $ownerEmail,
                forceClean: $forceClean
            );

            $this->info('✓ ¡Importación completada exitosamente!');
            $this->newLine();

            $this->table(
                ['Recurso', 'Detalle'],
                [
                    ['Workspace', "{$result['workspace']['name']} (ID: {$result['workspace']['id']}, Slug: {$result['workspace']['slug']})"],
                    ['Proyecto', "{$result['project']['name']} (Clave: {$result['project']['identifier']}, ID: {$result['project']['id']})"],
                    ['Propietario / Lead', "{$result['owner']['name']} ({$result['owner']['email']})"],
                    ['Total Work Items', $result['total_work_items']],
                    ['Jerarquías Padre-Hijo (Parent Links)', $result['parents_linked']],
                    ['Ciclos / Sprints Creados', $result['cycles_count']],
                    ['Asignaciones Tareas <-> Sprints', $result['cycles_work_items_linked']],
                    ['Módulos Funcionales Creados', $result['modules_count']],
                    ['Asignaciones Tareas <-> Módulos', $result['modules_work_items_linked']],
                ]
            );

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error durante la importación: '.$e->getMessage());
            $this->line($e->getTraceAsString());

            return Command::FAILURE;
        }
    }
}

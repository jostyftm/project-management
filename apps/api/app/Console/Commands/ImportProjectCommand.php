<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Workspace;
use App\Services\ProjectImportService;
use Illuminate\Console\Command;

class ImportProjectCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'project:import
                            {file : Ruta al archivo JSON que contiene el proyecto exportado}
                            {--workspace= : Slug o ID numérico del workspace de destino}
                            {--owner= : Correo electrónico del usuario que ejecutará la importación}
                            {--name= : Nombre personalizado para el nuevo proyecto}
                            {--identifier= : Clave identificadora personalizada para el proyecto (ej: PRJ)}
                            {--force : Si la clave ya existe en el workspace, eliminarla y recrearla desde cero}';

    /**
     * The console command description.
     */
    protected $description = 'Importa un proyecto completo desde un archivo JSON hacia un Workspace, recreando catálogos, jerarquías, sprints, módulos y tareas.';

    /**
     * Execute the console command.
     */
    public function handle(ProjectImportService $importer): int
    {
        $filePath = $this->argument('file');

        if (! file_exists($filePath) || ! is_readable($filePath)) {
            $this->error("El archivo especificado no existe o no tiene permisos de lectura: {$filePath}");

            return Command::FAILURE;
        }

        $rawContents = file_get_contents($filePath);
        $data = json_decode($rawContents, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($data)) {
            $this->error('El archivo no contiene un JSON válido: '.json_last_error_msg());

            return Command::FAILURE;
        }

        // Resolver Workspace
        $workspaceKey = $this->option('workspace');
        $workspace = null;

        if ($workspaceKey) {
            $workspace = is_numeric($workspaceKey)
                ? Workspace::find($workspaceKey)
                : Workspace::where('slug', $workspaceKey)->first();
        } else {
            $workspace = Workspace::first();
        }

        if (! $workspace) {
            $this->error('No se encontró ningún workspace objetivo. Especifique --workspace=<slug|id>');

            return Command::FAILURE;
        }

        // Resolver Actor / Owner
        $ownerEmail = $this->option('owner');
        $actor = null;

        if ($ownerEmail) {
            $actor = User::where('email', $ownerEmail)->first();
        }

        if (! $actor) {
            $actor = $workspace->owner ?? User::first();
        }

        if (! $actor) {
            $this->error('No se encontró un usuario válido para asociar como importador.');

            return Command::FAILURE;
        }

        $this->info('================================================================================');
        $this->info('                 INICIANDO IMPORTACIÓN DE PROYECTO (JSON)                       ');
        $this->info('================================================================================');
        $this->line("• Archivo origen:   <comment>{$filePath}</comment>");
        $this->line("• Workspace:        <comment>{$workspace->name} (Slug: {$workspace->slug})</comment>");
        $this->line("• Ejecutado por:    <comment>{$actor->name} ({$actor->email})</comment>");
        if ($this->option('name')) {
            $this->line("• Nombre forzado:   <comment>{$this->option('name')}</comment>");
        }
        if ($this->option('identifier')) {
            $this->line("• Clave forzada:    <comment>{$this->option('identifier')}</comment>");
        }
        $this->line('• Modo Force:       <comment>'.($this->option('force') ? 'Sí' : 'No').'</comment>');
        $this->newLine();

        try {
            $result = $importer->import(
                data: $data,
                workspace: $workspace,
                actor: $actor,
                options: [
                    'name' => $this->option('name'),
                    'identifier' => $this->option('identifier'),
                    'force' => (bool) $this->option('force'),
                ]
            );

            $this->info('✓ ¡Importación completada exitosamente!');
            $this->newLine();

            $this->table(
                ['Recurso', 'Detalle'],
                [
                    ['Workspace', "{$result['workspace']['name']} (Slug: {$result['workspace']['slug']})"],
                    ['Proyecto', "{$result['project']['name']} (Clave: {$result['project']['identifier']}, ID: {$result['project']['id']})"],
                    ['Líder Asignado', "{$result['lead']['name']} ({$result['lead']['email']})"],
                    ['Work Items Creados', $result['counts']['work_items']],
                    ['Jerarquías Padre-Hijo enlazadas', $result['counts']['parents_linked']],
                    ['Criterios DoD creados', $result['counts']['dod_items_created']],
                    ['Relaciones entre tareas creadas', $result['counts']['relations_created']],
                    ['Ciclos / Sprints', $result['counts']['cycles']],
                    ['Módulos Funcionales', $result['counts']['modules']],
                    ['Hitos (Milestones)', $result['counts']['milestones']],
                    ['Versiones (Releases)', $result['counts']['releases']],
                    ['Estados de Flujo', $result['counts']['states']],
                ]
            );

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("Error durante la importación: {$e->getMessage()}");
            $this->line($e->getTraceAsString());

            return Command::FAILURE;
        }
    }
}

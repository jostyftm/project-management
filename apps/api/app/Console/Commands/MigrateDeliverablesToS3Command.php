<?php

namespace App\Console\Commands;

use App\Models\WorkItemDeliverable;
use Aws\S3\S3Client;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Throwable;

class MigrateDeliverablesToS3Command extends Command
{
    protected $signature = 'deliverables:migrate-to-s3 {--dry-run : Ejecutar sin persistir cambios}';

    protected $description = 'Migra las evidencias y archivos locales existentes al bucket de S3 configurado y sanea registros';

    public function handle(): int
    {
        $isDryRun = $this->option('dry-run');
        $this->info($isDryRun ? '--- MIGRACIÓN EN MODO DRY-RUN ---' : '--- INICIANDO MIGRACIÓN A S3 ---');

        $s3Disk = Storage::disk('s3');
        $publicDisk = Storage::disk('public');
        $localDisk = Storage::disk('local');

        // Verificar o inicializar bucket
        $s3Config = config('filesystems.disks.s3');
        $bucket = $s3Config['bucket'] ?? 'project';

        try {
            if (! empty($s3Config['endpoint'])) {
                $client = new S3Client([
                    'version' => 'latest',
                    'region' => $s3Config['region'] ?? 'us-east-1',
                    'credentials' => [
                        'key' => $s3Config['key'],
                        'secret' => $s3Config['secret'],
                    ],
                    'endpoint' => $s3Config['endpoint'],
                    'use_path_style_endpoint' => $s3Config['use_path_style_endpoint'] ?? true,
                ]);

                if (! $client->doesBucketExist($bucket)) {
                    $this->warn("El bucket [{$bucket}] no existe. Creándolo en el servidor S3...");
                    if (! $isDryRun) {
                        $client->createBucket(['Bucket' => $bucket]);
                    }
                    $this->info("Bucket [{$bucket}] preparado.");
                }
            }
        } catch (Throwable $e) {
            $this->warn("Aviso al verificar bucket con S3Client: {$e->getMessage()}");
        }

        $deliverables = WorkItemDeliverable::whereNotNull('file_path')->get();
        $this->info("Total de entregables con archivo encontrados: {$deliverables->count()}");

        $migrated = 0;
        $alreadyOnS3 = 0;
        $cleanedCorrupted = 0;
        $missingFiles = 0;

        foreach ($deliverables as $deliverable) {
            $path = $deliverable->file_path;

            // 1. Limpieza de registros corruptos con file_path = '0'
            if ($path === '0' || empty($path)) {
                $this->warn("Registro ID {$deliverable->id} tiene file_path inválido ('0'). Limpiando...");
                if (! $isDryRun) {
                    $deliverable->update([
                        'file_path' => null,
                        'disk' => null,
                    ]);
                }
                $cleanedCorrupted++;

                continue;
            }

            // 2. Si ya existe en S3
            if ($s3Disk->exists($path)) {
                if ($deliverable->disk !== 's3') {
                    if (! $isDryRun) {
                        $deliverable->update(['disk' => 's3']);
                    }
                }
                $alreadyOnS3++;
                $this->line("ID {$deliverable->id}: Ya presente en S3 [{$path}].");

                continue;
            }

            // 3. Buscar en disco public o local
            $sourceContent = null;
            $foundIn = null;

            if ($publicDisk->exists($path)) {
                $sourceContent = $publicDisk->get($path);
                $foundIn = 'public';
            } elseif ($localDisk->exists($path)) {
                $sourceContent = $localDisk->get($path);
                $foundIn = 'local';
            }

            if ($sourceContent !== null) {
                $this->info("ID {$deliverable->id}: Copiando archivo desde disco [{$foundIn}] a S3 [{$path}]...");
                if (! $isDryRun) {
                    $s3Disk->put($path, $sourceContent);
                    $deliverable->update(['disk' => 's3']);
                }
                $migrated++;
            } else {
                $this->error("ID {$deliverable->id}: Archivo físico NO encontrado en almacenamiento local ni S3 [{$path}].");
                $missingFiles++;
            }
        }

        $this->newLine();
        $this->info('==========================================');
        $this->info('RESUMEN DE MIGRACIÓN');
        $this->info('==========================================');
        $this->info("Archivos migrados a S3:        {$migrated}");
        $this->info("Archivos ya existentes en S3:  {$alreadyOnS3}");
        $this->info("Registros corruptos saneados:  {$cleanedCorrupted}");
        $this->info("Archivos no encontrados:       {$missingFiles}");
        $this->info('==========================================');

        return self::SUCCESS;
    }
}

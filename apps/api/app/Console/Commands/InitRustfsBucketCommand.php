<?php

namespace App\Console\Commands;

use Aws\S3\S3Client;
use Illuminate\Console\Command;
use Throwable;

class InitRustfsBucketCommand extends Command
{
    protected $signature = 'storage:init-rustfs';

    protected $description = 'Crea el bucket por defecto en RustFS (almacenamiento de objetos S3-compatible)';

    public function handle(): int
    {
        $disk = config('filesystems.disks.rustfs');
        $bucket = $disk['bucket'] ?? 'sail';

        try {
            $client = new S3Client([
                'version' => 'latest',
                'region' => $disk['region'] ?? 'us-east-1',
                'credentials' => [
                    'key' => $disk['key'],
                    'secret' => $disk['secret'],
                ],
                'endpoint' => $disk['endpoint'] ?? null,
                'use_path_style_endpoint' => $disk['use_path_style_endpoint'] ?? true,
            ]);

            if ($client->doesBucketExist($bucket)) {
                $this->info("El bucket [{$bucket}] ya existe en RustFS.");

                return self::SUCCESS;
            }

            $client->createBucket(['Bucket' => $bucket]);
            $this->info("Bucket [{$bucket}] creado correctamente en RustFS.");
        } catch (Throwable $e) {
            $this->error("No se pudo crear el bucket [{$bucket}]: {$e->getMessage()}");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}

<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class MakeServiceCommand extends Command
{
    protected $signature = 'make:service 
        {name : Nombre del service} 
        {--model= : Nombre del modelo asociado} 
        {--api : Generar métodos CRUD automáticamente}';

    protected $description = 'Genera una clase Service con opción de asociar un modelo y generar CRUD básico con --api';

    public function handle()
    {
        $name = ucfirst($this->argument('name'));
        $model = $this->option('model') ? ucfirst($this->option('model')) : null;
        $generateCrud = $this->option('api');

        $stubPath = base_path('stubs/service.stub');
        $crudStubPath = base_path('stubs/crud-methods.stub');
        $servicePath = app_path("Services/{$name}.php");

        if (File::exists($servicePath)) {
            $this->error("❌ El service {$name} ya existe.");

            return;
        }

        if (! File::exists($stubPath)) {
            $this->error("❌ No se encontró el stub principal en {$stubPath}");

            return;
        }

        $stub = File::get($stubPath);

        $variable = $model ? Str::camel($model) : 'model';
        $crudMethods = '';

        if ($generateCrud) {
            if (! $model) {
                $this->error('❌ Debes usar también --model cuando usas --api.');

                return;
            }

            if (! File::exists($crudStubPath)) {
                $this->error("❌ No se encontró el stub CRUD en {$crudStubPath}");

                return;
            }

            $crudStub = File::get($crudStubPath);
            $crudMethods = str_replace(
                ['{{ model }}', '{{ variable }}'],
                [$model, $variable],
                $crudStub
            );
        }

        $stub = str_replace(
            ['{{ class }}', '{{ model }}', '{{ variable }}', '{{ crud_methods }}'],
            [$name, $model, $variable, $crudMethods],
            $stub
        );

        File::ensureDirectoryExists(app_path('Services'));
        File::put($servicePath, $stub);

        $this->info("✅ Service {$name} creado exitosamente.");
    }
}

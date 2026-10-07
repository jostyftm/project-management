<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Orquesta la Carga Inicial limpia y condicionalmente los datos de prueba / faker.
     */
    public function run(): void
    {
        // 1. Carga Inicial del Sistema (Configuración global, SuperAdmin, Workspace y Proyecto base)
        $this->call(InitialSetupSeeder::class);

        // 2. Datos de Prueba, Demos y Faker (Entornos no productivos o explícitamente solicitados)
        if (app()->environment(['local', 'testing', 'development']) || env('SEED_TEST_DATA', false)) {
            $this->call(TestingDataSeeder::class);
        }
    }
}

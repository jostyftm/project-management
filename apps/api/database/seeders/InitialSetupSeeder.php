<?php

namespace Database\Seeders;

use App\Models\InstanceSetting;
use App\Models\Label;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\State;
use App\Models\Teamspace;
use App\Models\User;
use App\Models\WorkItemType;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class InitialSetupSeeder extends Seeder
{
    /**
     * Carga inicial y datos maestros indispensables para el sistema (Core / Producción).
     */
    public function run(): void
    {
        // 1. Configuración Global de la Instancia (Govern / Instance Admin)
        InstanceSetting::updateOrCreate(
            ['id' => 1],
            [
                'instance_name' => 'Plane Self-Hosted Engine',
                'company_name' => 'Plane Core Systems',
                'app_url' => env('APP_URL', 'http://localhost:8000'),
                'allow_signups' => true,
                'invite_only' => false,
                'allowed_domains' => ['plane.local', 'example.com'],
                'smtp_host' => '127.0.0.1',
                'smtp_port' => 1025,
                'smtp_username' => 'system',
                'smtp_password' => 'secret',
                'smtp_from_email' => 'system@plane.local',
                'smtp_from_name' => 'Plane Core Notification',
                'smtp_encryption' => 'tls',
                'max_upload_size_mb' => 50,
                'enable_telemetry' => false,
            ]
        );

        // 2. Administradores Iniciales del Sistema
        $superAdmin = User::updateOrCreate(
            ['email' => 'admin@plane.local'],
            [
                'name' => 'Plane SuperAdmin',
                'password' => Hash::make('password'),
                'is_instance_admin' => true,
                'email_verified_at' => now(),
            ]
        );

        $devAdmin = User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin Developer',
                'password' => Hash::make('secret123'),
                'is_instance_admin' => true,
                'email_verified_at' => now(),
            ]
        );

        // 3. Workspace Principal
        $workspace = Workspace::updateOrCreate(
            ['slug' => 'plane-core'],
            [
                'name' => 'Plane Core Engine',
                'owner_id' => $superAdmin->id,
            ]
        );

        // Membresías administrativas en el Workspace
        foreach ([$superAdmin, $devAdmin] as $admin) {
            WorkspaceMember::updateOrCreate(
                [
                    'workspace_id' => $workspace->id,
                    'user_id' => $admin->id,
                ],
                [
                    'role' => 'ADMIN',
                ]
            );
        }

        // 4. Teamspaces Maestros Base
        Teamspace::updateOrCreate(
            ['workspace_id' => $workspace->id, 'slug' => 'eng'],
            [
                'name' => 'Engineering Core',
                'description' => 'Infraestructura, Backend y Frontend Web',
                'icon' => '💻',
                'created_by' => $superAdmin->id,
            ]
        );

        Teamspace::updateOrCreate(
            ['workspace_id' => $workspace->id, 'slug' => 'prd'],
            [
                'name' => 'Product Experience',
                'description' => 'Diseño UI/UX, investigación y roadmaps',
                'icon' => '🎨',
                'created_by' => $superAdmin->id,
            ]
        );

        // 5. Proyecto Base: Core Platform (ENG)
        $projectEng = Project::updateOrCreate(
            ['workspace_id' => $workspace->id, 'identifier' => 'ENG'],
            [
                'name' => 'Core Platform',
                'description' => 'Plataforma principal de gestión de proyectos, tareas en bloque y módulos.',
                'icon' => '⚡',
                'is_public' => true,
                'is_archived' => false,
                'lead_id' => $superAdmin->id,
                'estimate_system' => 'FIBONACCI',
            ]
        );

        // Membresías en el Proyecto Base
        ProjectMember::updateOrCreate(
            ['project_id' => $projectEng->id, 'user_id' => $superAdmin->id],
            ['role' => 'ADMIN']
        );
        ProjectMember::updateOrCreate(
            ['project_id' => $projectEng->id, 'user_id' => $devAdmin->id],
            ['role' => 'MEMBER']
        );

        // Estados del Workflow
        State::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Backlog'],
            ['workspace_id' => $workspace->id, 'group' => 'BACKLOG', 'color' => '#8C8C8C', 'sequence' => 10, 'is_default' => true]
        );
        State::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Por Hacer'],
            ['workspace_id' => $workspace->id, 'group' => 'UNSTARTED', 'color' => '#3B82F6', 'sequence' => 20, 'is_default' => false]
        );
        State::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'En Progreso'],
            ['workspace_id' => $workspace->id, 'group' => 'STARTED', 'color' => '#EAB308', 'sequence' => 30, 'is_default' => false]
        );
        State::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'En Revisión'],
            ['workspace_id' => $workspace->id, 'group' => 'STARTED', 'color' => '#A855F7', 'sequence' => 40, 'is_default' => false]
        );
        State::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Completado'],
            ['workspace_id' => $workspace->id, 'group' => 'COMPLETED', 'color' => '#22C55E', 'sequence' => 50, 'is_default' => false]
        );

        // Tipos de Work Items Base
        WorkItemType::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Característica'],
            ['workspace_id' => $workspace->id, 'icon' => 'sparkles', 'color' => '#3B82F6', 'description' => 'Nueva funcionalidad de usuario']
        );
        WorkItemType::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Defecto (Bug)'],
            ['workspace_id' => $workspace->id, 'icon' => 'bug', 'color' => '#EF4444', 'description' => 'Fallo o error en el sistema']
        );
        WorkItemType::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Tarea'],
            ['workspace_id' => $workspace->id, 'icon' => 'check-square', 'color' => '#10B981', 'description' => 'Trabajo técnico o tarea general']
        );

        // Etiquetas Base
        Label::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Frontend'],
            ['workspace_id' => $workspace->id, 'color' => '#60A5FA']
        );
        Label::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Backend API'],
            ['workspace_id' => $workspace->id, 'color' => '#34D399']
        );
        Label::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Seguridad'],
            ['workspace_id' => $workspace->id, 'color' => '#F87171']
        );
    }
}

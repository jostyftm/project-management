<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Comment;
use App\Models\Cycle;
use App\Models\Initiative;
use App\Models\InstanceSetting;
use App\Models\Label;
use App\Models\Milestone;
use App\Models\Module;
use App\Models\Page;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\Release;
use App\Models\State;
use App\Models\Sticky;
use App\Models\Teamspace;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemType;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
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

        // 2. Usuarios del Sistema
        $superAdmin = User::updateOrCreate(
            ['email' => 'admin@plane.local'],
            [
                'name' => 'Plane SuperAdmin',
                'password' => Hash::make('password'),
                'is_instance_admin' => true,
                'email_verified_at' => now(),
            ]
        );

        // Alias clásico para tests y compatibilidad
        $devAdmin = User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin Developer',
                'password' => Hash::make('secret123'),
                'is_instance_admin' => true,
                'email_verified_at' => now(),
            ]
        );

        $alex = User::updateOrCreate(
            ['email' => 'alex@plane.local'],
            [
                'name' => 'Alex Rivera (Tech Lead)',
                'password' => Hash::make('password'),
                'is_instance_admin' => false,
                'email_verified_at' => now(),
            ]
        );

        $sarah = User::updateOrCreate(
            ['email' => 'sarah@plane.local'],
            [
                'name' => 'Sarah Connor (Product)',
                'password' => Hash::make('password'),
                'is_instance_admin' => false,
                'email_verified_at' => now(),
            ]
        );

        $david = User::updateOrCreate(
            ['email' => 'david@plane.local'],
            [
                'name' => 'David Kim (Frontend)',
                'password' => Hash::make('password'),
                'is_instance_admin' => false,
                'email_verified_at' => now(),
            ]
        );

        $elena = User::updateOrCreate(
            ['email' => 'elena@plane.local'],
            [
                'name' => 'Elena Rostova (QA & Reliability)',
                'password' => Hash::make('password'),
                'is_instance_admin' => false,
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

        // Membresías en el Workspace
        $team = [$superAdmin, $devAdmin, $alex, $sarah, $david, $elena];
        foreach ($team as $member) {
            WorkspaceMember::updateOrCreate(
                [
                    'workspace_id' => $workspace->id,
                    'user_id' => $member->id,
                ],
                [
                    'role' => ($member->id === $superAdmin->id || $member->id === $devAdmin->id) ? 'ADMIN' : 'MEMBER',
                ]
            );
        }

        // 4. Teamspaces e Iniciativas
        $engTeamspace = Teamspace::updateOrCreate(
            ['workspace_id' => $workspace->id, 'slug' => 'eng'],
            [
                'name' => 'Engineering Core',
                'description' => 'Infraestructura, Backend y Frontend Web',
                'icon' => '💻',
                'created_by' => $superAdmin->id,
            ]
        );

        $productTeamspace = Teamspace::updateOrCreate(
            ['workspace_id' => $workspace->id, 'slug' => 'prd'],
            [
                'name' => 'Product Experience',
                'description' => 'Diseño UI/UX, investigación y roadmaps',
                'icon' => '🎨',
                'created_by' => $superAdmin->id,
            ]
        );

        $initiativeQ4 = Initiative::updateOrCreate(
            ['workspace_id' => $workspace->id, 'title' => 'Q4 Modernization & Velocity'],
            [
                'description' => 'Lanzamiento del editor en bloque tipo Notion, gobierno de instancias e invitaciones.',
                'status' => 'IN_PROGRESS',
                'target_date' => now()->addDays(60),
                'created_by' => $superAdmin->id,
            ]
        );

        // 5. Proyecto 1: Core Platform (ENG)
        $projectEng = Project::updateOrCreate(
            ['workspace_id' => $workspace->id, 'identifier' => 'ENG'],
            [
                'name' => 'Core Platform',
                'description' => 'Plataforma principal de gestión de proyectos, tareas en bloque y módulos.',
                'icon' => '⚡',
                'is_public' => true,
                'is_archived' => false,
                'lead_id' => $alex->id,
                'estimate_system' => 'FIBONACCI',
            ]
        );

        // Vincular proyecto con iniciativa
        $initiativeQ4->projects()->syncWithoutDetaching([$projectEng->id]);

        // Miembros del Proyecto ENG
        foreach ([$superAdmin, $devAdmin, $alex, $david, $elena] as $u) {
            ProjectMember::updateOrCreate(
                ['project_id' => $projectEng->id, 'user_id' => $u->id],
                ['role' => ($u->id === $alex->id || $u->id === $superAdmin->id) ? 'ADMIN' : 'MEMBER']
            );
        }

        // Estados del Proyecto ENG
        $stateBacklog = State::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Backlog'],
            ['workspace_id' => $workspace->id, 'group' => 'BACKLOG', 'color' => '#8C8C8C', 'sequence' => 10, 'is_default' => true]
        );
        $stateTodo = State::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Por Hacer'],
            ['workspace_id' => $workspace->id, 'group' => 'UNSTARTED', 'color' => '#3B82F6', 'sequence' => 20, 'is_default' => false]
        );
        $stateInProgress = State::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'En Progreso'],
            ['workspace_id' => $workspace->id, 'group' => 'STARTED', 'color' => '#EAB308', 'sequence' => 30, 'is_default' => false]
        );
        $stateInReview = State::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'En Revisión'],
            ['workspace_id' => $workspace->id, 'group' => 'STARTED', 'color' => '#A855F7', 'sequence' => 40, 'is_default' => false]
        );
        $stateDone = State::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Completado'],
            ['workspace_id' => $workspace->id, 'group' => 'COMPLETED', 'color' => '#22C55E', 'sequence' => 50, 'is_default' => false]
        );

        // Tipos de Work Items
        $typeFeature = WorkItemType::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Característica'],
            ['workspace_id' => $workspace->id, 'icon' => 'sparkles', 'color' => '#3B82F6', 'description' => 'Nueva funcionalidad de usuario']
        );
        $typeBug = WorkItemType::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Defecto (Bug)'],
            ['workspace_id' => $workspace->id, 'icon' => 'bug', 'color' => '#EF4444', 'description' => 'Fallo o error en el sistema']
        );
        $typeTask = WorkItemType::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Tarea'],
            ['workspace_id' => $workspace->id, 'icon' => 'check-square', 'color' => '#10B981', 'description' => 'Trabajo técnico o tarea general']
        );

        // Etiquetas
        $labelFrontend = Label::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Frontend'],
            ['workspace_id' => $workspace->id, 'color' => '#60A5FA']
        );
        $labelBackend = Label::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Backend API'],
            ['workspace_id' => $workspace->id, 'color' => '#34D399']
        );
        $labelSecurity = Label::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Seguridad'],
            ['workspace_id' => $workspace->id, 'color' => '#F87171']
        );

        // Milestones (Hitos)
        $milestoneV1 = Milestone::updateOrCreate(
            ['project_id' => $projectEng->id, 'title' => 'v1.0 Production Launch'],
            [
                'workspace_id' => $workspace->id,
                'description' => 'Despliegue de la versión 1.0 con editor en bloque, gobernanza y soporte de invitaciones.',
                'target_date' => now()->addDays(30),
                'status' => 'OPEN',
            ]
        );

        $milestoneV2 = Milestone::updateOrCreate(
            ['project_id' => $projectEng->id, 'title' => 'v1.1 Performance & Realtime'],
            [
                'workspace_id' => $workspace->id,
                'description' => 'Optimizaciones de rendimiento, WebSockets y caching distribuido.',
                'target_date' => now()->addDays(60),
                'status' => 'OPEN',
            ]
        );

        // Ciclos (Sprints)
        $cycle1 = Cycle::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Sprint 01 - Fundamentos y APIs'],
            [
                'workspace_id' => $workspace->id,
                'description' => 'Arquitectura inicial, base de datos y endpoints RESTful.',
                'start_date' => now()->subDays(14),
                'end_date' => now()->subDay(),
                'status' => 'COMPLETED',
            ]
        );

        $cycle2 = Cycle::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Sprint 02 - Editor en Bloque y Gobernanza'],
            [
                'workspace_id' => $workspace->id,
                'description' => 'Editor tipo Notion, invitaciones a proyectos y módulo Instance Admin.',
                'start_date' => now(),
                'end_date' => now()->addDays(14),
                'status' => 'CURRENT',
            ]
        );

        // Módulos
        $modEditor = Module::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Editor de Documentos en Bloque'],
            [
                'workspace_id' => $workspace->id,
                'description' => 'Editor Notion-style interactivo con comandos de barra (/), listas de verificación y código.',
                'status' => 'IN_PROGRESS',
                'lead_id' => $david->id,
                'target_date' => now()->addDays(20),
            ]
        );

        $modAdmin = Module::updateOrCreate(
            ['project_id' => $projectEng->id, 'name' => 'Panel de Gobernanza (Instance Admin)'],
            [
                'workspace_id' => $workspace->id,
                'description' => 'Configuración de toda la instancia, telemetría, salud del sistema y usuarios.',
                'status' => 'IN_PROGRESS',
                'lead_id' => $superAdmin->id,
                'target_date' => now()->addDays(15),
            ]
        );

        // Releases
        Release::updateOrCreate(
            ['project_id' => $projectEng->id, 'version' => 'v0.9.0-rc1'],
            [
                'workspace_id' => $workspace->id,
                'name' => 'Release Candidate v0.9.0',
                'description' => 'Versión preliminar estable con gestión de ciclos y vistas guardadas.',
                'status' => 'PUBLISHED',
                'published_at' => now()->subDays(2),
                'changelog' => "## Novedades en v0.9.0\n- Gestión de Ciclos y Módulos integrados.\n- Autenticación SDI y control por Workspace.\n- Paneles kanban y vistas personalizadas.",
                'created_by' => $superAdmin->id,
            ]
        );

        // 6. Work Items con bloques estructurados tipo Notion
        $wi1 = WorkItem::updateOrCreate(
            ['project_id' => $projectEng->id, 'sequence_id' => 1],
            [
                'workspace_id' => $workspace->id,
                'title' => 'Implementar Editor de Documentos tipo Notion para Descripciones',
                'description_json' => [
                    [
                        'id' => 'b1',
                        'type' => 'heading',
                        'content' => 'Requerimientos del Editor en Bloque',
                    ],
                    [
                        'id' => 'b2',
                        'type' => 'paragraph',
                        'content' => 'Las descripciones de los work items ahora utilizan un editor en bloque enriquecido similar al de las páginas/documentos.',
                    ],
                    [
                        'id' => 'b3',
                        'type' => 'checklist',
                        'content' => 'Soporte de comandos con barra "/" para insertar bloques rápidamente.',
                        'checked' => true,
                    ],
                    [
                        'id' => 'b4',
                        'type' => 'checklist',
                        'content' => 'Bloques de código con resaltado y títulos explicativos.',
                        'checked' => true,
                    ],
                    [
                        'id' => 'b5',
                        'type' => 'checklist',
                        'content' => 'Llamados de atención (callouts) con iconos personalizables.',
                        'checked' => true,
                    ],
                    [
                        'id' => 'b6',
                        'type' => 'code',
                        'content' => "// Bloque de ejemplo\nconst block = { type: 'heading', content: 'Plane Editor' };",
                    ],
                ],
                'state_id' => $stateInProgress->id,
                'type_id' => $typeFeature->id,
                'priority' => 'URGENT',
                'estimate_points' => 8,
                'estimate_value' => '8',
                'lead_id' => $david->id,
                'milestone_id' => $milestoneV1->id,
                'start_date' => now(),
                'target_date' => now()->addDays(7),
                'is_draft' => false,
                'created_by' => $superAdmin->id,
            ]
        );
        $wi1->assignees()->syncWithoutDetaching([$david->id, $alex->id]);
        $wi1->labels()->syncWithoutDetaching([$labelFrontend->id]);
        $wi1->cycles()->syncWithoutDetaching([$cycle2->id]);
        $wi1->modules()->syncWithoutDetaching([$modEditor->id]);
        $wi1->milestones()->syncWithoutDetaching([$milestoneV1->id]);

        $wi2 = WorkItem::updateOrCreate(
            ['project_id' => $projectEng->id, 'sequence_id' => 2],
            [
                'workspace_id' => $workspace->id,
                'title' => 'Módulo de Gobernanza y Administración de Instancia (Instance Admin)',
                'description_json' => [
                    [
                        'id' => 'b10',
                        'type' => 'heading',
                        'content' => 'Panel de Gobernanza Global',
                    ],
                    [
                        'id' => 'b11',
                        'type' => 'paragraph',
                        'content' => 'Inspirado en Plane Govern (instance-admin), permite gestionar configuración general, políticas de registro, diagnóstico del sistema y administración de usuarios.',
                    ],
                    [
                        'id' => 'b12',
                        'type' => 'callout',
                        'content' => 'Accesible desde el botón de herramientas en el encabezado superior.',
                    ],
                ],
                'state_id' => $stateInProgress->id,
                'type_id' => $typeFeature->id,
                'priority' => 'HIGH',
                'estimate_points' => 13,
                'estimate_value' => '13',
                'lead_id' => $superAdmin->id,
                'milestone_id' => $milestoneV1->id,
                'start_date' => now(),
                'target_date' => now()->addDays(10),
                'is_draft' => false,
                'created_by' => $superAdmin->id,
            ]
        );
        $wi2->assignees()->syncWithoutDetaching([$superAdmin->id]);
        $wi2->labels()->syncWithoutDetaching([$labelBackend->id, $labelSecurity->id]);
        $wi2->cycles()->syncWithoutDetaching([$cycle2->id]);
        $wi2->modules()->syncWithoutDetaching([$modAdmin->id]);
        $wi2->milestones()->syncWithoutDetaching([$milestoneV1->id]);

        $wi3 = WorkItem::updateOrCreate(
            ['project_id' => $projectEng->id, 'sequence_id' => 3],
            [
                'workspace_id' => $workspace->id,
                'title' => 'Invitaciones al Proyecto con Tokens y Enlaces de Acceso',
                'description_json' => [
                    [
                        'id' => 'b20',
                        'type' => 'paragraph',
                        'content' => 'Permite invitar nuevos colaboradores por correo o vincular usuarios existentes del sistema con roles definidos (ADMIN, MEMBER, VIEWER).',
                    ],
                ],
                'state_id' => $stateTodo->id,
                'type_id' => $typeFeature->id,
                'priority' => 'MEDIUM',
                'estimate_points' => 5,
                'estimate_value' => '5',
                'lead_id' => $alex->id,
                'milestone_id' => $milestoneV1->id,
                'start_date' => now()->addDays(2),
                'target_date' => now()->addDays(12),
                'is_draft' => false,
                'created_by' => $alex->id,
            ]
        );
        $wi3->assignees()->syncWithoutDetaching([$alex->id]);
        $wi3->labels()->syncWithoutDetaching([$labelBackend->id]);
        $wi3->cycles()->syncWithoutDetaching([$cycle2->id]);
        $wi3->milestones()->syncWithoutDetaching([$milestoneV1->id]);

        $wi4 = WorkItem::updateOrCreate(
            ['project_id' => $projectEng->id, 'sequence_id' => 4],
            [
                'workspace_id' => $workspace->id,
                'title' => 'Configuración de Caché Redis y Model Invalidation Triggers',
                'description_json' => [
                    [
                        'id' => 'b30',
                        'type' => 'paragraph',
                        'content' => 'Optimización de respuestas con etiquetado de caché y limpieza automática en eventos de modelo.',
                    ],
                ],
                'state_id' => $stateDone->id,
                'type_id' => $typeTask->id,
                'priority' => 'HIGH',
                'estimate_points' => 5,
                'estimate_value' => '5',
                'lead_id' => $alex->id,
                'start_date' => now()->subDays(10),
                'target_date' => now()->subDays(2),
                'is_draft' => false,
                'created_by' => $alex->id,
            ]
        );
        $wi4->assignees()->syncWithoutDetaching([$alex->id]);
        $wi4->cycles()->syncWithoutDetaching([$cycle1->id]);

        // Comentarios
        Comment::create([
            'workspace_id' => $workspace->id,
            'project_id' => $projectEng->id,
            'work_item_id' => $wi1->id,
            'user_id' => $david->id,
            'content' => '¡El editor en bloque funciona genial! Acabo de probar los comandos "/" y los bloques de checklist.',
        ]);

        // Actividades de auditoría
        Activity::create([
            'workspace_id' => $workspace->id,
            'project_id' => $projectEng->id,
            'actor_id' => $superAdmin->id,
            'entity_type' => 'WORK_ITEM',
            'entity_id' => $wi1->id,
            'action' => 'CREATED',
            'changes_diff' => ['title' => $wi1->title],
        ]);

        // 7. Wiki Pages del Proyecto
        $pageArch = Page::updateOrCreate(
            ['workspace_id' => $workspace->id, 'project_id' => $projectEng->id, 'title' => 'Arquitectura del Sistema Plane'],
            [
                'content_json' => [
                    ['id' => 'p1', 'type' => 'heading', 'content' => 'Arquitectura SDI y Plane Core'],
                    ['id' => 'p2', 'type' => 'paragraph', 'content' => 'El backend sigue estrictamente el estándar sdi_service_template con controladores delgados, FormRequests y servicios desacoplados.'],
                ],
                'is_locked' => false,
                'created_by' => $alex->id,
                'views_count' => 15,
            ]
        );

        Page::updateOrCreate(
            ['workspace_id' => $workspace->id, 'project_id' => $projectEng->id, 'title' => 'Guía de Contribución al Frontend'],
            [
                'parent_id' => $pageArch->id,
                'content_json' => [
                    ['id' => 'p10', 'type' => 'heading', 'content' => 'Tecnologías del Cliente'],
                    ['id' => 'p11', 'type' => 'paragraph', 'content' => 'Next.js App Router, Tailwind CSS v4, Lucide React e interactividad reactiva en tiempo real.'],
                ],
                'is_locked' => false,
                'created_by' => $david->id,
                'views_count' => 8,
            ]
        );

        // 8. Stickies (Tablero de notas adhesivas)
        Sticky::updateOrCreate(
            ['workspace_id' => $workspace->id, 'content' => '¡Bienvenido a Plane Core! Accede a Gobernanza desde el icono de configuración en la barra superior.'],
            [
                'color' => '#FEF08A',
                'is_pinned' => true,
                'is_private' => false,
                'position_x' => 40,
                'position_y' => 40,
                'created_by' => $superAdmin->id,
            ]
        );

        Sticky::updateOrCreate(
            ['workspace_id' => $workspace->id, 'content' => 'Revisión de Sprint 02 programada para el próximo viernes a las 15:00 UTC.'],
            [
                'color' => '#BAE6FD',
                'is_pinned' => true,
                'is_private' => false,
                'position_x' => 320,
                'position_y' => 40,
                'created_by' => $alex->id,
            ]
        );
    }
}

<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Comment;
use App\Models\Cycle;
use App\Models\Initiative;
use App\Models\Label;
use App\Models\Milestone;
use App\Models\Module;
use App\Models\Page;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\Release;
use App\Models\State;
use App\Models\Sticky;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemType;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestingDataSeeder extends Seeder
{
    /**
     * Datos de prueba, demos, faker y simulación de KPIs para desarrollo y testing.
     */
    public function run(): void
    {
        // 1. Obtener recursos base creados por InitialSetupSeeder
        $workspace = Workspace::where('slug', 'plane-core')->first();
        if (! $workspace) {
            $this->call(InitialSetupSeeder::class);
            $workspace = Workspace::where('slug', 'plane-core')->firstOrFail();
        }

        $superAdmin = User::where('email', 'admin@plane.local')->firstOrFail();
        $projectEng = Project::where('workspace_id', $workspace->id)->where('identifier', 'ENG')->firstOrFail();

        // 2. Colaboradores de Demostración y Pruebas
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

        // Membresías en el Workspace
        foreach ([$alex, $sarah, $david, $elena] as $member) {
            WorkspaceMember::updateOrCreate(
                [
                    'workspace_id' => $workspace->id,
                    'user_id' => $member->id,
                ],
                [
                    'role' => 'MEMBER',
                ]
            );
        }

        // Asignar Alex como Lead del proyecto ENG y vincular miembros
        $projectEng->update(['lead_id' => $alex->id]);

        foreach ([$alex, $david, $elena] as $u) {
            ProjectMember::updateOrCreate(
                ['project_id' => $projectEng->id, 'user_id' => $u->id],
                ['role' => ($u->id === $alex->id) ? 'ADMIN' : 'MEMBER']
            );
        }

        // Estados, tipos y etiquetas del proyecto
        $stateTodo = State::where('project_id', $projectEng->id)->where('group', 'UNSTARTED')->firstOrFail();
        $stateInProgress = State::where('project_id', $projectEng->id)->where('name', 'En Progreso')->firstOrFail();
        $stateDone = State::where('project_id', $projectEng->id)->where('group', 'COMPLETED')->firstOrFail();

        $typeFeature = WorkItemType::where('project_id', $projectEng->id)->where('name', 'Característica')->firstOrFail();
        $typeTask = WorkItemType::where('project_id', $projectEng->id)->where('name', 'Tarea')->firstOrFail();

        $labelFrontend = Label::where('project_id', $projectEng->id)->where('name', 'Frontend')->firstOrFail();
        $labelBackend = Label::where('project_id', $projectEng->id)->where('name', 'Backend API')->firstOrFail();
        $labelSecurity = Label::where('project_id', $projectEng->id)->where('name', 'Seguridad')->firstOrFail();

        // 3. Iniciativa de Demostración
        $initiativeQ4 = Initiative::updateOrCreate(
            ['workspace_id' => $workspace->id, 'title' => 'Q4 Modernization & Velocity'],
            [
                'description' => 'Lanzamiento del editor en bloque tipo Notion, gobierno de instancias e invitaciones.',
                'status' => 'IN_PROGRESS',
                'target_date' => now()->addDays(60),
                'created_by' => $superAdmin->id,
            ]
        );
        $initiativeQ4->projects()->syncWithoutDetaching([$projectEng->id]);

        // 4. Milestones (Hitos) de Prueba
        $milestoneV1 = Milestone::updateOrCreate(
            ['project_id' => $projectEng->id, 'title' => 'v1.0 Production Launch'],
            [
                'workspace_id' => $workspace->id,
                'description' => 'Despliegue de la versión 1.0 con editor en bloque, gobernanza y soporte de invitaciones.',
                'target_date' => now()->addDays(30),
                'status' => 'OPEN',
            ]
        );

        Milestone::updateOrCreate(
            ['project_id' => $projectEng->id, 'title' => 'v1.1 Performance & Realtime'],
            [
                'workspace_id' => $workspace->id,
                'description' => 'Optimizaciones de rendimiento, WebSockets y caching distribuido.',
                'target_date' => now()->addDays(60),
                'status' => 'OPEN',
            ]
        );

        // 5. Ciclos (Sprints) de Prueba
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

        // 6. Módulos de Prueba
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

        // 7. Releases de Prueba
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

        // 8. Work Items con Bloques Estructurados tipo Notion
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

        // 9. Comentarios y Auditoría de Prueba
        Comment::create([
            'workspace_id' => $workspace->id,
            'project_id' => $projectEng->id,
            'work_item_id' => $wi1->id,
            'user_id' => $david->id,
            'content' => '¡El editor en bloque funciona genial! Acabo de probar los comandos "/" y los bloques de checklist.',
        ]);

        Activity::create([
            'workspace_id' => $workspace->id,
            'project_id' => $projectEng->id,
            'actor_id' => $superAdmin->id,
            'entity_type' => 'WORK_ITEM',
            'entity_id' => $wi1->id,
            'action' => 'CREATED',
            'changes_diff' => ['title' => $wi1->title],
        ]);

        // 10. Wiki Pages del Proyecto
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

        // 11. Stickies de Demostración
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

        // 12. Reportes de Demostración
        $this->call(WorkspaceReportSeeder::class);

        // 13. Simulación Realista de KPIs de 90 Días
        $this->call(KpiProjectSimulationSeeder::class);
    }
}

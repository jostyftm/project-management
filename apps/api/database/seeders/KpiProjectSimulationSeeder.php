<?php

namespace Database\Seeders;

use App\Models\Cycle;
use App\Models\Label;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\WorkItemType;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class KpiProjectSimulationSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->info('Iniciando simulación de proyecto Fintech (3 meses, entregas quincenales)...');

        // 1. Obtener o crear Workspace base
        $workspace = Workspace::firstOrCreate(
            ['slug' => 'plane-core'],
            [
                'name' => 'Plane Core Engine',
                'owner_id' => 1,
            ]
        );

        // 2. Crear los 7 integrantes del equipo multidisciplinario
        $passwordHash = Hash::make('password');

        $usersData = [
            'andres' => [
                'name' => 'Andrés Mendoza (Scrum Master)',
                'email' => 'andres.sm@plane.local',
                'role' => 'ADMIN',
                'avatar_url' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            ],
            'elena' => [
                'name' => 'Elena Vega (Frontend Lead)',
                'email' => 'elena.front@plane.local',
                'role' => 'MEMBER',
                'avatar_url' => 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
            ],
            'lucas' => [
                'name' => 'Lucas Silva (Frontend Dev)',
                'email' => 'lucas.front@plane.local',
                'role' => 'MEMBER',
                'avatar_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            ],
            'mateo' => [
                'name' => 'Mateo Rojas (Backend Lead)',
                'email' => 'mateo.back@plane.local',
                'role' => 'ADMIN',
                'avatar_url' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
            ],
            'valeria' => [
                'name' => 'Valeria Gómez (Backend Dev)',
                'email' => 'valeria.back@plane.local',
                'role' => 'MEMBER',
                'avatar_url' => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
            ],
            'camila' => [
                'name' => 'Camila Torres (QA Engineer)',
                'email' => 'camila.qa@plane.local',
                'role' => 'MEMBER',
                'avatar_url' => 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
            ],
            'diego' => [
                'name' => 'Diego Navarro (DevOps / SRE)',
                'email' => 'diego.infra@plane.local',
                'role' => 'MEMBER',
                'avatar_url' => 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
            ],
        ];

        /** @var array<string, User> $team */
        $team = [];
        foreach ($usersData as $key => $u) {
            $user = User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => $passwordHash,
                    'is_instance_admin' => ($u['role'] === 'ADMIN'),
                    'email_verified_at' => Carbon::now(),
                ]
            );

            WorkspaceMember::updateOrCreate(
                ['workspace_id' => $workspace->id, 'user_id' => $user->id],
                ['role' => $u['role']]
            );

            $team[$key] = $user;
        }

        // 3. Crear Proyecto FIN: Plataforma Financiera SDI
        $project = Project::updateOrCreate(
            ['workspace_id' => $workspace->id, 'identifier' => 'FIN'],
            [
                'name' => 'Plataforma Financiera SDI (Fintech Cloud)',
                'description' => 'Sistema empresarial de procesamiento de pagos, reportería analítica y billeteras digitales. Iniciado hace 3 meses con cadencia quincenal de sprints.',
                'icon' => '💳',
                'is_public' => true,
                'is_archived' => false,
                'lead_id' => $team['mateo']->id,
                'estimate_system' => 'FIBONACCI',
            ]
        );

        // Membresías en el Proyecto
        foreach ($usersData as $key => $u) {
            ProjectMember::updateOrCreate(
                ['project_id' => $project->id, 'user_id' => $team[$key]->id],
                ['role' => $u['role']]
            );
        }

        // 4. Estados del Proyecto
        $states = [
            'backlog' => State::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Backlog'],
                ['workspace_id' => $workspace->id, 'group' => 'BACKLOG', 'color' => '#8C8C8C', 'sequence' => 10, 'is_default' => true]
            ),
            'todo' => State::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Por Hacer'],
                ['workspace_id' => $workspace->id, 'group' => 'UNSTARTED', 'color' => '#3B82F6', 'sequence' => 20, 'is_default' => false]
            ),
            'in_progress' => State::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'En Progreso'],
                ['workspace_id' => $workspace->id, 'group' => 'STARTED', 'color' => '#EAB308', 'sequence' => 30, 'is_default' => false]
            ),
            'qa' => State::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'En Pruebas / QA'],
                ['workspace_id' => $workspace->id, 'group' => 'STARTED', 'color' => '#A855F7', 'sequence' => 40, 'is_default' => false]
            ),
            'completed' => State::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Completado'],
                ['workspace_id' => $workspace->id, 'group' => 'COMPLETED', 'color' => '#22C55E', 'sequence' => 50, 'is_default' => false]
            ),
            'cancelled' => State::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Descartado'],
                ['workspace_id' => $workspace->id, 'group' => 'CANCELLED', 'color' => '#EF4444', 'sequence' => 60, 'is_default' => false]
            ),
        ];

        // 5. Tipos de Work Items
        $types = [
            'feature' => WorkItemType::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Característica'],
                ['workspace_id' => $workspace->id, 'icon' => 'sparkles', 'color' => '#3B82F6', 'description' => 'Nueva funcionalidad de usuario']
            ),
            'bug' => WorkItemType::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Defecto (Bug)'],
                ['workspace_id' => $workspace->id, 'icon' => 'bug', 'color' => '#EF4444', 'description' => 'Error o fallo reportado en pruebas']
            ),
            'task' => WorkItemType::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Tarea Técnica'],
                ['workspace_id' => $workspace->id, 'icon' => 'check-square', 'color' => '#10B981', 'description' => 'Refactor o tarea de desarrollo']
            ),
            'infra' => WorkItemType::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Infraestructura & CI/CD'],
                ['workspace_id' => $workspace->id, 'icon' => 'server', 'color' => '#F59E0B', 'description' => 'DevOps, Docker, pipelines y cloud']
            ),
        ];

        // 6. Etiquetas
        $labels = [
            'front' => Label::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Frontend'],
                ['workspace_id' => $workspace->id, 'color' => '#60A5FA']
            ),
            'back' => Label::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Backend API'],
                ['workspace_id' => $workspace->id, 'color' => '#34D399']
            ),
            'infra' => Label::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Infraestructura'],
                ['workspace_id' => $workspace->id, 'color' => '#FBBF24']
            ),
            'qa' => Label::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'QA & Pruebas'],
                ['workspace_id' => $workspace->id, 'color' => '#C084FC']
            ),
            'sec' => Label::updateOrCreate(
                ['project_id' => $project->id, 'name' => 'Seguridad'],
                ['workspace_id' => $workspace->id, 'color' => '#F87171']
            ),
        ];

        // 7. Ciclos Quincenales (Sprints cada 15 días desde hace 90 días)
        $now = Carbon::now();
        $cyclesConfig = [
            1 => [
                'name' => 'Sprint 01 - Fundación y Arquitectura Base',
                'description' => 'Modelado de base de datos PostgreSQL, configuración Docker Compose y scaffold Next.js.',
                'start_date' => $now->copy()->subDays(90),
                'end_date' => $now->copy()->subDays(75),
                'status' => 'COMPLETED',
            ],
            2 => [
                'name' => 'Sprint 02 - Autenticación y Modelado Core',
                'description' => 'Integración con SDI Auth, JWT tokens, RBAC y vistas iniciales de login y dashboard.',
                'start_date' => $now->copy()->subDays(75),
                'end_date' => $now->copy()->subDays(60),
                'status' => 'COMPLETED',
            ],
            3 => [
                'name' => 'Sprint 03 - API Transaccional y UI Base',
                'description' => 'Endpoints de transacciones bancarias, transferencias P2P y componentes de formulario.',
                'start_date' => $now->copy()->subDays(60),
                'end_date' => $now->copy()->subDays(45),
                'status' => 'COMPLETED',
            ],
            4 => [
                'name' => 'Sprint 04 - Billeteras Digitales y QA Regresión',
                'description' => 'Módulo de balances, histórico de movimientos y batería de pruebas automatizadas Pest/Jest.',
                'start_date' => $now->copy()->subDays(45),
                'end_date' => $now->copy()->subDays(30),
                'status' => 'COMPLETED',
            ],
            5 => [
                'name' => 'Sprint 05 - Reportería Analítica y CI/CD',
                'description' => 'Exportación de reportes PDF/Excel, pipeline GitLab CI y despliegue multi-entorno.',
                'start_date' => $now->copy()->subDays(30),
                'end_date' => $now->copy()->subDays(15),
                'status' => 'COMPLETED',
            ],
            6 => [
                'name' => 'Sprint 06 - Hardening de Seguridad y Optimización',
                'description' => 'Auditoría OWASP, caché en Redis, límites de tasa (rate limiting) y estabilización final.',
                'start_date' => $now->copy()->subDays(15),
                'end_date' => $now->copy()->addDay(),
                'status' => 'CURRENT',
            ],
            7 => [
                'name' => 'Sprint 07 - Pagos Recurrentes e Integraciones',
                'description' => 'Suscripciones periódicas, webhooks y pasarelas de terceros.',
                'start_date' => $now->copy()->addDay(),
                'end_date' => $now->copy()->addDays(15),
                'status' => 'PLANNED',
            ],
        ];

        $cycles = [];
        foreach ($cyclesConfig as $num => $c) {
            $cycles[$num] = Cycle::updateOrCreate(
                ['project_id' => $project->id, 'name' => $c['name']],
                [
                    'workspace_id' => $workspace->id,
                    'description' => $c['description'],
                    'start_date' => $c['start_date'],
                    'end_date' => $c['end_date'],
                    'status' => $c['status'],
                ]
            );
        }

        // 8. Definición de Work Items Representativos (78 ítems distribuidos)
        $itemsBlueprint = $this->getItemsBlueprint($team, $types, $states, $labels, $cycles, $now);

        $seq = 1;
        foreach ($itemsBlueprint as $item) {
            $wi = WorkItem::updateOrCreate(
                ['project_id' => $project->id, 'sequence_id' => $seq],
                [
                    'workspace_id' => $workspace->id,
                    'title' => $item['title'],
                    'state_id' => $item['state_id'],
                    'type_id' => $item['type_id'],
                    'priority' => $item['priority'],
                    'estimate_points' => $item['points'],
                    'estimate_value' => (string) $item['points'],
                    'start_date' => $item['start_date'],
                    'target_date' => $item['target_date'],
                    'completed_at' => $item['completed_at'],
                    'created_at' => $item['created_at'],
                    'updated_at' => $item['completed_at'] ?? $item['start_date'] ?? $item['created_at'],
                    'is_draft' => false,
                    'created_by' => $team['andres']->id,
                ]
            );

            // Asignar miembros
            if (! empty($item['assignees'])) {
                $wi->assignees()->syncWithoutDetaching($item['assignees']);
            }

            // Asignar labels
            if (! empty($item['labels'])) {
                $wi->labels()->syncWithoutDetaching($item['labels']);
            }

            // Asignar ciclo
            if (! empty($item['cycle_id'])) {
                $wi->cycles()->syncWithoutDetaching([$item['cycle_id']]);
            }

            $seq++;
        }

        $this->command?->info("Simulación completada con éxito: {$seq} work items creados para el proyecto {$project->identifier}.");
    }

    /**
     * Construye el blueprint completo con métricas realistas y coherentes.
     */
    private function getItemsBlueprint(
        array $team,
        array $types,
        array $states,
        array $labels,
        array $cycles,
        Carbon $now
    ): array {
        $blueprint = [];

        // -------------------------------------------------------------
        // SPRINT 01 (Hace 90d a 75d): 8 ítems, 23 SP entregados / 28 SP comprometidos
        // -------------------------------------------------------------
        $s1Start = $now->copy()->subDays(90);
        $s1End = $now->copy()->subDays(75);

        $blueprint[] = [
            'title' => 'Diseño de arquitectura de base de datos para cuentas y transacciones',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s1Start->copy()->addDays(1),
            'target_date' => $s1Start->copy()->addDays(5),
            'completed_at' => $s1Start->copy()->addDays(4)->setHour(17), // 3d cycle time
            'created_at' => $s1Start->copy(),
            'assignees' => [$team['mateo']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[1]->id,
        ];
        $blueprint[] = [
            'title' => 'Configuración de ambiente Docker Compose para PostgreSQL y Redis',
            'state_id' => $states['completed']->id,
            'type_id' => $types['infra']->id,
            'priority' => 'HIGH',
            'points' => 3,
            'start_date' => $s1Start->copy()->addDays(1),
            'target_date' => $s1Start->copy()->addDays(4),
            'completed_at' => $s1Start->copy()->addDays(3)->setHour(14), // 2d cycle time
            'created_at' => $s1Start->copy(),
            'assignees' => [$team['diego']->id],
            'labels' => [$labels['infra']->id],
            'cycle_id' => $cycles[1]->id,
        ];
        $blueprint[] = [
            'title' => 'Scaffolding de proyecto Next.js con Tailwind CSS y componentes base',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'MEDIUM',
            'points' => 5,
            'start_date' => $s1Start->copy()->addDays(2),
            'target_date' => $s1Start->copy()->addDays(7),
            'completed_at' => $s1Start->copy()->addDays(6)->setHour(18), // 4d cycle time
            'created_at' => $s1Start->copy(),
            'assignees' => [$team['elena']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[1]->id,
        ];
        $blueprint[] = [
            'title' => 'Configuración de endpoints de salud (Healthchecks) y telemetría',
            'state_id' => $states['completed']->id,
            'type_id' => $types['infra']->id,
            'priority' => 'LOW',
            'points' => 2,
            'start_date' => $s1Start->copy()->addDays(3),
            'target_date' => $s1Start->copy()->addDays(6),
            'completed_at' => $s1Start->copy()->addDays(5)->setHour(11), // 2d cycle time
            'created_at' => $s1Start->copy(),
            'assignees' => [$team['diego']->id],
            'labels' => [$labels['infra']->id],
            'cycle_id' => $cycles[1]->id,
        ];
        $blueprint[] = [
            'title' => 'Definición de entidades y migraciones iniciales de Wallet y Ledger',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s1Start->copy()->addDays(4),
            'target_date' => $s1Start->copy()->addDays(9),
            'completed_at' => $s1Start->copy()->addDays(8)->setHour(16), // 4d cycle time
            'created_at' => $s1Start->copy()->addDays(1),
            'assignees' => [$team['valeria']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[1]->id,
        ];
        $blueprint[] = [
            'title' => 'Estructura de navegación y componentes de Layout responsive',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'MEDIUM',
            'points' => 3,
            'start_date' => $s1Start->copy()->addDays(5),
            'target_date' => $s1Start->copy()->addDays(10),
            'completed_at' => $s1Start->copy()->addDays(9)->setHour(12), // 4d cycle time
            'created_at' => $s1Start->copy()->addDays(2),
            'assignees' => [$team['lucas']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[1]->id,
        ];
        $blueprint[] = [
            'title' => 'Plan maestro de pruebas y configuración de entorno de pruebas QA',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'MEDIUM',
            'points' => 2,
            'start_date' => $s1Start->copy()->addDays(6),
            'target_date' => $s1Start->copy()->addDays(11),
            'completed_at' => $s1Start->copy()->addDays(9)->setHour(15), // 3d cycle time
            'created_at' => $s1Start->copy()->addDays(3),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[1]->id,
        ];
        $blueprint[] = [
            'title' => 'Spike técnico y pruebas de latencia con proveedores de pasarela legados',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'LOW',
            'points' => 5,
            'start_date' => $s1Start->copy()->addDays(2),
            'target_date' => $s1Start->copy()->addDays(15),
            'completed_at' => $s1Start->copy()->addDays(19)->setHour(18), // 17d cycle time (alimenta bucket 16d+)
            'created_at' => $s1Start->copy(),
            'assignees' => [$team['mateo']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[1]->id,
        ];

        // -------------------------------------------------------------
        // SPRINT 02 (Hace 75d a 60d): 10 ítems, 31 SP entregados / 35 SP comprometidos
        // -------------------------------------------------------------
        $s2Start = $now->copy()->subDays(75);

        $blueprint[] = [
            'title' => 'Implementación de autenticación JWT y refresh tokens con SDI Auth',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'URGENT',
            'points' => 8,
            'start_date' => $s2Start->copy()->addDays(1),
            'target_date' => $s2Start->copy()->addDays(8),
            'completed_at' => $s2Start->copy()->addDays(7)->setHour(18), // 6d cycle time
            'created_at' => $s2Start->copy(),
            'assignees' => [$team['mateo']->id],
            'labels' => [$labels['back']->id, $labels['sec']->id],
            'cycle_id' => $cycles[2]->id,
        ];
        $blueprint[] = [
            'title' => 'Formulario de Login, recuperación de contraseña y sesión en cliente',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s2Start->copy()->addDays(2),
            'target_date' => $s2Start->copy()->addDays(7),
            'completed_at' => $s2Start->copy()->addDays(6)->setHour(16), // 4d cycle time
            'created_at' => $s2Start->copy(),
            'assignees' => [$team['elena']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[2]->id,
        ];
        $blueprint[] = [
            'title' => 'Definición de roles y permisos (RBAC) en API y middleware',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s2Start->copy()->addDays(3),
            'target_date' => $s2Start->copy()->addDays(8),
            'completed_at' => $s2Start->copy()->addDays(8)->setHour(12), // 5d cycle time
            'created_at' => $s2Start->copy(),
            'assignees' => [$team['valeria']->id],
            'labels' => [$labels['back']->id, $labels['sec']->id],
            'cycle_id' => $cycles[2]->id,
        ];
        $blueprint[] = [
            'title' => 'Pipeline inicial de Continuous Integration (CI) en GitLab/GitHub Actions',
            'state_id' => $states['completed']->id,
            'type_id' => $types['infra']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s2Start->copy()->addDays(2),
            'target_date' => $s2Start->copy()->addDays(6),
            'completed_at' => $s2Start->copy()->addDays(7)->setHour(11), // 5d (1d de retraso leve OTD)
            'created_at' => $s2Start->copy(),
            'assignees' => [$team['diego']->id],
            'labels' => [$labels['infra']->id],
            'cycle_id' => $cycles[2]->id,
        ];
        $blueprint[] = [
            'title' => 'Pantalla de perfil de usuario y configuración de preferencias',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'MEDIUM',
            'points' => 3,
            'start_date' => $s2Start->copy()->addDays(4),
            'target_date' => $s2Start->copy()->addDays(9),
            'completed_at' => $s2Start->copy()->addDays(8)->setHour(14), // 4d cycle time
            'created_at' => $s2Start->copy()->addDays(1),
            'assignees' => [$team['lucas']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[2]->id,
        ];
        $blueprint[] = [
            'title' => 'Bug: Expiración anticipada de sesión al recargar la página',
            'state_id' => $states['completed']->id,
            'type_id' => $types['bug']->id,
            'priority' => 'URGENT',
            'points' => 2,
            'start_date' => $s2Start->copy()->addDays(7),
            'target_date' => $s2Start->copy()->addDays(9),
            'completed_at' => $s2Start->copy()->addDays(8)->setHour(18), // 1d cycle time
            'created_at' => $s2Start->copy()->addDays(6),
            'assignees' => [$team['elena']->id, $team['camila']->id],
            'labels' => [$labels['front']->id, $labels['qa']->id],
            'cycle_id' => $cycles[2]->id,
        ];
        $blueprint[] = [
            'title' => 'Batería de pruebas de integración para el flujo de autenticación',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'HIGH',
            'points' => 3,
            'start_date' => $s2Start->copy()->addDays(8),
            'target_date' => $s2Start->copy()->addDays(12),
            'completed_at' => $s2Start->copy()->addDays(11)->setHour(15), // 3d cycle time
            'created_at' => $s2Start->copy()->addDays(6),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[2]->id,
        ];

        // -------------------------------------------------------------
        // SPRINT 03 (Hace 60d a 45d): 11 ítems, 38 SP entregados / 42 SP comprometidos
        // -------------------------------------------------------------
        $s3Start = $now->copy()->subDays(60);

        $blueprint[] = [
            'title' => 'API de creación y consulta de transacciones monetarias ACID',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'URGENT',
            'points' => 8,
            'start_date' => $s3Start->copy()->addDays(1),
            'target_date' => $s3Start->copy()->addDays(8),
            'completed_at' => $s3Start->copy()->addDays(7)->setHour(19), // 6d cycle time
            'created_at' => $s3Start->copy(),
            'assignees' => [$team['mateo']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[3]->id,
        ];
        $blueprint[] = [
            'title' => 'Servicio de transferencias entre cuentas bancarias y comisiones',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 8,
            'start_date' => $s3Start->copy()->addDays(2),
            'target_date' => $s3Start->copy()->addDays(9),
            'completed_at' => $s3Start->copy()->addDays(8)->setHour(17), // 6d cycle time
            'created_at' => $s3Start->copy(),
            'assignees' => [$team['valeria']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[3]->id,
        ];
        $blueprint[] = [
            'title' => 'Componente interactivo de envío de transferencias y confirmación',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s3Start->copy()->addDays(3),
            'target_date' => $s3Start->copy()->addDays(8),
            'completed_at' => $s3Start->copy()->addDays(7)->setHour(15), // 4d cycle time
            'created_at' => $s3Start->copy(),
            'assignees' => [$team['elena']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[3]->id,
        ];
        $blueprint[] = [
            'title' => 'Historial de movimientos con paginación infinita y filtros rápidos',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'MEDIUM',
            'points' => 5,
            'start_date' => $s3Start->copy()->addDays(4),
            'target_date' => $s3Start->copy()->addDays(9),
            'completed_at' => $s3Start->copy()->addDays(9)->setHour(14), // 5d cycle time
            'created_at' => $s3Start->copy(),
            'assignees' => [$team['lucas']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[3]->id,
        ];
        $blueprint[] = [
            'title' => 'Despliegue y configuración de servidor Nginx reverse proxy con SSL',
            'state_id' => $states['completed']->id,
            'type_id' => $types['infra']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s3Start->copy()->addDays(2),
            'target_date' => $s3Start->copy()->addDays(7),
            'completed_at' => $s3Start->copy()->addDays(6)->setHour(11), // 4d cycle time
            'created_at' => $s3Start->copy(),
            'assignees' => [$team['diego']->id],
            'labels' => [$labels['infra']->id],
            'cycle_id' => $cycles[3]->id,
        ];
        $blueprint[] = [
            'title' => 'Bug: Doble débito al presionar repetidamente el botón de transferir',
            'state_id' => $states['completed']->id,
            'type_id' => $types['bug']->id,
            'priority' => 'URGENT',
            'points' => 3,
            'start_date' => $s3Start->copy()->addDays(8),
            'target_date' => $s3Start->copy()->addDays(10),
            'completed_at' => $s3Start->copy()->addDays(9)->setHour(19), // 1d cycle time
            'created_at' => $s3Start->copy()->addDays(7),
            'assignees' => [$team['valeria']->id, $team['camila']->id],
            'labels' => [$labels['back']->id, $labels['qa']->id],
            'cycle_id' => $cycles[3]->id,
        ];
        $blueprint[] = [
            'title' => 'Pruebas de concurrencia y carga en transacciones monetarias',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'HIGH',
            'points' => 4,
            'start_date' => $s3Start->copy()->addDays(9),
            'target_date' => $s3Start->copy()->addDays(13),
            'completed_at' => $s3Start->copy()->addDays(12)->setHour(16), // 3d cycle time
            'created_at' => $s3Start->copy()->addDays(8),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[3]->id,
        ];

        // -------------------------------------------------------------
        // SPRINT 04 (Hace 45d a 30d): 12 ítems, 43 SP entregados / 45 SP comprometidos
        // -------------------------------------------------------------
        $s4Start = $now->copy()->subDays(45);

        $blueprint[] = [
            'title' => 'Módulo de múltiples divisas (USD, EUR, Local) y tasas de cambio en vivo',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 8,
            'start_date' => $s4Start->copy()->addDays(1),
            'target_date' => $s4Start->copy()->addDays(9),
            'completed_at' => $s4Start->copy()->addDays(8)->setHour(18), // 7d cycle time
            'created_at' => $s4Start->copy(),
            'assignees' => [$team['mateo']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[4]->id,
        ];
        $blueprint[] = [
            'title' => 'Widget de conversión de divisas con cotización en tiempo real',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'MEDIUM',
            'points' => 5,
            'start_date' => $s4Start->copy()->addDays(2),
            'target_date' => $s4Start->copy()->addDays(7),
            'completed_at' => $s4Start->copy()->addDays(6)->setHour(17), // 4d cycle time
            'created_at' => $s4Start->copy(),
            'assignees' => [$team['elena']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[4]->id,
        ];
        $blueprint[] = [
            'title' => 'Notificaciones por correo y webhooks ante eventos transaccionales',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s4Start->copy()->addDays(3),
            'target_date' => $s4Start->copy()->addDays(8),
            'completed_at' => $s4Start->copy()->addDays(8)->setHour(14), // 5d cycle time
            'created_at' => $s4Start->copy(),
            'assignees' => [$team['valeria']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[4]->id,
        ];
        $blueprint[] = [
            'title' => 'Vista de detalle de transacción con recibo descargable',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'MEDIUM',
            'points' => 5,
            'start_date' => $s4Start->copy()->addDays(4),
            'target_date' => $s4Start->copy()->addDays(10),
            'completed_at' => $s4Start->copy()->addDays(9)->setHour(15), // 5d cycle time
            'created_at' => $s4Start->copy(),
            'assignees' => [$team['lucas']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[4]->id,
        ];
        $blueprint[] = [
            'title' => 'Automatización de backups diarios de PostgreSQL en almacenamiento S3',
            'state_id' => $states['completed']->id,
            'type_id' => $types['infra']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s4Start->copy()->addDays(2),
            'target_date' => $s4Start->copy()->addDays(7),
            'completed_at' => $s4Start->copy()->addDays(6)->setHour(12), // 4d cycle time
            'created_at' => $s4Start->copy(),
            'assignees' => [$team['diego']->id],
            'labels' => [$labels['infra']->id],
            'cycle_id' => $cycles[4]->id,
        ];
        $blueprint[] = [
            'title' => 'Bug: Formato incorrecto de decimales en montos con coma flotante',
            'state_id' => $states['completed']->id,
            'type_id' => $types['bug']->id,
            'priority' => 'HIGH',
            'points' => 2,
            'start_date' => $s4Start->copy()->addDays(7),
            'target_date' => $s4Start->copy()->addDays(9),
            'completed_at' => $s4Start->copy()->addDays(8)->setHour(11), // 1d cycle time
            'created_at' => $s4Start->copy()->addDays(6),
            'assignees' => [$team['lucas']->id, $team['camila']->id],
            'labels' => [$labels['front']->id, $labels['qa']->id],
            'cycle_id' => $cycles[4]->id,
        ];
        $blueprint[] = [
            'title' => 'Bug: Error 500 al enviar webhook si el receptor tarda más de 3 segundos',
            'state_id' => $states['completed']->id,
            'type_id' => $types['bug']->id,
            'priority' => 'URGENT',
            'points' => 3,
            'start_date' => $s4Start->copy()->addDays(8),
            'target_date' => $s4Start->copy()->addDays(10),
            'completed_at' => $s4Start->copy()->addDays(10)->setHour(18), // 2d cycle time
            'created_at' => $s4Start->copy()->addDays(7),
            'assignees' => [$team['valeria']->id, $team['camila']->id],
            'labels' => [$labels['back']->id, $labels['qa']->id],
            'cycle_id' => $cycles[4]->id,
        ];
        $blueprint[] = [
            'title' => 'Batería de pruebas E2E con Cypress/Playwright para flujos de pago',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s4Start->copy()->addDays(6),
            'target_date' => $s4Start->copy()->addDays(12),
            'completed_at' => $s4Start->copy()->addDays(11)->setHour(16), // 5d cycle time
            'created_at' => $s4Start->copy()->addDays(5),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[4]->id,
        ];
        $blueprint[] = [
            'title' => 'Facilitación de retrospectiva y refinamiento de historias de usuario',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'LOW',
            'points' => 2,
            'start_date' => $s4Start->copy()->addDays(10),
            'target_date' => $s4Start->copy()->addDays(13),
            'completed_at' => $s4Start->copy()->addDays(12)->setHour(17), // 2d cycle time
            'created_at' => $s4Start->copy()->addDays(9),
            'assignees' => [$team['andres']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[4]->id,
        ];

        // -------------------------------------------------------------
        // SPRINT 05 (Hace 30d a 15d): 13 ítems, 46 SP entregados / 48 SP comprometidos
        // -------------------------------------------------------------
        $s5Start = $now->copy()->subDays(30);

        $blueprint[] = [
            'title' => 'Motor de generación de extractos y estados de cuenta en PDF',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 8,
            'start_date' => $s5Start->copy()->addDays(1),
            'target_date' => $s5Start->copy()->addDays(8),
            'completed_at' => $s5Start->copy()->addDays(7)->setHour(19), // 6d cycle time
            'created_at' => $s5Start->copy(),
            'assignees' => [$team['valeria']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[5]->id,
        ];
        $blueprint[] = [
            'title' => 'Visualizador de gráficos analíticos de ingresos vs egresos mensuales',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 8,
            'start_date' => $s5Start->copy()->addDays(2),
            'target_date' => $s5Start->copy()->addDays(8),
            'completed_at' => $s5Start->copy()->addDays(7)->setHour(17), // 5d cycle time
            'created_at' => $s5Start->copy(),
            'assignees' => [$team['elena']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[5]->id,
        ];
        $blueprint[] = [
            'title' => 'Optimización de consultas SQL agregadas con índices compuestos',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'MEDIUM',
            'points' => 5,
            'start_date' => $s5Start->copy()->addDays(3),
            'target_date' => $s5Start->copy()->addDays(7),
            'completed_at' => $s5Start->copy()->addDays(6)->setHour(15), // 3d cycle time
            'created_at' => $s5Start->copy(),
            'assignees' => [$team['mateo']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[5]->id,
        ];
        $blueprint[] = [
            'title' => 'Módulo de filtros avanzados por rango de fechas, montos y estados',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'MEDIUM',
            'points' => 5,
            'start_date' => $s5Start->copy()->addDays(4),
            'target_date' => $s5Start->copy()->addDays(9),
            'completed_at' => $s5Start->copy()->addDays(9)->setHour(12), // 5d cycle time
            'created_at' => $s5Start->copy(),
            'assignees' => [$team['lucas']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[5]->id,
        ];
        $blueprint[] = [
            'title' => 'Implementación de script automatizado multi-entorno deploy.sh',
            'state_id' => $states['completed']->id,
            'type_id' => $types['infra']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s5Start->copy()->addDays(2),
            'target_date' => $s5Start->copy()->addDays(8),
            'completed_at' => $s5Start->copy()->addDays(7)->setHour(16), // 5d cycle time
            'created_at' => $s5Start->copy(),
            'assignees' => [$team['diego']->id],
            'labels' => [$labels['infra']->id],
            'cycle_id' => $cycles[5]->id,
        ];
        $blueprint[] = [
            'title' => 'Bug: Gráficos de tendencias desfasados por zona horaria UTC vs Local',
            'state_id' => $states['completed']->id,
            'type_id' => $types['bug']->id,
            'priority' => 'MEDIUM',
            'points' => 2,
            'start_date' => $s5Start->copy()->addDays(7),
            'target_date' => $s5Start->copy()->addDays(9),
            'completed_at' => $s5Start->copy()->addDays(8)->setHour(14), // 1d cycle time
            'created_at' => $s5Start->copy()->addDays(6),
            'assignees' => [$team['elena']->id, $team['camila']->id],
            'labels' => [$labels['front']->id, $labels['qa']->id],
            'cycle_id' => $cycles[5]->id,
        ];
        $blueprint[] = [
            'title' => 'Bug: Bloqueo de memoria en worker de colas al generar reportes masivos',
            'state_id' => $states['completed']->id,
            'type_id' => $types['bug']->id,
            'priority' => 'URGENT',
            'points' => 5,
            'start_date' => $s5Start->copy()->addDays(8),
            'target_date' => $s5Start->copy()->addDays(12),
            'completed_at' => $s5Start->copy()->addDays(11)->setHour(18), // 3d cycle time
            'created_at' => $s5Start->copy()->addDays(7),
            'assignees' => [$team['mateo']->id, $team['camila']->id],
            'labels' => [$labels['back']->id, $labels['qa']->id],
            'cycle_id' => $cycles[5]->id,
        ];
        $blueprint[] = [
            'title' => 'Pruebas de regresión completa y validación de generación de PDFs',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s5Start->copy()->addDays(8),
            'target_date' => $s5Start->copy()->addDays(13),
            'completed_at' => $s5Start->copy()->addDays(12)->setHour(16), // 4d cycle time
            'created_at' => $s5Start->copy()->addDays(7),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[5]->id,
        ];
        $blueprint[] = [
            'title' => 'Gestión de métricas de flujo y sincronización de backlog para Sprint 06',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'LOW',
            'points' => 3,
            'start_date' => $s5Start->copy()->addDays(11),
            'target_date' => $s5Start->copy()->addDays(14),
            'completed_at' => $s5Start->copy()->addDays(13)->setHour(12), // 2d cycle time
            'created_at' => $s5Start->copy()->addDays(10),
            'assignees' => [$team['andres']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[5]->id,
        ];

        // -------------------------------------------------------------
        // SPRINT 06 (Hace 15d a Hoy): En Curso / Cierre.
        // Alimenta Velocity 14d, Throughput 30d, y distribuye WIPs activos.
        // -------------------------------------------------------------
        $s6Start = $now->copy()->subDays(15);

        // Ítems completados recientemente (últimos 14 días)
        $blueprint[] = [
            'title' => 'Implementación de rate limiting distribuido por IP y usuario en Redis',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'URGENT',
            'points' => 5,
            'start_date' => $s6Start->copy()->addDays(1),
            'target_date' => $s6Start->copy()->addDays(6),
            'completed_at' => $s6Start->copy()->addDays(5)->setHour(17), // 4d cycle time
            'created_at' => $s6Start->copy(),
            'assignees' => [$team['mateo']->id],
            'labels' => [$labels['back']->id, $labels['sec']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Caché de consultas de catálogo y saldos frecuentes en Redis',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s6Start->copy()->addDays(2),
            'target_date' => $s6Start->copy()->addDays(6),
            'completed_at' => $s6Start->copy()->addDays(5)->setHour(14), // 3d cycle time
            'created_at' => $s6Start->copy(),
            'assignees' => [$team['valeria']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Diseño de interfaz para alertas de seguridad y actividad sospechosa',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $s6Start->copy()->addDays(2),
            'target_date' => $s6Start->copy()->addDays(7),
            'completed_at' => $s6Start->copy()->addDays(6)->setHour(18), // 4d cycle time
            'created_at' => $s6Start->copy(),
            'assignees' => [$team['elena']->id],
            'labels' => [$labels['front']->id, $labels['sec']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Integración de cabeceras de seguridad CSP, HSTS y X-Frame-Options en Nginx',
            'state_id' => $states['completed']->id,
            'type_id' => $types['infra']->id,
            'priority' => 'HIGH',
            'points' => 3,
            'start_date' => $s6Start->copy()->addDays(3),
            'target_date' => $s6Start->copy()->addDays(7),
            'completed_at' => $s6Start->copy()->addDays(6)->setHour(11), // 3d cycle time
            'created_at' => $s6Start->copy(),
            'assignees' => [$team['diego']->id],
            'labels' => [$labels['infra']->id, $labels['sec']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Componente de autenticación biométrica / PIN para autorizar transacciones',
            'state_id' => $states['completed']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'MEDIUM',
            'points' => 5,
            'start_date' => $s6Start->copy()->addDays(4),
            'target_date' => $s6Start->copy()->addDays(9),
            'completed_at' => $s6Start->copy()->addDays(8)->setHour(15), // 4d cycle time
            'created_at' => $s6Start->copy(),
            'assignees' => [$team['lucas']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Bug: Inyección de caracteres especiales en campo de concepto de pago',
            'state_id' => $states['completed']->id,
            'type_id' => $types['bug']->id,
            'priority' => 'URGENT',
            'points' => 3,
            'start_date' => $s6Start->copy()->addDays(6),
            'target_date' => $s6Start->copy()->addDays(8),
            'completed_at' => $s6Start->copy()->addDays(7)->setHour(16), // 1d cycle time
            'created_at' => $s6Start->copy()->addDays(5),
            'assignees' => [$team['valeria']->id, $team['camila']->id],
            'labels' => [$labels['back']->id, $labels['qa']->id, $labels['sec']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Bug: Parpadeo visual (FOUC) en cambio de tema oscuro/claro',
            'state_id' => $states['completed']->id,
            'type_id' => $types['bug']->id,
            'priority' => 'LOW',
            'points' => 2,
            'start_date' => $s6Start->copy()->addDays(7),
            'target_date' => $s6Start->copy()->addDays(10),
            'completed_at' => $s6Start->copy()->addDays(9)->setHour(12), // 2d cycle time
            'created_at' => $s6Start->copy()->addDays(6),
            'assignees' => [$team['lucas']->id, $team['camila']->id],
            'labels' => [$labels['front']->id, $labels['qa']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Auditoría de vulnerabilidades con SonarQube y dependencias npm/composer',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'HIGH',
            'points' => 3,
            'start_date' => $s6Start->copy()->addDays(8),
            'target_date' => $s6Start->copy()->addDays(12),
            'completed_at' => $s6Start->copy()->addDays(11)->setHour(17), // 3d cycle time
            'created_at' => $s6Start->copy()->addDays(7),
            'assignees' => [$team['diego']->id, $team['camila']->id],
            'labels' => [$labels['infra']->id, $labels['sec']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Bug: Retraso en actualización de saldo al realizar recarga inmediata',
            'state_id' => $states['completed']->id,
            'type_id' => $types['bug']->id,
            'priority' => 'HIGH',
            'points' => 3,
            'start_date' => $s6Start->copy()->addDays(9),
            'target_date' => $s6Start->copy()->addDays(12),
            'completed_at' => $s6Start->copy()->addDays(11)->setHour(14), // 2d cycle time
            'created_at' => $s6Start->copy()->addDays(8),
            'assignees' => [$team['mateo']->id, $team['camila']->id],
            'labels' => [$labels['back']->id, $labels['qa']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Casos atípicos: Migración de registros legados con particionamiento',
            'state_id' => $states['completed']->id,
            'type_id' => $types['task']->id,
            'priority' => 'HIGH',
            'points' => 8,
            'start_date' => $s6Start->copy()->subDays(1),
            'target_date' => $s6Start->copy()->addDays(12),
            'completed_at' => $s6Start->copy()->addDays(13)->setHour(19), // 14d cycle time (alimenta bucket 11-15d)
            'created_at' => $s6Start->copy()->subDays(2),
            'assignees' => [$team['mateo']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[6]->id,
        ];

        // -------------------------------------------------------------
        // TAREAS ACTIVAS EN CURSO (WIP) - Configuración calibrada de saturación
        // -------------------------------------------------------------
        // Andrés (Scrum Master): 1 WIP -> Optimal (Óptimo)
        $blueprint[] = [
            'title' => 'Refinamiento de historias y criterios de aceptación para pagos recurrentes',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['task']->id,
            'priority' => 'MEDIUM',
            'points' => 3,
            'start_date' => $now->copy()->subDays(2),
            'target_date' => $now->copy()->addDays(3),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(4),
            'assignees' => [$team['andres']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[6]->id,
        ];

        // Elena (Frontend Lead): 2 WIP -> Optimal (Óptimo)
        $blueprint[] = [
            'title' => 'Refactor de componentes de tabla analítica con virtualización para 10k filas',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $now->copy()->subDays(3),
            'target_date' => $now->copy()->addDays(4),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(5),
            'assignees' => [$team['elena']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Revisión y optimización de bundle size inicial en producción',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['task']->id,
            'priority' => 'MEDIUM',
            'points' => 3,
            'start_date' => $now->copy()->subDays(1),
            'target_date' => $now->copy()->addDays(5),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(3),
            'assignees' => [$team['elena']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[6]->id,
        ];

        // Lucas (Frontend Dev): 4 WIP -> Heavy (Carga Alta 🟡)
        $blueprint[] = [
            'title' => 'Modal interactivo para exportar reportes en formatos CSV y JSON',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'MEDIUM',
            'points' => 3,
            'start_date' => $now->copy()->subDays(4),
            'target_date' => $now->copy()->addDays(2),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(6),
            'assignees' => [$team['lucas']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Adaptación de diseño responsive para tablets y pantallas plegables',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'LOW',
            'points' => 3,
            'start_date' => $now->copy()->subDays(3),
            'target_date' => $now->copy()->subDays(1), // Vencida ayer para alertar OTD
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(5),
            'assignees' => [$team['lucas']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Mejora de accesibilidad (ARIA) y navegación por teclado en formularios',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['task']->id,
            'priority' => 'LOW',
            'points' => 2,
            'start_date' => $now->copy()->subDays(2),
            'target_date' => $now->copy()->addDays(4),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(3),
            'assignees' => [$team['lucas']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Integración de animaciones de feedback visual en confirmación de pago',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'LOW',
            'points' => 2,
            'start_date' => $now->copy()->subDays(1),
            'target_date' => $now->copy()->addDays(3),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(2),
            'assignees' => [$team['lucas']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[6]->id,
        ];

        // Mateo (Backend Lead): 2 WIP -> Optimal (Óptimo)
        $blueprint[] = [
            'title' => 'Diseño de arquitectura de eventos asíncronos con Redis Pub/Sub',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['task']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $now->copy()->subDays(3),
            'target_date' => $now->copy()->addDays(4),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(5),
            'assignees' => [$team['mateo']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Implementación de idempotency keys en transacciones críticas',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'URGENT',
            'points' => 5,
            'start_date' => $now->copy()->subDays(2),
            'target_date' => $now->copy()->addDays(3),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(4),
            'assignees' => [$team['mateo']->id],
            'labels' => [$labels['back']->id, $labels['sec']->id],
            'cycle_id' => $cycles[6]->id,
        ];

        // Valeria (Backend Dev): 3 WIP -> Optimal (Óptimo)
        $blueprint[] = [
            'title' => 'API para suscripciones periódicas y cobros automáticos',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $now->copy()->subDays(3),
            'target_date' => $now->copy()->addDays(3),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(4),
            'assignees' => [$team['valeria']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Webhook listener para notificaciones de liquidación bancaria externa',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'MEDIUM',
            'points' => 3,
            'start_date' => $now->copy()->subDays(2),
            'target_date' => $now->copy()->addDays(4),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(3),
            'assignees' => [$team['valeria']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Bug: Excepción no controlada en reintentos de jobs fallidos en colas',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['bug']->id,
            'priority' => 'HIGH',
            'points' => 3,
            'start_date' => $now->copy()->subDays(1),
            'target_date' => $now->copy()->addDays(2),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(2),
            'assignees' => [$team['valeria']->id],
            'labels' => [$labels['back']->id, $labels['qa']->id],
            'cycle_id' => $cycles[6]->id,
        ];

        // Camila (QA Lead): 7 WIP -> Overloaded (Sobrecarga 🔴)
        $blueprint[] = [
            'title' => 'Validación cruzada de seguridad en formulario de pagos y tarjetas',
            'state_id' => $states['qa']->id,
            'type_id' => $types['task']->id,
            'priority' => 'HIGH',
            'points' => 3,
            'start_date' => $now->copy()->subDays(4),
            'target_date' => $now->copy()->addDays(2),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(5),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id, $labels['sec']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Pruebas de estrés y límites en endpoints de rate limiting',
            'state_id' => $states['qa']->id,
            'type_id' => $types['task']->id,
            'priority' => 'HIGH',
            'points' => 3,
            'start_date' => $now->copy()->subDays(3),
            'target_date' => $now->copy()->addDays(2),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(4),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Verificación funcional de exportación masiva de PDFs en Safari y Chrome',
            'state_id' => $states['qa']->id,
            'type_id' => $types['task']->id,
            'priority' => 'MEDIUM',
            'points' => 2,
            'start_date' => $now->copy()->subDays(3),
            'target_date' => $now->copy()->addDays(3),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(4),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Validación de contratos API OpenAPI/Swagger para nuevos endpoints',
            'state_id' => $states['qa']->id,
            'type_id' => $types['task']->id,
            'priority' => 'MEDIUM',
            'points' => 3,
            'start_date' => $now->copy()->subDays(2),
            'target_date' => $now->copy()->addDays(3),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(3),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Bug: Formulario no bloquea botón tras hacer submit en redes lentas (3G)',
            'state_id' => $states['qa']->id,
            'type_id' => $types['bug']->id,
            'priority' => 'URGENT',
            'points' => 2,
            'start_date' => $now->copy()->subDays(2),
            'target_date' => $now->copy()->addDays(1),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(3),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id, $labels['front']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Ejecución de suite de regresión nocturna automatizada en CI/CD',
            'state_id' => $states['qa']->id,
            'type_id' => $types['task']->id,
            'priority' => 'MEDIUM',
            'points' => 3,
            'start_date' => $now->copy()->subDays(1),
            'target_date' => $now->copy()->addDays(4),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(2),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Bug: Caracteres acentuados corrompidos en extracto PDF bancario',
            'state_id' => $states['qa']->id,
            'type_id' => $types['bug']->id,
            'priority' => 'MEDIUM',
            'points' => 2,
            'start_date' => $now->copy()->subDays(1),
            'target_date' => $now->copy()->addDays(3),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(2),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[6]->id,
        ];

        // Diego (DevOps): 2 WIP -> Optimal (Óptimo)
        $blueprint[] = [
            'title' => 'Monitoreo de latencia y uso de CPU con Prometheus y Grafana',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['infra']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => $now->copy()->subDays(3),
            'target_date' => $now->copy()->addDays(4),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(5),
            'assignees' => [$team['diego']->id],
            'labels' => [$labels['infra']->id],
            'cycle_id' => $cycles[6]->id,
        ];
        $blueprint[] = [
            'title' => 'Configuración de rotación automática de logs de Nginx y Laravel',
            'state_id' => $states['in_progress']->id,
            'type_id' => $types['infra']->id,
            'priority' => 'LOW',
            'points' => 2,
            'start_date' => $now->copy()->subDays(2),
            'target_date' => $now->copy()->addDays(5),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(4),
            'assignees' => [$team['diego']->id],
            'labels' => [$labels['infra']->id],
            'cycle_id' => $cycles[6]->id,
        ];

        // -------------------------------------------------------------
        // SPRINT 07 (Planificado / Próximas 2 semanas): Backlog & Por Hacer
        // -------------------------------------------------------------
        $s7Start = $now->copy()->addDay();

        $blueprint[] = [
            'title' => 'Integración con pasarela de pagos Stripe y MercadoPago',
            'state_id' => $states['todo']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 8,
            'start_date' => null,
            'target_date' => $s7Start->copy()->addDays(8),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(2),
            'assignees' => [$team['valeria']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[7]->id,
        ];
        $blueprint[] = [
            'title' => 'Pantalla de checkout con soporte de métodos de pago guardados',
            'state_id' => $states['todo']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'HIGH',
            'points' => 5,
            'start_date' => null,
            'target_date' => $s7Start->copy()->addDays(9),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(2),
            'assignees' => [$team['elena']->id],
            'labels' => [$labels['front']->id],
            'cycle_id' => $cycles[7]->id,
        ];
        $blueprint[] = [
            'title' => 'Configuración de webhooks automáticos de reintento en pagos fallidos',
            'state_id' => $states['todo']->id,
            'type_id' => $types['feature']->id,
            'priority' => 'MEDIUM',
            'points' => 5,
            'start_date' => null,
            'target_date' => $s7Start->copy()->addDays(11),
            'completed_at' => null,
            'created_at' => $now->copy()->subDays(1),
            'assignees' => [$team['mateo']->id],
            'labels' => [$labels['back']->id],
            'cycle_id' => $cycles[7]->id,
        ];
        $blueprint[] = [
            'title' => 'Plan de pruebas de integración con sandbox bancario para Sprint 07',
            'state_id' => $states['backlog']->id,
            'type_id' => $types['task']->id,
            'priority' => 'MEDIUM',
            'points' => 3,
            'start_date' => null,
            'target_date' => $s7Start->copy()->addDays(12),
            'completed_at' => null,
            'created_at' => $now->copy(),
            'assignees' => [$team['camila']->id],
            'labels' => [$labels['qa']->id],
            'cycle_id' => $cycles[7]->id,
        ];

        return $blueprint;
    }
}

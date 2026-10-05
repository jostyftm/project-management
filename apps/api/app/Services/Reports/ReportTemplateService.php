<?php

namespace App\Services\Reports;

use App\Enums\BlockType;
use App\Models\ReportBlock;
use App\Models\WorkspaceReport;
use Illuminate\Support\Facades\DB;

class ReportTemplateService
{
    /**
     * Catálogo de plantillas predefinidas.
     */
    public function all(): array
    {
        return [
            'weekly_exec' => [
                'id'          => 'weekly_exec',
                'name'        => 'Weekly Executive Report',
                'description' => 'Resumen ejecutivo semanal con estado general, KPIs clave, riesgos prioritarios, actividad reciente y conclusiones.',
                'theme'       => 'corporate_blue',
                'category'    => 'executive',
                'blocks'      => [
                    [
                        'type'     => BlockType::PROJECT_SUMMARY->value,
                        'title'    => 'Estado General del Proyecto',
                        'width'    => 12,
                        'position' => 0,
                        'config'   => [],
                    ],
                    [
                        'type'     => BlockType::KPI_ROW->value,
                        'title'    => 'KPIs Principales',
                        'width'    => 12,
                        'position' => 1,
                        'config'   => ['metrics' => ['total', 'completed', 'in_progress', 'overdue']],
                    ],
                    [
                        'type'     => BlockType::RISKS_BLOCKERS->value,
                        'title'    => 'Riesgos y Puntos de Atención',
                        'width'    => 6,
                        'position' => 2,
                        'config'   => ['days_stagnant' => 7, 'limit' => 5],
                    ],
                    [
                        'type'     => BlockType::RECENT_ACTIVITY->value,
                        'title'    => 'Actividad Reciente del Equipo',
                        'width'    => 6,
                        'position' => 3,
                        'config'   => ['limit' => 6],
                    ],
                    [
                        'type'     => BlockType::NARRATIVE->value,
                        'title'    => 'Conclusiones y Próximos Pasos',
                        'width'    => 12,
                        'position' => 4,
                        'config'   => [
                            'content'   => "<h3>Resumen del Período</h3><p>Durante esta semana el equipo avanzó en los entregables prioritarios sin desviaciones críticas de alcance. El foco de los próximos días se centrará en cerrar las tareas de aseguramiento de calidad y estabilización.</p>",
                            'alignment' => 'left',
                        ],
                    ],
                ],
            ],
            'sprint_review' => [
                'id'          => 'sprint_review',
                'name'        => 'Sprint Review & Retrospectiva',
                'description' => 'Análisis del ciclo de sprint con velocidad de entrega, distribución de carga entre miembros y tareas completadas.',
                'theme'       => 'default_light',
                'category'    => 'agile',
                'blocks'      => [
                    [
                        'type'     => BlockType::CYCLES_OVERVIEW->value,
                        'title'    => 'Resumen del Sprint Activo',
                        'width'    => 12,
                        'position' => 0,
                        'config'   => ['status' => 'CURRENT', 'limit' => 3],
                    ],
                    [
                        'type'     => BlockType::AREA_CHART->value,
                        'title'    => 'Velocidad de Entrega (Burn-Up)',
                        'width'    => 6,
                        'position' => 1,
                        'config'   => ['grouping' => 'day'],
                    ],
                    [
                        'type'     => BlockType::TEAM_WORKLOAD->value,
                        'title'    => 'Distribución de Carga del Equipo',
                        'width'    => 6,
                        'position' => 2,
                        'config'   => ['limit' => 8],
                    ],
                    [
                        'type'     => BlockType::TABLE->value,
                        'title'    => 'Tareas Finalizadas en el Sprint',
                        'width'    => 12,
                        'position' => 3,
                        'config'   => ['limit' => 10, 'sort_by' => 'completed_at'],
                    ],
                ],
            ],
            'project_health' => [
                'id'          => 'project_health',
                'name'        => 'Diagnóstico de Salud y Riesgos',
                'description' => 'Auditoría integral de salud del proyecto con desglose de estados, matriz de riesgos y cumplimiento de hitos.',
                'theme'       => 'default_dark',
                'category'    => 'audit',
                'blocks'      => [
                    [
                        'type'     => BlockType::PROJECT_SUMMARY->value,
                        'title'    => 'Indicadores de Salud Global',
                        'width'    => 12,
                        'position' => 0,
                        'config'   => [],
                    ],
                    [
                        'type'     => BlockType::DONUT_CHART->value,
                        'title'    => 'Distribución de Work Items por Estado',
                        'width'    => 6,
                        'position' => 1,
                        'config'   => ['dimension' => 'state'],
                    ],
                    [
                        'type'     => BlockType::RISKS_BLOCKERS->value,
                        'title'    => 'Tareas Críticas Vencidas o Bloqueadas',
                        'width'    => 6,
                        'position' => 2,
                        'config'   => ['days_stagnant' => 5, 'limit' => 6],
                    ],
                    [
                        'type'     => BlockType::MILESTONES_PROGRESS->value,
                        'title'    => 'Cumplimiento de Hitos Estratégicos',
                        'width'    => 12,
                        'position' => 3,
                        'config'   => ['status' => 'all'],
                    ],
                ],
            ],
            'product_roadmap' => [
                'id'          => 'product_roadmap',
                'name'        => 'Roadmap Trimestral & Releases',
                'description' => 'Seguimiento de roadmap de producto, hitos a mediano plazo y cronograma de despliegues y versiones.',
                'theme'       => 'corporate_blue',
                'category'    => 'product',
                'blocks'      => [
                    [
                        'type'     => BlockType::CALLOUT->value,
                        'title'    => 'Objetivo Trimestral (OKR de Producto)',
                        'width'    => 12,
                        'position' => 0,
                        'config'   => [
                            'variant' => 'info',
                            'title'   => 'Lanzamiento de la Versión 2.4',
                            'content' => 'Consolidar la arquitectura modular y entregar los módulos de reportería y automatizaciones con alta confiabilidad.',
                        ],
                    ],
                    [
                        'type'     => BlockType::RELEASES_TIMELINE->value,
                        'title'    => 'Línea de Tiempo de Releases',
                        'width'    => 12,
                        'position' => 1,
                        'config'   => ['status' => 'all', 'limit' => 6],
                    ],
                    [
                        'type'     => BlockType::MILESTONES_PROGRESS->value,
                        'title'    => 'Hitos de Entrega del Trimestre',
                        'width'    => 12,
                        'position' => 2,
                        'config'   => ['limit' => 5],
                    ],
                    [
                        'type'     => BlockType::LINE_CHART->value,
                        'title'    => 'Ritmo Histórico de Entregas',
                        'width'    => 12,
                        'position' => 3,
                        'config'   => ['metric' => 'work_items_completed', 'grouping' => 'month'],
                    ],
                ],
            ],
            'team_capacity' => [
                'id'          => 'team_capacity',
                'name'        => 'Capacidad y Carga de Equipo',
                'description' => 'Supervisión de capacidad operativa, concentración de trabajo por prioridad y mapa de calor de productividad.',
                'theme'       => 'warm_neutral',
                'category'    => 'operations',
                'blocks'      => [
                    [
                        'type'     => BlockType::TEAM_WORKLOAD->value,
                        'title'    => 'Capacidad y Carga por Asignado',
                        'width'    => 12,
                        'position' => 0,
                        'config'   => ['limit' => 12],
                    ],
                    [
                        'type'     => BlockType::BAR_CHART->value,
                        'title'    => 'Tareas Abiertas por Prioridad',
                        'width'    => 6,
                        'position' => 1,
                        'config'   => ['dimension' => 'priority'],
                    ],
                    [
                        'type'     => BlockType::HEATMAP->value,
                        'title'    => 'Densidad de Actividad Semanal',
                        'width'    => 6,
                        'position' => 2,
                        'config'   => ['metric' => 'completed', 'weeks' => 12],
                    ],
                    [
                        'type'     => BlockType::WORK_ITEMS_LIST->value,
                        'title'    => 'Tareas Urgentes que Requieren Apoyo',
                        'width'    => 12,
                        'position' => 3,
                        'config'   => ['filter' => 'urgent', 'limit' => 6],
                    ],
                ],
            ],
        ];
    }

    /**
     * Obtiene una plantilla por su ID.
     */
    public function find(string $id): ?array
    {
        return $this->all()[$id] ?? null;
    }

    /**
     * Aplica los bloques de una plantilla a un reporte existente.
     */
    public function apply(WorkspaceReport $report, string $templateId): WorkspaceReport
    {
        $template = $this->find($templateId);

        if (!$template) {
            return $report;
        }

        return DB::transaction(function () use ($report, $template) {
            // Eliminar bloques previos si existen
            $report->blocks()->delete();

            foreach ($template['blocks'] as $blockDef) {
                ReportBlock::create([
                    'report_id'   => $report->id,
                    'type'        => $blockDef['type'],
                    'title'       => $blockDef['title'],
                    'width'       => $blockDef['width'],
                    'position'    => $blockDef['position'],
                    'config'      => $blockDef['config'] ?? [],
                    'is_visible'  => true,
                ]);
            }

            return $report->fresh('blocks');
        });
    }
}

<?php

namespace App\Enums;

enum BlockType: string
{
    case KPI_ROW = 'kpi_row';
    case PROJECT_SUMMARY = 'project_summary';
    case NARRATIVE = 'narrative';
    case LINE_CHART = 'line_chart';
    case BAR_CHART = 'bar_chart';
    case DONUT_CHART = 'donut_chart';
    case AREA_CHART = 'area_chart';
    case HEATMAP = 'heatmap';
    case TABLE = 'table';
    case WORK_ITEMS_LIST = 'work_items_list';
    case CYCLES_OVERVIEW = 'cycles_overview';
    case RELEASES_TIMELINE = 'releases_timeline';
    case MILESTONES_PROGRESS = 'milestones_progress';
    case TEAM_WORKLOAD = 'team_workload';
    case RECENT_ACTIVITY = 'recent_activity';
    case RISKS_BLOCKERS = 'risks_blockers';
    case DIVIDER = 'divider';
    case IMAGE = 'image';
    case CALLOUT = 'callout';

    /** Retorna todos los valores como array */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Retorna la etiqueta legible del tipo */
    public function label(): string
    {
        return match ($this) {
            self::KPI_ROW => 'Fila de KPIs',
            self::PROJECT_SUMMARY => 'Resumen de Proyecto',
            self::NARRATIVE => 'Texto Enriquecido',
            self::LINE_CHART => 'Gráfico de Línea',
            self::BAR_CHART => 'Gráfico de Barras',
            self::DONUT_CHART => 'Gráfico Donut',
            self::AREA_CHART => 'Gráfico de Área',
            self::HEATMAP => 'Mapa de Calor',
            self::TABLE => 'Tabla',
            self::WORK_ITEMS_LIST => 'Lista de Work Items',
            self::CYCLES_OVERVIEW => 'Resumen de Ciclos',
            self::RELEASES_TIMELINE => 'Línea de Tiempo de Releases',
            self::MILESTONES_PROGRESS => 'Progreso de Milestones',
            self::TEAM_WORKLOAD => 'Carga del Equipo',
            self::RECENT_ACTIVITY => 'Actividad Reciente',
            self::RISKS_BLOCKERS => 'Riesgos y Bloqueos',
            self::DIVIDER => 'Separador',
            self::IMAGE => 'Imagen',
            self::CALLOUT => 'Callout',
        };
    }
}

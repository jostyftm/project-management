<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\WorkItem;
use Carbon\Carbon;

class KpiRowResolver
{
    /**
     * Resuelve los KPIs para el bloque kpi_row.
     * Config esperada: { project_ids: [], date_from: string, date_to: string, metrics: [] }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $projectIds = $config['project_ids'] ?? [];
        $dateFrom = Carbon::parse($config['date_from'] ?? now()->subDays(30)->toDateString());
        $dateTo = Carbon::parse($config['date_to'] ?? now()->toDateString());
        $metrics = $config['metrics'] ?? ['total', 'completed', 'in_progress', 'overdue'];

        // Período anterior para calcular deltas
        $periodDays = $dateFrom->diffInDays($dateTo);
        $prevDateFrom = $dateFrom->copy()->subDays($periodDays);
        $prevDateTo = $dateFrom->copy()->subDay();

        $query = WorkItem::query();
        if (! empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } else {
            // Si no hay proyectos específicos, usar el workspace completo
            if (! empty($scope['workspace_id'])) {
                $query->whereHas('project', fn ($q) => $q->where('workspace_id', $scope['workspace_id']));
            }
        }

        $kpis = [];

        if (in_array('total', $metrics)) {
            $current = (clone $query)->whereBetween('created_at', [$dateFrom, $dateTo])->count();
            $previous = (clone $query)->whereBetween('created_at', [$prevDateFrom, $prevDateTo])->count();
            $kpis[] = $this->buildKpi('total', 'Total Work Items', $current, $previous, '📋');
        }

        if (in_array('completed', $metrics)) {
            $current = (clone $query)->whereBetween('completed_at', [$dateFrom, $dateTo])->count();
            $previous = (clone $query)->whereBetween('completed_at', [$prevDateFrom, $prevDateTo])->count();
            $kpis[] = $this->buildKpi('completed', 'Completadas', $current, $previous, '✅');
        }

        if (in_array('in_progress', $metrics)) {
            $current = (clone $query)
                ->whereHas('state', fn ($q) => $q->where('group', 'STARTED'))
                ->count();
            $kpis[] = $this->buildKpi('in_progress', 'En Progreso', $current, null, '🔄');
        }

        if (in_array('overdue', $metrics)) {
            $current = (clone $query)
                ->where('target_date', '<', now())
                ->whereNull('completed_at')
                ->count();
            $kpis[] = $this->buildKpi('overdue', 'Vencidas', $current, null, '⚠️', 'danger');
        }

        // Sparkline: últimos 7 días
        $sparkline = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i)->toDateString();
            $count = (clone $query)
                ->whereDate('created_at', $day)
                ->count();
            $sparkline[] = ['date' => $day, 'value' => $count];
        }

        return [
            'kpis' => $kpis,
            'sparkline' => $sparkline,
            'period' => [
                'from' => $dateFrom->toDateString(),
                'to' => $dateTo->toDateString(),
            ],
        ];
    }

    private function buildKpi(string $key, string $label, int $current, ?int $previous, string $icon, string $variant = 'default'): array
    {
        $delta = null;
        $deltaPercent = null;

        if ($previous !== null && $previous > 0) {
            $delta = $current - $previous;
            $deltaPercent = round(($delta / $previous) * 100, 1);
        }

        return [
            'key' => $key,
            'label' => $label,
            'value' => $current,
            'previous' => $previous,
            'delta' => $delta,
            'delta_percent' => $deltaPercent,
            'icon' => $icon,
            'variant' => $variant,
        ];
    }
}

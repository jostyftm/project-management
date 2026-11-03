<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\WorkItem;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class HeatmapResolver
{
    /**
     * Resuelve la matriz de calor de actividad (estilo GitHub).
     * Config: { project_ids: [], metric: created|completed, weeks: int }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $projectIds = ! empty($config['project_ids']) ? (array) $config['project_ids'] : (! empty($config['project_id']) ? [$config['project_id']] : (! empty($scope['project_ids']) ? (array) $scope['project_ids'] : []));
        $cycleIds = ! empty($config['cycle_ids']) ? (array) $config['cycle_ids'] : (! empty($config['cycle_id']) ? [$config['cycle_id']] : (! empty($scope['cycle_ids']) ? (array) $scope['cycle_ids'] : []));
        $metric = $config['metric'] ?? 'completed';
        $weeks = max((int) ($config['weeks'] ?? 12), 4);

        $daysCount = $weeks * 7;
        $endDate = ! empty($config['end_date']) ? Carbon::parse($config['end_date'])->endOfDay() : Carbon::now()->endOfDay();
        $startDate = ! empty($config['start_date']) ? Carbon::parse($config['start_date'])->startOfDay() : (clone $endDate)->subDays($daysCount - 1)->startOfDay();

        $dateField = $metric === 'created' ? 'created_at' : 'completed_at';

        $query = WorkItem::query()
            ->whereNotNull($dateField)
            ->whereBetween($dateField, [$startDate, $endDate]);

        if (! empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (! empty($scope['workspace_id'])) {
            $query->where('workspace_id', $scope['workspace_id']);
        }

        if (! empty($cycleIds)) {
            $query->whereHas('cycles', fn ($q) => $q->whereIn('cycles.id', $cycleIds));
        }

        $results = (clone $query)
            ->selectRaw("DATE({$dateField}) as event_date, COUNT(*) as count")
            ->groupByRaw("DATE({$dateField})")
            ->pluck('count', 'event_date')
            ->toArray();

        // Mapear cada día en el período
        $period = CarbonPeriod::create($startDate, $endDate);
        $matrix = [];
        $maxCount = 0;
        $totalEvents = 0;

        foreach ($period as $date) {
            $dateString = $date->toDateString();
            $count = (int) ($results[$dateString] ?? 0);
            if ($count > $maxCount) {
                $maxCount = $count;
            }
            $totalEvents += $count;

            $matrix[] = [
                'date' => $dateString,
                'day_of_week' => (int) $date->dayOfWeek, // 0 (Domingo) a 6 (Sábado)
                'count' => $count,
            ];
        }

        // Asignar niveles (0 a 4) según el conteo relativo
        foreach ($matrix as &$item) {
            $c = $item['count'];
            if ($c === 0) {
                $item['level'] = 0;
            } elseif ($maxCount <= 4) {
                $item['level'] = min($c, 4);
            } else {
                $pct = $c / $maxCount;
                $item['level'] = match (true) {
                    $pct >= 0.75 => 4,
                    $pct >= 0.50 => 3,
                    $pct >= 0.25 => 2,
                    default => 1,
                };
            }
        }
        unset($item);

        return [
            'matrix' => $matrix,
            'total_events' => $totalEvents,
            'max_count' => $maxCount,
            'metric' => $metric,
            'weeks' => $weeks,
            'period' => [
                'from' => $startDate->toDateString(),
                'to' => $endDate->toDateString(),
            ],
        ];
    }
}

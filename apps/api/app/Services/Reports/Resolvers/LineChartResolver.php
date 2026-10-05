<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\WorkItem;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;

class LineChartResolver
{
    /**
     * Resuelve series de datos para el gráfico de línea.
     * Config: { project_ids: [], metric: string, grouping: day|week|month, date_from: string, date_to: string, color: string }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config     = $block->config ?? [];
        $projectIds = $config['project_ids'] ?? [];
        $metric     = $config['metric'] ?? 'work_items_completed';
        $grouping   = $config['grouping'] ?? 'week';
        $dateFrom   = Carbon::parse($config['date_from'] ?? now()->subDays(30)->toDateString());
        $dateTo     = Carbon::parse($config['date_to'] ?? now()->toDateString());
        $color      = $config['color'] ?? '#6366f1';

        $query = WorkItem::query();
        if (!empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (!empty($scope['workspace_id'])) {
            $query->whereHas('project', fn ($q) => $q->where('workspace_id', $scope['workspace_id']));
        }

        $series = match ($metric) {
            'work_items_completed' => $this->getCompletedSeries($query, $dateFrom, $dateTo, $grouping),
            'work_items_created'   => $this->getCreatedSeries($query, $dateFrom, $dateTo, $grouping),
            default                => $this->getCompletedSeries($query, $dateFrom, $dateTo, $grouping),
        };

        return [
            'series'   => [
                [
                    'name'  => $this->metricLabel($metric),
                    'data'  => $series,
                    'color' => $color,
                ]
            ],
            'grouping' => $grouping,
            'period'   => [
                'from' => $dateFrom->toDateString(),
                'to'   => $dateTo->toDateString(),
            ],
        ];
    }

    private function getCompletedSeries($query, Carbon $from, Carbon $to, string $grouping): array
    {
        $formatExpr = $this->getDateFormatExpression('completed_at', $grouping);
        $results = (clone $query)
            ->selectRaw("{$formatExpr} as period, COUNT(*) as value")
            ->whereBetween('completed_at', [$from, $to])
            ->groupByRaw("{$formatExpr}")
            ->orderByRaw("{$formatExpr}")
            ->pluck('value', 'period')
            ->toArray();

        return $this->fillPeriods($from, $to, $grouping, $results);
    }

    private function getCreatedSeries($query, Carbon $from, Carbon $to, string $grouping): array
    {
        $formatExpr = $this->getDateFormatExpression('created_at', $grouping);
        $results = (clone $query)
            ->selectRaw("{$formatExpr} as period, COUNT(*) as value")
            ->whereBetween('created_at', [$from, $to])
            ->groupByRaw("{$formatExpr}")
            ->orderByRaw("{$formatExpr}")
            ->pluck('value', 'period')
            ->toArray();

        return $this->fillPeriods($from, $to, $grouping, $results);
    }

    private function getDateFormatExpression(string $column, string $grouping): string
    {
        $isSqlite = DB::getDriverName() === 'sqlite';

        if ($isSqlite) {
            return match ($grouping) {
                'day'   => "strftime('%Y-%m-%d', {$column})",
                'week'  => "strftime('%Y-%W', {$column})",
                'month' => "strftime('%Y-%m', {$column})",
                default => "strftime('%Y-%m-%d', {$column})",
            };
        }

        return match ($grouping) {
            'day'   => "TO_CHAR({$column}, 'YYYY-MM-DD')",
            'week'  => "TO_CHAR({$column}, 'IYYY-IW')",
            'month' => "TO_CHAR({$column}, 'YYYY-MM')",
            default => "TO_CHAR({$column}, 'YYYY-MM-DD')",
        };
    }

    private function fillPeriods(Carbon $from, Carbon $to, string $grouping, array $results): array
    {
        $interval = match ($grouping) {
            'day'   => '1 day',
            'week'  => '1 week',
            'month' => '1 month',
            default => '1 day',
        };

        $period = CarbonPeriod::create($from, $interval, $to);
        $series = [];

        foreach ($period as $date) {
            $key = $this->formatPeriodKey($date, $grouping);
            $series[] = [
                'date'  => $key,
                'value' => (int)($results[$key] ?? 0),
            ];
        }

        return $series;
    }

    private function formatPeriodKey(Carbon $date, string $grouping): string
    {
        $isSqlite = DB::getDriverName() === 'sqlite';

        if ($isSqlite && $grouping === 'week') {
            return $date->format('Y-') . str_pad($date->weekOfYear, 2, '0', STR_PAD_LEFT);
        }

        return match ($grouping) {
            'day'   => $date->format('Y-m-d'),
            'week'  => $date->format('o-') . str_pad($date->weekOfYear, 2, '0', STR_PAD_LEFT),
            'month' => $date->format('Y-m'),
            default => $date->format('Y-m-d'),
        };
    }

    private function metricLabel(string $metric): string
    {
        return match ($metric) {
            'work_items_completed' => 'Items Completados',
            'work_items_created'   => 'Items Creados',
            default                => $metric,
        };
    }
}

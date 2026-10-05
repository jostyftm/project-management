<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\WorkItem;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;

class AreaChartResolver
{
    /**
     * Resuelve flujo acumulado o comparativa temporal (creadas vs completadas).
     * Config: { grouping: 'day' | 'week' | 'month', date_from: string, date_to: string, project_ids: [] }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config     = $block->config ?? [];
        $grouping   = $config['grouping'] ?? 'week';
        $dateFrom   = Carbon::parse($config['date_from'] ?? now()->subDays(60)->toDateString());
        $dateTo     = Carbon::parse($config['date_to'] ?? now()->toDateString());
        $projectIds = $config['project_ids'] ?? [];

        $query = WorkItem::query();
        if (!empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (!empty($scope['workspace_id'])) {
            $query->whereHas('project', fn ($q) => $q->where('workspace_id', $scope['workspace_id']));
        }

        $createdExpr   = $this->getDateFormatExpression('created_at', $grouping);
        $completedExpr = $this->getDateFormatExpression('completed_at', $grouping);

        $createdResults = (clone $query)
            ->selectRaw("{$createdExpr} as period, COUNT(*) as count")
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupByRaw("{$createdExpr}")
            ->pluck('count', 'period')
            ->toArray();

        $completedResults = (clone $query)
            ->selectRaw("{$completedExpr} as period, COUNT(*) as count")
            ->whereBetween('completed_at', [$dateFrom, $dateTo])
            ->groupByRaw("{$completedExpr}")
            ->pluck('count', 'period')
            ->toArray();

        $interval = match ($grouping) {
            'day'   => '1 day',
            'week'  => '1 week',
            'month' => '1 month',
            default => '1 day',
        };

        $period = CarbonPeriod::create($dateFrom, $interval, $dateTo);
        $data = [];

        foreach ($period as $date) {
            $key = $this->formatPeriodKey($date, $grouping);

            $data[] = [
                'date'      => $key,
                'created'   => (int)($createdResults[$key] ?? 0),
                'completed' => (int)($completedResults[$key] ?? 0),
            ];
        }

        return [
            'series'   => $data,
            'grouping' => $grouping,
            'period'   => [
                'from' => $dateFrom->toDateString(),
                'to'   => $dateTo->toDateString(),
            ],
        ];
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
}

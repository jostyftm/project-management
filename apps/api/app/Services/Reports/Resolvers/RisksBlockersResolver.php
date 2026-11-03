<?php

namespace App\Services\Reports\Resolvers;

use App\Models\ReportBlock;
use App\Models\WorkItem;
use Carbon\Carbon;

class RisksBlockersResolver
{
    /**
     * Resuelve riesgos y bloqueos (tareas vencidas, estancadas o de alta prioridad pendientes).
     * Config: { project_ids: [], days_stagnant: int, limit: int }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config = $block->config ?? [];
        $projectIds = ! empty($config['project_ids']) ? (array) $config['project_ids'] : (! empty($config['project_id']) ? [$config['project_id']] : (! empty($scope['project_ids']) ? (array) $scope['project_ids'] : []));
        $cycleIds = ! empty($config['cycle_ids']) ? (array) $config['cycle_ids'] : (! empty($config['cycle_id']) ? [$config['cycle_id']] : (! empty($scope['cycle_ids']) ? (array) $scope['cycle_ids'] : []));
        $startDate = $config['start_date'] ?? $config['date_from'] ?? $scope['start_date'] ?? null;
        $endDate = $config['end_date'] ?? $config['date_to'] ?? $scope['end_date'] ?? null;

        $daysStagnant = max((int) ($config['days_stagnant'] ?? 7), 1);
        $limitRaw = $config['limit'] ?? null;
        $limit = ($limitRaw === 'all' || $limitRaw === 0 || $limitRaw === '0' || $limitRaw === null) ? null : max((int) $limitRaw, 1);

        $baseQuery = WorkItem::query()->whereNull('completed_at');

        if (! empty($projectIds)) {
            $baseQuery->whereIn('project_id', $projectIds);
        } elseif (! empty($scope['workspace_id'])) {
            $baseQuery->where('workspace_id', $scope['workspace_id']);
        }

        if (! empty($cycleIds)) {
            $baseQuery->whereHas('cycles', fn ($q) => $q->whereIn('cycles.id', $cycleIds));
        }

        if (! empty($startDate)) {
            $baseQuery->where('created_at', '>=', Carbon::parse($startDate)->startOfDay());
        }
        if (! empty($endDate)) {
            $baseQuery->where('created_at', '<=', Carbon::parse($endDate)->endOfDay());
        }

        // 1. Tareas vencidas
        $overdueQuery = (clone $baseQuery)
            ->whereNotNull('target_date')
            ->where('target_date', '<', now());
        $overdueCount = (clone $overdueQuery)->count();

        // 2. Tareas estancadas (sin actualización en N días)
        $stagnantQuery = (clone $baseQuery)
            ->where('updated_at', '<', now()->subDays($daysStagnant));
        $stagnantCount = (clone $stagnantQuery)->count();

        // 3. Tareas urgentes pendientes
        $urgentQuery = (clone $baseQuery)
            ->where('priority', 'URGENT');
        $urgentCount = (clone $urgentQuery)->count();

        // Obtener los riesgos más críticos combinados
        $riskyItemsQuery = (clone $baseQuery)
            ->where(function ($q) use ($daysStagnant) {
                $q->where(function ($sq) {
                    $sq->whereNotNull('target_date')->where('target_date', '<', now());
                })
                    ->orWhere('updated_at', '<', now()->subDays($daysStagnant))
                    ->orWhere('priority', 'URGENT');
            })
            ->with(['project:id,name,identifier', 'state:id,name,color'])
            ->orderByRaw("CASE 
                WHEN target_date < CURRENT_DATE THEN 1 
                WHEN priority = 'URGENT' THEN 2 
                ELSE 3 END")
            ->orderBy('target_date', 'asc');

        if ($limit !== null) {
            $riskyItemsQuery->take($limit);
        } else {
            $riskyItemsQuery->take(300);
        }

        $riskyItems = $riskyItemsQuery->get();

        $items = $riskyItems->map(function ($item) use ($daysStagnant) {
            $isOverdue = $item->target_date && Carbon::parse($item->target_date)->isPast();
            $isStagnant = Carbon::parse($item->updated_at)->lt(now()->subDays($daysStagnant));
            $isUrgent = $item->priority === 'URGENT';

            $reasons = [];
            if ($isOverdue) {
                $reasons[] = 'Vencida ('.Carbon::parse($item->target_date)->diffForHumans().')';
            }
            if ($isUrgent) {
                $reasons[] = 'Prioridad Urgente';
            }
            if ($isStagnant) {
                $reasons[] = 'Sin avance ('.Carbon::parse($item->updated_at)->diffForHumans().')';
            }

            $severity = ($isOverdue || $isUrgent) ? 'high' : 'medium';

            return [
                'id' => (string) $item->id,
                'identifier' => ($item->project?->identifier ? $item->project->identifier.'-'.$item->sequence_id : (string) $item->sequence_id),
                'title' => $item->title,
                'priority' => $item->priority,
                'target_date' => $item->target_date?->toDateString(),
                'state_name' => $item->state?->name,
                'state_color' => $item->state?->color,
                'severity' => $severity,
                'risk_reasons' => $reasons,
                'project_name' => $item->project?->name,
            ];
        });

        return [
            'risks' => $items->values()->toArray(),
            'summary' => [
                'overdue_count' => $overdueCount,
                'stagnant_count' => $stagnantCount,
                'urgent_count' => $urgentCount,
                'total_critical' => $overdueCount + $urgentCount,
            ],
        ];
    }
}

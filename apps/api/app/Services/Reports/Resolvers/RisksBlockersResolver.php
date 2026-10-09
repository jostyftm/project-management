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
        $projectIds = $config['project_ids'] ?? [];
        $daysStagnant = max((int) ($config['days_stagnant'] ?? 7), 1);
        $limit = min(max((int) ($config['limit'] ?? 10), 1), 30);

        $baseQuery = WorkItem::query()->whereNull('completed_at');

        if (! empty($projectIds)) {
            $baseQuery->whereIn('project_id', $projectIds);
        } elseif (! empty($scope['workspace_id'])) {
            $baseQuery->where('workspace_id', $scope['workspace_id']);
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
        $riskyItems = (clone $baseQuery)
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
            ->orderBy('target_date', 'asc')
            ->limit($limit)
            ->get();

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

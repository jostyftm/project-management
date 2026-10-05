<?php

namespace App\Services\Reports\Resolvers;

use App\Models\Release;
use App\Models\ReportBlock;

class ReleasesTimelineResolver
{
    /**
     * Resuelve la línea de tiempo de releases.
     * Config esperada: { project_ids: [], status: string, limit: int }
     */
    public function resolve(ReportBlock $block, array $scope): array
    {
        $config     = $block->config ?? [];
        $projectIds = $config['project_ids'] ?? [];
        $status     = $config['status'] ?? 'all';
        $limit      = min(max((int)($config['limit'] ?? 5), 1), 20);

        $query = Release::query();

        if (!empty($projectIds)) {
            $query->whereIn('project_id', $projectIds);
        } elseif (!empty($scope['workspace_id'])) {
            $query->where('workspace_id', $scope['workspace_id']);
        }

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $releases = $query->withCount('workItems')
            ->orderByRaw('COALESCE(published_at, created_at) DESC')
            ->limit($limit)
            ->get();

        $items = $releases->map(function ($r) {
            return [
                'id'           => (string)$r->id,
                'name'         => $r->name,
                'version'      => $r->version,
                'description'  => $r->description,
                'status'       => $r->status,
                'published_at' => $r->published_at?->toISOString(),
                'created_at'   => $r->created_at?->toISOString(),
                'items_count'  => (int)$r->work_items_count,
            ];
        });

        return [
            'releases' => $items->values()->toArray(),
            'total'    => $releases->count(),
            'status'   => $status,
        ];
    }
}

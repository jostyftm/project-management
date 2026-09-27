<?php

namespace App\Services;

use App\Models\Activity;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ActivityService
{
    /**
     * List chronological activities for a specific work item.
     */
    public function listForWorkItem(int|string $workItemId): Collection
    {
        return Activity::query()
            ->where('entity_type', 'WORK_ITEM')
            ->where('entity_id', $workItemId)
            ->with(['actor'])
            ->latest()
            ->get();
    }

    /**
     * List chronological activities for a project.
     */
    public function listForProject(int|string $projectId): Collection
    {
        return Activity::query()
            ->where('project_id', $projectId)
            ->with(['actor'])
            ->latest()
            ->limit(100)
            ->get();
    }

    /**
     * Log a new activity.
     */
    public function logActivity(
        int|string $workspaceId,
        int|string|null $projectId,
        int|string|null $actorId,
        string $entityType,
        int|string $entityId,
        string $action,
        ?array $diff = null
    ): Activity {
        return DB::transaction(function () use (
            $workspaceId,
            $projectId,
            $actorId,
            $entityType,
            $entityId,
            $action,
            $diff
        ) {
            return Activity::create([
                'workspace_id' => $workspaceId,
                'project_id' => $projectId,
                'actor_id' => $actorId,
                'entity_type' => strtoupper($entityType),
                'entity_id' => $entityId,
                'action' => strtoupper($action),
                'changes_diff' => $diff,
            ]);
        });
    }
}

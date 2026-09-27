<?php

namespace App\Services;

use App\Models\Initiative;
use App\Models\WorkItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

class InitiativeService
{
    public function list(Request $request): Collection
    {
        $query = Initiative::query()->with(['projects', 'creator'])->orderByDesc('created_at');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        return $query->get();
    }

    public function get(Initiative $initiative): array
    {
        $initiative->load(['projects', 'creator']);
        $projectIds = $initiative->projects->pluck('id')->toArray();

        $totalItems = 0;
        $completedItems = 0;

        if (!empty($projectIds)) {
            $workItems = WorkItem::whereIn('project_id', $projectIds)->with('state')->get();
            $totalItems = $workItems->count();
            $completedItems = $workItems->filter(fn ($i) => $i->state?->group === 'COMPLETED')->count();
        }

        $progressPercentage = $totalItems > 0 ? round(($completedItems / $totalItems) * 100, 1) : 0;

        return [
            'initiative' => $initiative,
            'metrics' => [
                'total_projects' => count($projectIds),
                'total_work_items' => $totalItems,
                'completed_work_items' => $completedItems,
                'progress_percentage' => $progressPercentage,
            ],
        ];
    }

    public function create(array $data): Initiative
    {
        $user = auth()->user();
        $workspaceId = $data['workspace_id'] ?? request()->header('X-Workspace-Id') ?? $user?->current_workspace_id;

        $initiative = Initiative::create([
            'workspace_id' => $workspaceId,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'target_date' => $data['target_date'] ?? null,
            'status' => $data['status'] ?? 'PLANNED',
            'created_by' => $user?->id,
        ]);

        if (!empty($data['project_ids'])) {
            $initiative->projects()->sync($data['project_ids']);
        }

        return $initiative->load(['projects', 'creator']);
    }

    public function update(Initiative $initiative, array $data): Initiative
    {
        $initiative->fill($data);
        $initiative->save();

        if (isset($data['project_ids'])) {
            $initiative->projects()->sync($data['project_ids']);
        }

        return $initiative->load(['projects', 'creator']);
    }

    public function delete(Initiative $initiative): void
    {
        $initiative->delete();
    }
}

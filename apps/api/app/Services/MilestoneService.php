<?php

namespace App\Services;

use App\Models\Milestone;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;

class MilestoneService
{
    public function list(int $projectId): Collection
    {
        return Milestone::where('project_id', $projectId)
            ->with(['workItems.state', 'project'])
            ->orderBy('target_date')
            ->get();
    }

    public function create(int $projectId, array $data): Milestone
    {
        $project = Project::findOrFail($projectId);

        $milestone = Milestone::create([
            'workspace_id' => $project->workspace_id,
            'project_id' => $project->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'target_date' => $data['target_date'] ?? null,
            'status' => $data['status'] ?? 'PENDING',
            'completed_at' => ($data['status'] ?? null) === 'COMPLETED' ? now() : null,
        ]);

        if (!empty($data['work_item_ids'])) {
            $milestone->workItems()->sync($data['work_item_ids']);
        }

        return $milestone->load(['workItems.state', 'project']);
    }

    public function update(Milestone $milestone, array $data): Milestone
    {
        if (isset($data['status'])) {
            if ($data['status'] === 'COMPLETED' && $milestone->status !== 'COMPLETED') {
                $milestone->completed_at = now();
            } elseif ($data['status'] !== 'COMPLETED') {
                $milestone->completed_at = null;
            }
        }

        $milestone->fill($data);
        $milestone->save();

        if (isset($data['work_item_ids'])) {
            $milestone->workItems()->sync($data['work_item_ids']);
        }

        return $milestone->load(['workItems.state', 'project']);
    }

    public function toggleComplete(Milestone $milestone): Milestone
    {
        if ($milestone->status === 'COMPLETED') {
            $milestone->status = 'PENDING';
            $milestone->completed_at = null;
        } else {
            $milestone->status = 'COMPLETED';
            $milestone->completed_at = now();
        }
        $milestone->save();

        return $milestone->load(['workItems.state', 'project']);
    }

    public function delete(Milestone $milestone): void
    {
        $milestone->delete();
    }
}

<?php

namespace App\Services;

use App\Models\Teamspace;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TeamspaceService
{
    public function list(Request $request): Collection
    {
        return Teamspace::query()->with(['projects', 'creator'])->orderBy('name')->get();
    }

    public function get(Teamspace $teamspace): Teamspace
    {
        return $teamspace->load(['projects', 'creator']);
    }

    public function create(array $data): Teamspace
    {
        $user = auth()->user();
        $workspaceId = $data['workspace_id'] ?? request()->header('X-Workspace-Id') ?? $user?->current_workspace_id;
        $slug = $data['slug'] ?? Str::slug($data['name']);

        $teamspace = Teamspace::create([
            'workspace_id' => $workspaceId,
            'name' => $data['name'],
            'slug' => $slug,
            'description' => $data['description'] ?? null,
            'icon' => $data['icon'] ?? '👥',
            'created_by' => $user?->id,
        ]);

        if (!empty($data['project_ids'])) {
            $teamspace->projects()->sync($data['project_ids']);
        }

        return $teamspace->load(['projects', 'creator']);
    }

    public function update(Teamspace $teamspace, array $data): Teamspace
    {
        if (isset($data['name']) && !isset($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $teamspace->fill($data);
        $teamspace->save();

        if (isset($data['project_ids'])) {
            $teamspace->projects()->sync($data['project_ids']);
        }

        return $teamspace->load(['projects', 'creator']);
    }

    public function delete(Teamspace $teamspace): void
    {
        $teamspace->delete();
    }
}

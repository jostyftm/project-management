<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Release;
use App\Models\WorkItem;
use Illuminate\Database\Eloquent\Collection;

class ReleaseService
{
    public function list(int $projectId): Collection
    {
        return Release::where('project_id', $projectId)
            ->with(['workItems.type', 'workItems.state', 'creator'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function create(int $projectId, array $data): Release
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        $release = Release::create([
            'workspace_id' => $project->workspace_id,
            'project_id' => $project->id,
            'name' => $data['name'],
            'version' => $data['version'],
            'description' => $data['description'] ?? null,
            'changelog' => $data['changelog'] ?? null,
            'status' => $data['status'] ?? 'DRAFT',
            'published_at' => ($data['status'] ?? null) === 'PUBLISHED' ? now() : null,
            'created_by' => $user?->id,
        ]);

        if (!empty($data['work_item_ids'])) {
            $release->workItems()->sync($data['work_item_ids']);
        }

        // Auto-generate changelog if empty
        if (empty($release->changelog)) {
            $release->changelog = $this->generateCategorizedChangelog($release);
            $release->save();
        }

        return $release->load(['workItems.type', 'workItems.state', 'creator']);
    }

    public function update(Release $release, array $data): Release
    {
        if (isset($data['status'])) {
            if ($data['status'] === 'PUBLISHED' && $release->status !== 'PUBLISHED') {
                $release->published_at = now();
                if (empty($data['changelog']) && empty($release->changelog)) {
                    $release->changelog = $this->generateCategorizedChangelog($release);
                }
            } elseif ($data['status'] !== 'PUBLISHED') {
                $release->published_at = null;
            }
        }

        $release->fill($data);
        $release->save();

        if (isset($data['work_item_ids'])) {
            $release->workItems()->sync($data['work_item_ids']);
        }

        return $release->load(['workItems.type', 'workItems.state', 'creator']);
    }

    public function publish(Release $release): Release
    {
        $release->status = 'PUBLISHED';
        $release->published_at = now();

        if (empty($release->changelog)) {
            $release->changelog = $this->generateCategorizedChangelog($release);
        }

        $release->save();

        return $release->load(['workItems.type', 'workItems.state', 'creator']);
    }

    public function generateChangelog(Release $release): string
    {
        $changelog = $this->generateCategorizedChangelog($release);
        $release->changelog = $changelog;
        $release->save();

        return $changelog;
    }

    public function delete(Release $release): void
    {
        $release->delete();
    }

    /**
     * Option A: Automatic Categorized Changelog Generator
     */
    protected function generateCategorizedChangelog(Release $release): string
    {
        $project = $release->project ?? Project::find($release->project_id);
        $projectIdentifier = $project?->identifier ?? 'PLN';

        // Get linked work items or completed work items of this project
        $items = $release->workItems()->with(['type', 'creator'])->get();

        if ($items->isEmpty()) {
            $items = WorkItem::where('project_id', $release->project_id)
                ->whereHas('state', fn ($q) => $q->where('group', 'COMPLETED'))
                ->with(['type', 'creator'])
                ->get();
        }

        $features = [];
        $fixes = [];
        $improvements = [];

        foreach ($items as $item) {
            $typeName = strtolower($item->type?->name ?? 'tarea');
            $identifier = "{$projectIdentifier}-{$item->sequence_id}";
            $author = $item->creator ? " (@{$item->creator->name})" : '';
            $line = "- **[{$identifier}]** {$item->title}{$author}";

            if (str_contains($typeName, 'bug') || str_contains($typeName, 'error')) {
                $fixes[] = $line;
            } elseif (str_contains($typeName, 'historia') || str_contains($typeName, 'epic') || str_contains($typeName, 'caracteristica') || str_contains($typeName, 'feature')) {
                $features[] = $line;
            } else {
                $improvements[] = $line;
            }
        }

        $sections = [];
        $sections[] = "# Notas de la Versión — {$release->version} ({$release->name})";
        $sections[] = "*Publicado el ".now()->format('Y-m-d')."*\n";

        if ($release->description) {
            $sections[] = "{$release->description}\n";
        }

        $sections[] = "### 🚀 Nuevas Características";
        if (!empty($features)) {
            $sections[] = implode("\n", $features);
        } else {
            $sections[] = "_Sin nuevas características registradas en este release._";
        }
        $sections[] = "";

        $sections[] = "### 🐛 Corrección de Errores";
        if (!empty($fixes)) {
            $sections[] = implode("\n", $fixes);
        } else {
            $sections[] = "_Sin correcciones de errores registradas en este release._";
        }
        $sections[] = "";

        $sections[] = "### ⚡ Mejoras y Tareas";
        if (!empty($improvements)) {
            $sections[] = implode("\n", $improvements);
        } else {
            $sections[] = "_Sin tareas adicionales en este release._";
        }

        return implode("\n", $sections);
    }
}

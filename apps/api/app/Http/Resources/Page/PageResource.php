<?php

namespace App\Http\Resources\Page;

use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'pages',
            'id' => (string) $this->id,
            'attributes' => [
                'title' => $this->title,
                'content_json' => $this->content_json ?? [],
                'is_published' => (bool) $this->is_published,
                'is_locked' => (bool) $this->is_locked,
                'access' => $this->access,
                'icon' => $this->icon,
                'color' => $this->color,
                'order' => (int) $this->order,
                'views_count' => (int) $this->views_count,
                'parent_id' => $this->parent_id ? (string) $this->parent_id : null,
                'project_id' => $this->project_id ? (string) $this->project_id : null,
                'created_by' => $this->created_by ? (string) $this->created_by : null,
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
            'relationships' => [
                'project' => [
                    'data' => $this->project ? [
                        'id' => (string) $this->project->id,
                        'name' => $this->project->name,
                        'identifier' => $this->project->identifier,
                        'current_user_role' => $this->resolveCurrentUserRole($this->project, $request->user()),
                    ] : null,
                ],
                'creator' => [
                    'data' => $this->creator ? [
                        'id' => (string) $this->creator->id,
                        'name' => $this->creator->name,
                        'email' => $this->creator->email,
                    ] : null,
                ],
                'last_editor' => [
                    'data' => $this->lastEditor ? [
                        'id' => (string) $this->lastEditor->id,
                        'name' => $this->lastEditor->name,
                        'email' => $this->lastEditor->email,
                    ] : null,
                ],
                'children' => PageResource::collection($this->whenLoaded('children')),
            ],
        ];
    }

    protected function resolveCurrentUserRole(?Project $project, ?User $user): ?string
    {
        if (! $project || ! $user) {
            return null;
        }

        if ($user->is_instance_admin) {
            return 'ADMIN';
        }

        if ($project->workspace && (int) $project->workspace->owner_id === (int) $user->id) {
            return 'ADMIN';
        }

        $projectMember = ProjectMember::where('project_id', $project->id)
            ->where('user_id', $user->id)
            ->first();

        return $projectMember?->role;
    }
}

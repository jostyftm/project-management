<?php

namespace App\Http\Resources\Project;

use App\Models\ProjectMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'projects',
            'id' => (string) $this->id,
            'attributes' => [
                'name' => $this->name,
                'identifier' => $this->identifier,
                'description' => $this->description,
                'icon' => $this->icon,
                'is_archived' => $this->is_archived,
                'is_public' => $this->is_public,
                'estimate_system' => $this->estimate_system ?? 'FIBONACCI',
                'start_date' => $this->start_date?->format('Y-m-d'),
                'target_date' => $this->target_date?->format('Y-m-d'),
                'completed_work_items_count' => $this->workItems()->whereHas('state', fn ($q) => $q->where('group', 'COMPLETED'))->count(),
                'overdue_items_count' => $this->workItems()->whereHas('state', fn ($q) => $q->whereNotIn('group', ['COMPLETED', 'CANCELLED']))->whereNotNull('target_date')->where('target_date', '<', now()->toDateString())->count(),
                'current_user_role' => $this->resolveCurrentUserRole($request->user()),
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
            'relationships' => [
                'lead' => [
                    'data' => $this->whenLoaded('lead', fn () => [
                        'id' => (string) $this->lead->id,
                        'name' => $this->lead->name,
                        'email' => $this->lead->email,
                    ]),
                ],
                'states' => StateResource::collection($this->whenLoaded('states')),
                'labels' => LabelResource::collection($this->whenLoaded('labels')),
                'work_items_count' => $this->workItems()->count(),
                'members_count' => $this->members()->count(),
            ],
        ];
    }

    protected function resolveCurrentUserRole(?User $user): ?string
    {
        if (! $user) {
            return null;
        }

        if ($user->is_instance_admin) {
            return 'ADMIN';
        }

        if ($this->workspace && (int) $this->workspace->owner_id === (int) $user->id) {
            return 'ADMIN';
        }

        if ($this->relationLoaded('members')) {
            $member = $this->members->firstWhere('id', $user->id);
            if ($member && isset($member->pivot->role)) {
                return $member->pivot->role;
            }
        }

        $projectMember = ProjectMember::where('project_id', $this->id)
            ->where('user_id', $user->id)
            ->first();

        return $projectMember?->role;
    }
}

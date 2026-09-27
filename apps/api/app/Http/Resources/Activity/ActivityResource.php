<?php

namespace App\Http\Resources\Activity;

use App\Http\Resources\User\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'activities',
            'id' => (string) $this->id,
            'attributes' => [
                'workspace_id' => $this->workspace_id,
                'project_id' => $this->project_id,
                'actor_id' => $this->actor_id,
                'entity_type' => $this->entity_type,
                'entity_id' => (string) $this->entity_id,
                'action' => $this->action,
                'changes_diff' => $this->changes_diff,
                'created_at' => $this->created_at?->toIso8601String(),
            ],
            'relationships' => [
                'actor' => [
                    'data' => $this->whenLoaded('actor', fn () => new UserResource($this->actor)),
                ],
            ],
        ];
    }
}

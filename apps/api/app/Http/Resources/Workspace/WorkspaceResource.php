<?php

namespace App\Http\Resources\Workspace;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkspaceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'workspaces',
            'id' => (string) $this->id,
            'attributes' => [
                'name' => $this->name,
                'slug' => $this->slug,
                'logo_url' => $this->logo_url,
                'owner_id' => $this->owner_id,
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
            'relationships' => [
                'owner' => [
                    'data' => $this->whenLoaded('owner', fn () => [
                        'id' => (string) $this->owner->id,
                        'name' => $this->owner->name,
                        'email' => $this->owner->email,
                    ]),
                ],
                'members_count' => $this->members()->count(),
                'projects_count' => $this->projects()->count(),
            ],
        ];
    }
}

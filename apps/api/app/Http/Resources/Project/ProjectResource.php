<?php

namespace App\Http\Resources\Project;

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
}

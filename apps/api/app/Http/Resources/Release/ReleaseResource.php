<?php

namespace App\Http\Resources\Release;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReleaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'releases',
            'id' => (string) $this->id,
            'attributes' => [
                'name' => $this->name,
                'version' => $this->version,
                'description' => $this->description,
                'changelog' => $this->changelog,
                'status' => $this->status,
                'published_at' => $this->published_at?->toISOString(),
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
            'relationships' => [
                'project' => [
                    'data' => $this->project ? [
                        'id' => (string) $this->project->id,
                        'name' => $this->project->name,
                        'identifier' => $this->project->identifier,
                    ] : null,
                ],
                'creator' => [
                    'data' => $this->creator ? [
                        'id' => (string) $this->creator->id,
                        'name' => $this->creator->name,
                        'email' => $this->creator->email,
                    ] : null,
                ],
                'work_items' => $this->whenLoaded('workItems', function () {
                    return $this->workItems->map(fn ($item) => [
                        'id' => (string) $item->id,
                        'sequence_id' => $item->sequence_id,
                        'title' => $item->title,
                        'priority' => $item->priority,
                        'type' => $item->type ? [
                            'id' => (string) $item->type->id,
                            'name' => $item->type->name,
                            'color' => $item->type->color,
                        ] : null,
                    ]);
                }),
            ],
        ];
    }
}

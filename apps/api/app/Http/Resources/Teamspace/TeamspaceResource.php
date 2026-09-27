<?php

namespace App\Http\Resources\Teamspace;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamspaceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'teamspaces',
            'id' => (string) $this->id,
            'attributes' => [
                'name' => $this->name,
                'slug' => $this->slug,
                'description' => $this->description,
                'icon' => $this->icon,
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
            'relationships' => [
                'projects' => $this->whenLoaded('projects', function () {
                    return $this->projects->map(fn ($p) => [
                        'id' => (string) $p->id,
                        'name' => $p->name,
                        'identifier' => $p->identifier,
                    ]);
                }),
                'creator' => [
                    'data' => $this->creator ? [
                        'id' => (string) $this->creator->id,
                        'name' => $this->creator->name,
                        'email' => $this->creator->email,
                    ] : null,
                ],
            ],
        ];
    }
}

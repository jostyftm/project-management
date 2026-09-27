<?php

namespace App\Http\Resources\Initiative;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InitiativeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'initiatives',
            'id' => (string) $this->id,
            'attributes' => [
                'title' => $this->title,
                'description' => $this->description,
                'target_date' => $this->target_date?->format('Y-m-d'),
                'status' => $this->status,
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

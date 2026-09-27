<?php

namespace App\Http\Resources\Sticky;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StickyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'stickies',
            'id' => (string) $this->id,
            'attributes' => [
                'content' => $this->content,
                'color' => $this->color,
                'is_pinned' => (bool) $this->is_pinned,
                'is_private' => (bool) $this->is_private,
                'position_x' => (int) $this->position_x,
                'position_y' => (int) $this->position_y,
                'is_owner' => $this->created_by === $request->user()?->id,
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
            'relationships' => [
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

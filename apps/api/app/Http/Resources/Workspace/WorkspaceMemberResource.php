<?php

namespace App\Http\Resources\Workspace;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkspaceMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'workspace_members',
            'id' => (string) $this->id,
            'attributes' => [
                'role' => $this->role,
                'joined_at' => $this->joined_at?->toISOString(),
            ],
            'relationships' => [
                'user' => [
                    'data' => [
                        'id' => (string) $this->user->id,
                        'name' => $this->user->name,
                        'email' => $this->user->email,
                    ],
                ],
            ],
        ];
    }
}

<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => 'users',
            'id' => $this->id,
            'attributes' => $this->getAttributes(),
        ];
    }

    /**
     * Get the attributes for the resource.
     *
     * @return array<string, mixed>
     */
    private function getAttributes(): array
    {
        return [
            'user_auth_id' => $this->user_auth_id,
            'name' => $this->name,
            'email' => $this->email,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    /**
     * Get the relationships for the resource.
     *
     * @return array<string, mixed>
     */
    private function getRelationships(): array
    {
        return [
            // Define relationships here if needed
        ];
    }
}

<?php

namespace App\Http\Resources\Notification;

use App\Http\Resources\User\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'notifications',
            'id' => (string) $this->id,
            'attributes' => [
                'workspace_id' => $this->workspace_id,
                'recipient_id' => $this->recipient_id,
                'actor_id' => $this->actor_id,
                'type' => $this->type,
                'entity_type' => $this->entity_type,
                'entity_id' => (string) $this->entity_id,
                'title' => $this->title,
                'message' => $this->message,
                'target_url' => $this->target_url,
                'is_read' => (bool) $this->is_read,
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

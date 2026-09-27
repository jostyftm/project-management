<?php

namespace App\Http\Resources\Webhook;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WebhookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'webhooks',
            'id' => (string) $this->id,
            'attributes' => [
                'workspace_id' => $this->workspace_id,
                'url' => $this->url,
                'secret_token' => $this->secret_token ? '••••••••' : null,
                'events_subscribed' => $this->events_subscribed ?? [],
                'is_active' => (bool) $this->is_active,
                'created_at' => $this->created_at?->toIso8601String(),
            ],
        ];
    }
}

<?php

namespace App\Http\Resources\Page;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PageAnalyticsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'page_analytics',
            'id' => (string) ($this['page_id'] ?? ''),
            'attributes' => [
                'title' => $this['title'] ?? '',
                'total_views' => (int) ($this['total_views'] ?? 0),
                'unique_viewers' => (int) ($this['unique_viewers'] ?? 0),
                'word_count' => (int) ($this['word_count'] ?? 0),
                'character_count' => (int) ($this['character_count'] ?? 0),
                'block_count' => (int) ($this['block_count'] ?? 0),
                'reading_time_minutes' => (int) ($this['reading_time_minutes'] ?? 1),
                'created_at' => $this['created_at'] ?? null,
                'updated_at' => $this['updated_at'] ?? null,
            ],
            'relationships' => [
                'creator' => $this['creator'] ?? null,
                'last_editor' => $this['last_editor'] ?? null,
                'recent_views' => $this['recent_views'] ?? [],
            ],
        ];
    }
}

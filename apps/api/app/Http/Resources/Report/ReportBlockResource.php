<?php

namespace App\Http\Resources\Report;

use App\Enums\BlockType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportBlockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'report_blocks',
            'id' => (string) $this->id,
            'attributes' => [
                'report_id' => (string) $this->report_id,
                'type' => $this->type instanceof BlockType ? $this->type->value : $this->type,
                'title' => $this->title,
                'position' => $this->position,
                'width' => $this->width,
                'config' => $this->config ?? [],
                'is_visible' => $this->is_visible,
                'has_cache' => ! is_null($this->cached_at),
                'cached_at' => $this->cached_at?->toISOString(),
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
                'data' => $this->when(isset($this->resolved_data), $this->resolved_data),
            ],
        ];
    }
}

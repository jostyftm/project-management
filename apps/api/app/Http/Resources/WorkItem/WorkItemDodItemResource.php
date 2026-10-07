<?php

namespace App\Http\Resources\WorkItem;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkItemDodItemResource extends JsonResource
{
    /**
     * Transform the resource into an array (JSON:API format).
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => 'work_item_dod_items',
            'id' => (string) $this->id,
            'attributes' => [
                'work_item_id' => (int) $this->work_item_id,
                'title' => $this->title,
                'is_completed' => (bool) $this->is_completed,
                'completed_by' => $this->completed_by ? (int) $this->completed_by : null,
                'completed_at' => $this->completed_at?->toIso8601String(),
                'created_at' => $this->created_at?->toIso8601String(),
                'updated_at' => $this->updated_at?->toIso8601String(),
            ],
            'relationships' => [
                'completed_by' => [
                    'data' => $this->relationLoaded('completedBy') && $this->completedBy ? [
                        'id' => (string) $this->completedBy->id,
                        'name' => $this->completedBy->name,
                    ] : null,
                ],
            ],
        ];
    }
}

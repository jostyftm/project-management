<?php

namespace App\Http\Resources\Cycle;

use App\Http\Resources\User\UserResource;
use App\Http\Resources\WorkItem\WorkItemResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CycleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'cycles',
            'id' => (string) $this->id,
            'attributes' => [
                'name' => $this->name,
                'description' => $this->description,
                'start_date' => $this->start_date?->format('Y-m-d'),
                'end_date' => $this->end_date?->format('Y-m-d'),
                'status' => $this->status,
                'total_items' => $this->workItems->count(),
                'completed_items' => $this->workItems->filter(fn ($i) => in_array($i->state?->group, ['COMPLETED', 'CANCELLED']))->count(),
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
            'relationships' => [
                'owner' => new UserResource($this->whenLoaded('owner')),
                'work_items' => WorkItemResource::collection($this->whenLoaded('workItems')),
            ],
        ];
    }
}

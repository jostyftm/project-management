<?php

namespace App\Http\Resources\Module;

use App\Http\Resources\User\UserResource;
use App\Http\Resources\WorkItem\WorkItemResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ModuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $total = $this->workItems->count();
        $completed = $this->workItems->filter(fn ($i) => in_array($i->state?->group, ['COMPLETED', 'CANCELLED']))->count();
        $progress = $total > 0 ? round(($completed / $total) * 100, 1) : 0;

        return [
            'type' => 'modules',
            'id' => (string) $this->id,
            'attributes' => [
                'name' => $this->name,
                'description' => $this->description,
                'status' => $this->status,
                'start_date' => $this->start_date?->format('Y-m-d'),
                'target_date' => $this->target_date?->format('Y-m-d'),
                'total_items' => $total,
                'completed_items' => $completed,
                'progress_percentage' => $progress,
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
            'relationships' => [
                'lead' => new UserResource($this->whenLoaded('lead')),
                'work_items' => WorkItemResource::collection($this->whenLoaded('workItems')),
            ],
        ];
    }
}

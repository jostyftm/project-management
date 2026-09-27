<?php

namespace App\Http\Resources\Milestone;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MilestoneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $totalItems = $this->relationLoaded('workItems') ? $this->workItems->count() : 0;
        $completedItems = $this->relationLoaded('workItems')
            ? $this->workItems->filter(fn ($i) => $i->state?->group === 'COMPLETED')->count()
            : 0;

        return [
            'type' => 'milestones',
            'id' => (string) $this->id,
            'attributes' => [
                'title' => $this->title,
                'description' => $this->description,
                'target_date' => $this->target_date?->format('Y-m-d'),
                'status' => $this->status,
                'completed_at' => $this->completed_at?->toISOString(),
                'total_work_items' => $totalItems,
                'completed_work_items' => $completedItems,
                'progress_percentage' => $totalItems > 0 ? round(($completedItems / $totalItems) * 100, 1) : 0,
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
            'relationships' => [
                'project' => [
                    'data' => $this->project ? [
                        'id' => (string) $this->project->id,
                        'name' => $this->project->name,
                        'identifier' => $this->project->identifier,
                    ] : null,
                ],
                'work_items' => $this->whenLoaded('workItems', function () {
                    return $this->workItems->map(fn ($item) => [
                        'id' => (string) $item->id,
                        'sequence_id' => $item->sequence_id,
                        'title' => $item->title,
                        'priority' => $item->priority,
                        'state' => $item->state ? [
                            'id' => (string) $item->state->id,
                            'name' => $item->state->name,
                            'color' => $item->state->color,
                            'group' => $item->state->group,
                        ] : null,
                    ]);
                }),
            ],
        ];
    }
}

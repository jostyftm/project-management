<?php

namespace App\Http\Resources\WorkItem;

use App\Http\Resources\Project\LabelResource;
use App\Http\Resources\Project\StateResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $project = $this->project;
        $identifier = $project ? "{$project->identifier}-{$this->sequence_id}" : (string) $this->sequence_id;

        return [
            'type' => 'work_items',
            'id' => (string) $this->id,
            'attributes' => [
                'sequence_id' => $this->sequence_id,
                'identifier' => $identifier,
                'title' => $this->title,
                'description_json' => $this->description_json,
                'priority' => $this->priority,
                'estimate_points' => $this->estimate_points,
                'start_date' => $this->start_date?->format('Y-m-d'),
                'target_date' => $this->target_date?->format('Y-m-d'),
                'is_draft' => $this->is_draft,
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
            'relationships' => [
                'state' => new StateResource($this->whenLoaded('state')),
                'project' => [
                    'data' => $project ? [
                        'id' => (string) $project->id,
                        'name' => $project->name,
                        'identifier' => $project->identifier,
                    ] : null,
                ],
                'creator' => [
                    'data' => $this->creator ? [
                        'id' => (string) $this->creator->id,
                        'name' => $this->creator->name,
                        'email' => $this->creator->email,
                    ] : null,
                ],
                'assignees' => $this->assignees->map(fn ($u) => [
                    'id' => (string) $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                ]),
                'labels' => LabelResource::collection($this->whenLoaded('labels')),
            ],
        ];
    }
}

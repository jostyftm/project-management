<?php

namespace App\Http\Resources\WorkItem;

use App\Http\Resources\Project\LabelResource;
use App\Http\Resources\Project\StateResource;
use App\Http\Resources\WorkItemType\WorkItemTypeResource;
use App\Services\Agile\WorkItemReadinessEvaluator;
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
                'description_html' => $this->description_html,
                'description' => $this->description_html,
                'description_json' => $this->description_json,
                'priority' => $this->priority,
                'sort_order' => (float) ($this->sort_order ?? 0),
                'estimate_points' => $this->estimate_points,
                'estimate_value' => $this->estimate_value,
                'start_date' => $this->start_date?->format('Y-m-d'),
                'target_date' => $this->target_date?->format('Y-m-d'),
                'completed_at' => $this->completed_at?->toISOString(),
                'state_changed_at' => $this->state_changed_at?->toISOString(),
                'age_in_state_days' => $this->state_changed_at ? (int) $this->state_changed_at->diffInDays(now()) : ($this->updated_at ? (int) $this->updated_at->diffInDays(now()) : 0),
                'is_draft' => $this->is_draft,
                'is_blocked' => (bool) $this->is_blocked,
                'blocked_reason' => $this->blocked_reason,
                'blocked_at' => $this->blocked_at?->toISOString(),
                'blocked_by' => $this->relationLoaded('blockedByUser') && $this->blockedByUser ? [
                    'id' => (string) $this->blockedByUser->id,
                    'name' => $this->blockedByUser->name,
                ] : null,
                'rollup_points' => $this->relationLoaded('subItems') ? (float) $this->subItems->sum(fn ($s) => (float) ($s->estimate_points ?? 0)) : null,
                'readiness' => app(WorkItemReadinessEvaluator::class)->evaluate($this->resource),
                'lead_id' => $this->lead_id,
                'created_by' => $this->created_by,
                'milestone_id' => $this->milestone_id ?? $this->whenLoaded('milestones', fn () => $this->milestones->first()?->id),
                'deliverables_count' => $this->relationLoaded('deliverables') ? $this->deliverables->count() : ($this->deliverables_count ?? 0),
                'approved_deliverables_count' => $this->relationLoaded('deliverables') ? $this->deliverables->where('status', 'APPROVED')->count() : 0,
                'dod_items_count' => $this->relationLoaded('dodItems') ? $this->dodItems->count() : ($this->dod_items_count ?? 0),
                'completed_dod_items_count' => $this->relationLoaded('dodItems') ? $this->dodItems->where('is_completed', true)->count() : 0,
                'deliverables' => $this->whenLoaded('deliverables', fn () => $this->deliverables->map(fn ($d) => [
                    'id' => $d->id,
                    'title' => $d->title,
                    'type' => $d->type,
                    'url' => $d->url,
                    'file_url' => $d->file_url,
                    'file_name' => $d->file_name,
                    'file_size' => $d->file_size,
                    'file_mime' => $d->file_mime,
                    'description' => $d->description,
                    'status' => $d->status,
                    'reviewed_at' => $d->reviewed_at?->toISOString(),
                    'review_notes' => $d->review_notes,
                    'created_at' => $d->created_at?->toISOString(),
                    'creator' => $d->creator ? [
                        'id' => $d->creator->id,
                        'name' => $d->creator->name,
                        'email' => $d->creator->email,
                    ] : null,
                ])),
                'dod_items' => $this->whenLoaded('dodItems', fn () => $this->dodItems->map(fn ($dod) => [
                    'id' => $dod->id,
                    'title' => $dod->title,
                    'is_completed' => (bool) $dod->is_completed,
                    'completed_at' => $dod->completed_at?->toISOString(),
                ])),
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
            'relationships' => [
                'state' => new StateResource($this->whenLoaded('state')),
                'type' => new WorkItemTypeResource($this->whenLoaded('type')),
                'lead' => [
                    'data' => $this->lead ? [
                        'id' => (string) $this->lead->id,
                        'name' => $this->lead->name,
                        'email' => $this->lead->email,
                    ] : null,
                ],
                'milestone' => [
                    'data' => ($this->milestone ?? ($this->relationLoaded('milestones') ? $this->milestones->first() : null)) ? [
                        'id' => (string) ($this->milestone?->id ?? $this->milestones->first()?->id),
                        'title' => $this->milestone?->title ?? $this->milestones->first()?->title,
                        'status' => $this->milestone?->status ?? $this->milestones->first()?->status,
                    ] : null,
                ],
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
                'assignees' => $this->assignees ? $this->assignees->map(fn ($u) => [
                    'id' => (string) $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                ]) : [],
                'labels' => LabelResource::collection($this->whenLoaded('labels')),
                'parent' => [
                    'data' => $this->parent_id ? [
                        'id' => (string) $this->parent_id,
                    ] : null,
                ],
                'sub_items' => $this->relationLoaded('subItems') ? $this->subItems->map(fn ($s) => [
                    'id' => (string) $s->id,
                    'identifier' => $project ? "{$project->identifier}-{$s->sequence_id}" : (string) $s->sequence_id,
                    'title' => $s->title,
                    'priority' => $s->priority,
                    'start_date' => $s->start_date?->format('Y-m-d'),
                    'target_date' => $s->target_date?->format('Y-m-d'),
                    'state_id' => $s->state_id,
                    'state' => $s->state ? [
                        'id' => (string) $s->state->id,
                        'name' => $s->state->name,
                        'color' => $s->state->color,
                        'group' => $s->state->group,
                    ] : null,
                    'lead_id' => $s->lead_id,
                    'lead' => $s->lead ? [
                        'id' => (string) $s->lead->id,
                        'name' => $s->lead->name,
                        'email' => $s->lead->email,
                    ] : null,
                    'assignees' => $s->relationLoaded('assignees') ? $s->assignees->map(fn ($u) => [
                        'id' => (string) $u->id,
                        'name' => $u->name,
                        'email' => $u->email,
                    ]) : [],
                ]) : [],
                'cycles' => $this->relationLoaded('cycles') ? $this->cycles->map(fn ($c) => [
                    'id' => (string) $c->id,
                    'name' => $c->name,
                    'status' => $c->status,
                ]) : [],
                'modules' => $this->relationLoaded('modules') ? $this->modules->map(fn ($m) => [
                    'id' => (string) $m->id,
                    'name' => $m->name,
                    'status' => $m->status,
                ]) : [],
                'outward_relations' => $this->relationLoaded('outwardRelations') ? $this->outwardRelations->map(fn ($r) => [
                    'id' => (string) $r->id,
                    'relation_type' => $r->relation_type,
                    'target' => $r->target ? [
                        'id' => (string) $r->target->id,
                        'title' => $r->target->title,
                        'identifier' => $project ? "{$project->identifier}-{$r->target->sequence_id}" : (string) $r->target->sequence_id,
                        'state' => $r->target->state ? ['name' => $r->target->state->name, 'color' => $r->target->state->color] : null,
                    ] : null,
                ]) : [],
                'inward_relations' => $this->relationLoaded('inwardRelations') ? $this->inwardRelations->map(fn ($r) => [
                    'id' => (string) $r->id,
                    'relation_type' => $r->relation_type,
                    'source' => $r->source ? [
                        'id' => (string) $r->source->id,
                        'title' => $r->source->title,
                        'identifier' => $project ? "{$project->identifier}-{$r->source->sequence_id}" : (string) $r->source->sequence_id,
                    ] : null,
                ]) : [],
            ],
        ];
    }
}

<?php

namespace App\Services;

use App\Models\Project;

class ProjectExportService
{
    /**
     * Serializa un proyecto completo en una estructura JSON canónica y portable.
     */
    public function export(Project $project): array
    {
        // Cargar todas las relaciones necesarias
        $project->load([
            'lead:id,name,email',
            'states' => fn ($q) => $q->orderBy('sequence'),
            'labels',
            'workItemTypes',
            'cycles' => fn ($q) => $q->orderBy('start_date'),
            'modules' => fn ($q) => $q->with('lead:id,name,email'),
            'milestones',
            'releases',
            'pages' => fn ($q) => $q->orderBy('order'),
            'views',
            'workItems' => function ($q) {
                $q->withoutGlobalScopes()
                    ->with([
                        'state:id,name,group',
                        'type:id,name',
                        'lead:id,name,email',
                        'milestone:id,title',
                        'labels:id,name',
                        'cycles:id,name',
                        'modules:id,name',
                        'dodItems',
                        'outwardRelations',
                    ])
                    ->orderBy('sequence_id');
            },
        ]);

        return [
            'version' => '1.0',
            'exported_at' => now()->toIso8601String(),
            'project' => [
                'name' => $project->name,
                'identifier' => $project->identifier,
                'description' => $project->description,
                'icon' => $project->icon,
                'is_public' => (bool) $project->is_public,
                'is_archived' => (bool) $project->is_archived,
                'estimate_system' => $project->estimate_system ?? 'FIBONACCI',
                'start_date' => $project->start_date?->format('Y-m-d'),
                'target_date' => $project->target_date?->format('Y-m-d'),
                'auto_rollup_parent' => (bool) $project->auto_rollup_parent,
                'aging_threshold_days' => $project->aging_threshold_days,
                'require_evidence_to_complete' => (bool) $project->require_evidence_to_complete,
                'lead_email' => $project->lead?->email,
            ],
            'states' => $project->states->map(fn ($s) => [
                'name' => $s->name,
                'group' => $s->group,
                'color' => $s->color,
                'sequence' => $s->sequence,
                'is_default' => (bool) $s->is_default,
                'description' => $s->description,
            ])->values()->all(),
            'labels' => $project->labels->map(fn ($l) => [
                'name' => $l->name,
                'color' => $l->color,
                'description' => $l->description,
            ])->values()->all(),
            'work_item_types' => $project->workItemTypes->map(fn ($t) => [
                'name' => $t->name,
                'description' => $t->description,
                'icon' => $t->icon,
                'color' => $t->color,
            ])->values()->all(),
            'cycles' => $project->cycles->map(fn ($c) => [
                'name' => $c->name,
                'description' => $c->description,
                'start_date' => $c->start_date ? (is_string($c->start_date) ? substr($c->start_date, 0, 10) : $c->start_date->format('Y-m-d')) : null,
                'end_date' => $c->end_date ? (is_string($c->end_date) ? substr($c->end_date, 0, 10) : $c->end_date->format('Y-m-d')) : null,
                'status' => $c->status,
            ])->values()->all(),
            'modules' => $project->modules->map(fn ($m) => [
                'name' => $m->name,
                'description' => $m->description,
                'status' => $m->status,
                'start_date' => $m->start_date ? (is_string($m->start_date) ? substr($m->start_date, 0, 10) : $m->start_date->format('Y-m-d')) : null,
                'target_date' => $m->target_date ? (is_string($m->target_date) ? substr($m->target_date, 0, 10) : $m->target_date->format('Y-m-d')) : null,
                'lead_email' => $m->lead?->email,
            ])->values()->all(),
            'milestones' => $project->milestones->map(fn ($m) => [
                'title' => $m->title,
                'description' => $m->description,
                'target_date' => $m->target_date ? (is_string($m->target_date) ? substr($m->target_date, 0, 10) : $m->target_date->format('Y-m-d')) : null,
                'status' => $m->status,
                'completed_at' => $m->completed_at?->toIso8601String(),
            ])->values()->all(),
            'releases' => $project->releases->map(fn ($r) => [
                'name' => $r->name,
                'version' => $r->version,
                'description' => $r->description,
                'changelog' => $r->changelog,
                'status' => $r->status,
                'published_at' => $r->published_at?->toIso8601String(),
            ])->values()->all(),
            'pages' => $project->pages->map(fn ($p) => [
                'title' => $p->title,
                'content_json' => $p->content_json,
                'is_published' => (bool) $p->is_published,
                'is_locked' => (bool) $p->is_locked,
                'access' => $p->access,
                'icon' => $p->icon,
                'color' => $p->color,
                'order' => $p->order,
            ])->values()->all(),
            'views' => $project->views->map(fn ($v) => [
                'name' => $v->name,
                'description' => $v->description,
                'filters' => $v->filters,
                'display_filters' => $v->display_filters,
            ])->values()->all(),
            'work_items' => $this->serializeWorkItems($project),
        ];
    }

    /**
     * Serializa los work items y mapea IDs internos a referencias estables por nombre o sequence_id.
     */
    protected function serializeWorkItems(Project $project): array
    {
        $idToSequenceMap = $project->workItems->pluck('sequence_id', 'id')->all();

        return $project->workItems->map(function ($item) use ($idToSequenceMap) {
            $parentSequenceId = $item->parent_id && isset($idToSequenceMap[$item->parent_id])
                ? $idToSequenceMap[$item->parent_id]
                : null;

            return [
                'sequence_id' => $item->sequence_id,
                'title' => $item->title,
                'description_html' => $item->description_html,
                'description_json' => $item->description_json,
                'priority' => $item->priority,
                'sort_order' => $item->sort_order,
                'estimate_points' => $item->estimate_points,
                'estimate_value' => $item->estimate_value,
                'start_date' => $item->start_date ? (is_string($item->start_date) ? substr($item->start_date, 0, 10) : $item->start_date->format('Y-m-d')) : null,
                'target_date' => $item->target_date ? (is_string($item->target_date) ? substr($item->target_date, 0, 10) : $item->target_date->format('Y-m-d')) : null,
                'completed_at' => $item->completed_at?->toIso8601String(),
                'is_draft' => (bool) $item->is_draft,
                'is_blocked' => (bool) $item->is_blocked,
                'blocked_reason' => $item->blocked_reason,
                'parent_sequence_id' => $parentSequenceId,
                'state_name' => $item->state?->name,
                'state_group' => $item->state?->group,
                'type_name' => $item->type?->name,
                'lead_email' => $item->lead?->email,
                'milestone_title' => $item->milestone?->title,
                'labels' => $item->labels->pluck('name')->all(),
                'cycles' => $item->cycles->pluck('name')->all(),
                'modules' => $item->modules->pluck('name')->all(),
                'dod_items' => $item->dodItems->map(fn ($dod) => [
                    'title' => $dod->title,
                    'is_completed' => (bool) $dod->is_completed,
                    'completed_at' => $dod->completed_at?->toIso8601String(),
                ])->values()->all(),
                'relations' => $item->outwardRelations->map(function ($rel) use ($idToSequenceMap) {
                    return [
                        'target_sequence_id' => $idToSequenceMap[$rel->target_id] ?? null,
                        'relation_type' => $rel->relation_type,
                    ];
                })->filter(fn ($rel) => ! empty($rel['target_sequence_id']))->values()->all(),
            ];
        })->values()->all();
    }
}

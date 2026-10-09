<?php

namespace App\Mcp\Tools\WorkItems;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('get_work_item')]
#[Title('Obtener Detalle de Work Item')]
#[Description('Consulta la información detallada de una tarea, historia o bug por su clave (ej: "ENG-101") o su ID numérico, incluyendo su checklist DoD, entregables, ciclo, módulo, hito y subtareas.')]
#[IsReadOnly]
class GetWorkItemTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'item' => $schema->string()
                ->description('Clave del ítem (ej: "ENG-101" o "123") o ID numérico.')
                ->required(),
            'project' => $schema->string()
                ->description('Opcional: ID numérico o identificador del proyecto si se provee únicamente el sequence_id.'),
        ];
    }

    public function handle(Request $request): Response
    {
        $itemKey = $request->get('item');
        $projectKey = $request->get('project');

        $project = $projectKey ? $this->resolveProject($request, $projectKey) : null;
        $workItem = $this->resolveWorkItem($request, $itemKey, $project);

        if (! $workItem) {
            return Response::error("Work item '{$itemKey}' no encontrado.");
        }

        if ($authError = $this->authorizeProject($request, $workItem->project)) {
            return $authError;
        }

        $workItem->load([
            'project:id,identifier,name',
            'state:id,name,group,color',
            'type:id,name,icon,color',
            'creator:id,name,email',
            'lead:id,name,email',
            'assignees:id,name,email',
            'labels:id,name,color',
            'cycles:id,name,status,start_date,end_date',
            'modules:id,name,status',
            'milestone:id,title,target_date,status',
            'milestones:id,title,target_date,status',
            'subItems.state:id,name,group,color',
            'dodItems',
            'deliverables',
            'outwardRelations.target.state',
            'inwardRelations.source.state',
        ]);

        $projectRef = $workItem->project;

        return Response::text($this->formatJson([
            'id' => $workItem->id,
            'key' => $projectRef ? "{$projectRef->identifier}-{$workItem->sequence_id}" : (string) $workItem->sequence_id,
            'sequence_id' => $workItem->sequence_id,
            'project' => $projectRef ? [
                'id' => $projectRef->id,
                'identifier' => $projectRef->identifier,
                'name' => $projectRef->name,
            ] : null,
            'title' => $workItem->title,
            'description_html' => $workItem->description_html,
            'description' => $workItem->description_html,
            'description_json' => $workItem->description_json,
            'priority' => $workItem->priority,
            'estimate_points' => $workItem->estimate_points,
            'estimate_value' => $workItem->estimate_value,
            'state' => $workItem->state ? [
                'id' => $workItem->state->id,
                'name' => $workItem->state->name,
                'group' => $workItem->state->group,
                'color' => $workItem->state->color,
            ] : null,
            'type' => $workItem->type ? [
                'id' => $workItem->type->id,
                'name' => $workItem->type->name,
            ] : null,
            'lead' => $workItem->lead ? [
                'id' => $workItem->lead->id,
                'name' => $workItem->lead->name,
                'email' => $workItem->lead->email,
            ] : null,
            'assignees' => $workItem->assignees->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ]),
            'labels' => $workItem->labels->map(fn ($l) => [
                'id' => $l->id,
                'name' => $l->name,
                'color' => $l->color,
            ]),
            'cycles' => $workItem->cycles->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'status' => $c->status,
                'start_date' => $c->start_date?->format('Y-m-d'),
                'end_date' => $c->end_date?->format('Y-m-d'),
            ]),
            'modules' => $workItem->modules->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'status' => $m->status,
            ]),
            'milestone' => $workItem->milestone ? [
                'id' => $workItem->milestone->id,
                'title' => $workItem->milestone->title,
                'target_date' => $workItem->milestone->target_date?->format('Y-m-d'),
                'status' => $workItem->milestone->status,
            ] : null,
            'dod_items' => $workItem->dodItems->map(fn ($d) => [
                'id' => $d->id,
                'description' => $d->description,
                'completed' => (bool) $d->completed,
                'completed_at' => $d->completed_at?->toIso8601String(),
            ]),
            'deliverables' => $workItem->deliverables->map(fn ($del) => [
                'id' => $del->id,
                'title' => $del->title,
                'type' => $del->type,
                'status' => $del->status,
                'file_path' => $del->file_path,
                'url' => $del->url,
            ]),
            'sub_items' => $workItem->subItems->map(fn ($sub) => [
                'id' => $sub->id,
                'key' => $projectRef ? "{$projectRef->identifier}-{$sub->sequence_id}" : (string) $sub->sequence_id,
                'title' => $sub->title,
                'state' => $sub->state?->name,
            ]),
            'start_date' => $workItem->start_date?->format('Y-m-d'),
            'target_date' => $workItem->target_date?->format('Y-m-d'),
            'completed_at' => $workItem->completed_at?->toIso8601String(),
            'created_at' => $workItem->created_at?->toIso8601String(),
        ]));
    }
}

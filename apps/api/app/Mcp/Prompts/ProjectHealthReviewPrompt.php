<?php

namespace App\Mcp\Prompts;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\WorkItem;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Prompt;
use Laravel\Mcp\Server\Prompts\Argument;

#[Name('project_health_review')]
#[Title('Auditoría de Salud del Proyecto')]
#[Description('Plantilla para que la IA realice una auditoría exhaustiva del proyecto: cuellos de botella, tareas bloqueadas o vencidas y recomendaciones de mitigación.')]
class ProjectHealthReviewPrompt extends Prompt
{
    use ResolvesWorkspaceContext;

    public function arguments(): array
    {
        return [
            new Argument(
                name: 'project',
                description: 'ID numérico o identificador del proyecto (ej: "ENG" o 1)',
                required: true
            ),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::text("Error: Proyecto '{$projectKey}' no encontrado.");
        }

        // Tareas vencidas
        $overdueItems = WorkItem::where('project_id', $project->id)
            ->whereNotNull('target_date')
            ->where('target_date', '<', now()->toDateString())
            ->whereDoesntHave('state', fn ($q) => $q->whereIn('group', ['COMPLETED', 'CANCELLED']))
            ->with(['state:id,name', 'lead:id,name'])
            ->get();

        // Tareas en progreso
        $inProgressItems = WorkItem::where('project_id', $project->id)
            ->whereHas('state', fn ($q) => $q->where('group', 'STARTED'))
            ->with(['state:id,name', 'lead:id,name'])
            ->get();

        $overdueList = $overdueItems->map(fn ($i) => "- [{$project->identifier}-{$i->sequence_id}] {$i->title} (Vencida el: {$i->target_date?->format('Y-m-d')}, Responsable: ".($i->lead?->name ?? 'Sin asignar').')')->implode("\n");
        $inProgressList = $inProgressItems->map(fn ($i) => "- [{$project->identifier}-{$i->sequence_id}] {$i->title} (Estado: {$i->state?->name}, Responsable: ".($i->lead?->name ?? 'Sin asignar').')')->implode("\n");

        $prompt = <<<EOT
Actúa como un Delivery Manager y Consultor de Aseguramiento de Calidad.
Realiza una auditoría de salud y riesgo para el proyecto **{$project->name} ({$project->identifier})**.

### Datos actuales:
- **Tareas vencidas sin completar:** {$overdueItems->count()}
{$overdueList}

- **Tareas actualmente en progreso (WIP):** {$inProgressItems->count()}
{$inProgressList}

### Instrucciones para la IA:
1. Evalúa el riesgo de entrega basándote en la cantidad de tareas vencidas y el WIP (Work In Progress).
2. Identifica posibles cuellos de botella por acumulación de tareas o falta de responsables asignados.
3. Propón un plan de acción concreto:
   - Tareas prioritarias a desbloquear o reasignar.
   - Recomendaciones para ajustar fechas objetivo o simplificar alcance.
   - Acciones preventivas para los próximos ciclos de trabajo.
EOT;

        return Response::text($prompt);
    }
}

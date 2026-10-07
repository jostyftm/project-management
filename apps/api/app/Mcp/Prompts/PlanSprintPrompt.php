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

#[Name('plan_sprint')]
#[Title('Planificar Sprint / Ciclo de Trabajo')]
#[Description('Plantilla estructurada para que el modelo de IA planifique un sprint o ciclo ágil a partir del backlog del proyecto y la capacidad estimada.')]
class PlanSprintPrompt extends Prompt
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
            new Argument(
                name: 'sprint_goal',
                description: 'Objetivo principal del sprint a planificar',
                required: true
            ),
            new Argument(
                name: 'capacity_points',
                description: 'Capacidad estimada en story points o esfuerzo del equipo (opcional)',
                required: false
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

        if ($authError = $this->authorizeProject($request, $project)) {
            return Response::text("Acceso Denegado: No perteneces al proyecto '{$projectKey}'.");
        }

        $sprintGoal = $request->get('sprint_goal');
        $capacityPoints = $request->get('capacity_points') ?: 'No especificada';

        // Obtener candidatos del backlog (sin ciclo asignado o con estado BACKLOG / UNSTARTED)
        $backlogItems = WorkItem::where('project_id', $project->id)
            ->whereDoesntHave('cycles')
            ->whereHas('state', fn ($q) => $q->whereIn('group', ['BACKLOG', 'UNSTARTED']))
            ->with(['state:id,name', 'type:id,name'])
            ->orderBy('priority', 'desc')
            ->orderBy('sequence_id', 'asc')
            ->take(30)
            ->get();

        $itemsList = $backlogItems->map(function ($item) use ($project) {
            return "- [{$project->identifier}-{$item->sequence_id}] {$item->title} (Prioridad: {$item->priority}, Puntos: ".($item->estimate_points ?? 'Sin estimar').', Tipo: '.($item->type?->name ?? 'General').')';
        })->implode("\n");

        $prompt = <<<EOT
Actúa como un Agile Coach y Lead Técnico experimentado.
Estamos planificando un nuevo Sprint para el proyecto **{$project->name} ({$project->identifier})**.

### Parámetros del Sprint:
- **Objetivo del Sprint:** {$sprintGoal}
- **Capacidad estimada:** {$capacityPoints} puntos
- **Sistema de estimación:** {$project->estimate_system}

### Candidatos disponibles en el Backlog:
{$itemsList}

### Instrucciones para la IA:
1. Analiza cuáles de las tareas del backlog se alinean directamente con el objetivo «{$sprintGoal}».
2. Si algunas tareas no tienen puntos de estimación, sugiere una estimación razonable.
3. Propón la lista final de tareas recomendadas para incluir en el nuevo ciclo.
4. Si consideras necesario crear subtareas o tareas complementarias de pruebas/QA o documentación, especifícalas y puedes crearlas con la herramienta `create_work_item`.
5. Una vez validado, crea el ciclo con la herramienta `create_cycle` y asocia las tareas usando `update_work_item(cycle_id: ...)`.
EOT;

        return Response::text($prompt);
    }
}

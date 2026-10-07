<?php

namespace App\Mcp\Resources;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Cycle;
use App\Models\Module;
use App\Models\WorkItem;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Contracts\HasUriTemplate;
use Laravel\Mcp\Server\Resource;
use Laravel\Mcp\Support\UriTemplate;

#[Name('project_summary')]
#[Title('Resumen Ejecutivo del Proyecto')]
#[MimeType('text/markdown')]
#[Description('Informe ejecutivo estructurado en Markdown con la salud del proyecto, sprint en curso, distribución de tareas y progreso de módulos.')]
class ProjectSummaryResource extends Resource implements HasUriTemplate
{
    use ResolvesWorkspaceContext;

    public function uriTemplate(): UriTemplate
    {
        return new UriTemplate('projects://{project}/summary');
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::text("# Error\n\nProyecto '{$projectKey}' no encontrado.");
        }

        $currentCycle = Cycle::where('project_id', $project->id)
            ->where('status', 'CURRENT')
            ->first();

        $modules = Module::where('project_id', $project->id)->get();

        $totalItems = WorkItem::where('project_id', $project->id)->count();
        $completedItems = WorkItem::where('project_id', $project->id)
            ->whereHas('state', fn ($q) => $q->where('group', 'COMPLETED'))
            ->count();
        $urgentItems = WorkItem::where('project_id', $project->id)
            ->where('priority', 'URGENT')
            ->whereDoesntHave('state', fn ($q) => $q->whereIn('group', ['COMPLETED', 'CANCELLED']))
            ->get();

        $md = "# Resumen Ejecutivo: {$project->name} ({$project->identifier})\n\n";
        $md .= '**Descripción:** '.($project->description ?: 'Sin descripción')."\n\n";
        $md .= "## 📊 Métricas Generales\n";
        $md .= "- **Total de Tareas/Historias:** {$totalItems}\n";
        $md .= "- **Completadas:** {$completedItems} (".($totalItems > 0 ? round(($completedItems / $totalItems) * 100, 1) : 0)."%)\n";
        $md .= "- **Sistema de Estimación:** {$project->estimate_system}\n\n";

        $md .= "## 🏃 Ciclo / Sprint Actual\n";
        if ($currentCycle) {
            $cycleItemsCount = $currentCycle->workItems()->count();
            $cycleCompletedCount = $currentCycle->workItems()->whereHas('state', fn ($q) => $q->where('group', 'COMPLETED'))->count();
            $md .= "- **Nombre:** {$currentCycle->name}\n";
            $md .= '- **Periodo:** '.($currentCycle->start_date?->format('Y-m-d') ?: 'N/A').' al '.($currentCycle->end_date?->format('Y-m-d') ?: 'N/A')."\n";
            $md .= "- **Progreso:** {$cycleCompletedCount} de {$cycleItemsCount} tareas completadas\n\n";
        } else {
            $md .= "*No hay un ciclo marcado como CURRENT actualmente.*\n\n";
        }

        $md .= "## 📦 Módulos Funcionales\n";
        if ($modules->isNotEmpty()) {
            foreach ($modules as $mod) {
                $mTotal = $mod->workItems()->count();
                $mDone = $mod->workItems()->whereHas('state', fn ($q) => $q->where('group', 'COMPLETED'))->count();
                $pct = $mTotal > 0 ? round(($mDone / $mTotal) * 100) : 0;
                $md .= "- **{$mod->name}** [{$mod->status}]: {$mDone}/{$mTotal} tareas ({$pct}%)\n";
            }
            $md .= "\n";
        } else {
            $md .= "*No se han registrado módulos para este proyecto.*\n\n";
        }

        $md .= "## ⚠️ Tareas Urgentes Pendientes\n";
        if ($urgentItems->isNotEmpty()) {
            foreach ($urgentItems as $item) {
                $md .= "- [{$project->identifier}-{$item->sequence_id}] **{$item->title}** (Estado: ".($item->state?->name ?? 'N/A').")\n";
            }
        } else {
            $md .= "No hay tareas urgentes bloqueadas o pendientes.\n";
        }

        return Response::text($md);
    }
}

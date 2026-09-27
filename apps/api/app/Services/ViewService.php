<?php

namespace App\Services;

use App\Models\Project;
use App\Models\View;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ViewService
{
    /**
     * Lista las vistas privadas del usuario autenticado para un proyecto o workspace.
     */
    public function list(Request $request, ?Project $project = null): Collection
    {
        $user = $request->user();
        $workspaceId = app('current_workspace_id');

        $query = View::where('workspace_id', $workspaceId)
            ->where('created_by', $user->id);

        if ($project) {
            $query->where('project_id', $project->id);
        } else {
            $query->whereNull('project_id');
        }

        return $query->orderBy('name')->get();
    }

    /**
     * Obtiene una vista verificando que pertenezca al usuario (privada).
     */
    public function get(View $view, int $userId): View
    {
        if ($view->created_by !== $userId) {
            abort(403, 'No tienes permiso para ver esta vista.');
        }

        return $view;
    }

    /**
     * Guarda una nueva vista privada.
     */
    public function save(Request $request, ?Project $project = null): View
    {
        $data = $request->validated();
        $user = $request->user();
        $workspaceId = app('current_workspace_id');

        return View::create([
            'workspace_id' => $workspaceId,
            'project_id' => $project?->id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'filters' => $data['filters'] ?? null,
            'display_filters' => $data['display_filters'] ?? null,
            'created_by' => $user->id,
        ]);
    }

    /**
     * Actualiza una vista privada.
     */
    public function update(Request $request, View $view): View
    {
        if ($view->created_by !== $request->user()->id) {
            abort(403, 'No tienes permiso para editar esta vista.');
        }

        $data = $request->validated();
        $view->update($data);

        return $view;
    }

    /**
     * Elimina una vista privada.
     */
    public function delete(View $view, int $userId): void
    {
        if ($view->created_by !== $userId) {
            abort(403, 'No tienes permiso para eliminar esta vista.');
        }

        $view->delete();
    }
}

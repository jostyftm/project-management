<?php

namespace App\Http\Middleware;

use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IdentifyWorkspace
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Obtener identificador del workspace desde header o parámetro de ruta
        $workspaceId = $request->header('X-Workspace-Id') ?? $request->route('workspace_id');
        $workspaceSlug = $request->header('X-Workspace-Slug') ?? $request->route('workspace_slug');

        $workspace = null;

        if ($workspaceId) {
            $workspace = Workspace::find($workspaceId);
        } elseif ($workspaceSlug) {
            $workspace = Workspace::where('slug', $workspaceSlug)->first();
        }

        if (! $workspace) {
            // Si la ruta o método no exige workspace estricto (ej. listar workspaces de usuario), continuar
            return $next($request);
        }

        // Si hay usuario autenticado, validar que sea miembro del workspace
        if ($user) {
            $isMember = WorkspaceMember::where('workspace_id', $workspace->id)
                ->where('user_id', $user->id)
                ->exists();

            if (! $isMember && $workspace->owner_id !== $user->id) {
                return response()->json([
                    'status' => 403,
                    'message' => 'No tienes permiso para acceder a este workspace.',
                ], 403);
            }
        }

        // Registrar workspace actual en el contenedor de servicios
        app()->instance('current_workspace_id', $workspace->id);
        app()->instance('current_workspace', $workspace);
        $request->attributes->set('workspace_id', $workspace->id);
        $request->attributes->set('workspace', $workspace);

        return $next($request);
    }
}

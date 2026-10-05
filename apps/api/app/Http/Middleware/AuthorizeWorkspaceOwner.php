<?php

namespace App\Http\Middleware;

use App\Models\Workspace;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthorizeWorkspaceOwner
{
    /**
     * Valida que el usuario autenticado sea el dueño del workspace o administrador de la plataforma.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'status' => 401,
                'message' => 'No autenticado.',
            ], 401);
        }

        // Obtener el workspace desde la ruta o atributos previamente inyectados
        $workspace = $request->route('workspace');
        if (! ($workspace instanceof Workspace)) {
            $workspaceId = $request->route('workspace') ?? $request->attributes->get('workspace_id');
            if ($workspaceId) {
                $workspace = Workspace::find($workspaceId);
            }
        }

        if ($workspace && (int) $workspace->owner_id !== (int) $user->id && ! $user->is_instance_admin) {
            return response()->json([
                'status' => 403,
                'message' => 'Solo el dueño del workspace puede acceder o realizar modificaciones en esta sección.',
            ], 403);
        }

        return $next($request);
    }
}

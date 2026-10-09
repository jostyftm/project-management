<?php

namespace App\Mcp\Tools\Concerns;

use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Builder;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;

trait ResolvesWorkspaceContext
{
    /**
     * Resuelve y establece el Workspace actual en el contenedor de Laravel.
     */
    protected function resolveWorkspace(
        Request $request,
        int|string|null $explicitWorkspaceId = null,
        ?string $explicitWorkspaceSlug = null,
        ?Project $project = null
    ): ?Workspace {
        $workspace = null;

        // 1. Si se pasó un proyecto, usar su workspace
        if ($project) {
            $workspace = $project->workspace;
        }

        // 2. Si se especificó ID explícito
        if (! $workspace && $explicitWorkspaceId) {
            $workspace = is_numeric($explicitWorkspaceId)
                ? Workspace::find($explicitWorkspaceId)
                : Workspace::where('slug', $explicitWorkspaceId)->first();
        }

        // 3. Si se especificó Slug explícito
        if (! $workspace && $explicitWorkspaceSlug) {
            $workspace = Workspace::where('slug', $explicitWorkspaceSlug)->first();
        }

        // 4. Si el request HTTP tiene headers o atributos
        if (! $workspace) {
            $headerId = $request->get('workspace_id');
            if ($headerId) {
                $workspace = Workspace::find($headerId);
            }
        }

        // 5. Desde usuario autenticado
        $user = $request->user();
        if (! $workspace && $user) {
            $workspace = $user->workspaces()->first()
                ?? Workspace::where('owner_id', $user->id)->first();
        }

        // 6. Fallback general: primer workspace en base de datos
        if (! $workspace) {
            $workspace = Workspace::first();
        }

        if ($workspace) {
            app()->instance('current_workspace_id', $workspace->id);
            app()->instance('current_workspace', $workspace);
        }

        return $workspace;
    }

    /**
     * Resuelve el usuario ejecutor de la acción MCP (autenticado o superadmin/lead por defecto).
     */
    protected function resolveUser(Request $request): ?User
    {
        return $request->user()
            ?? User::where('is_instance_admin', true)->first()
            ?? User::first();
    }

    /**
     * Resuelve un usuario objetivo por ID numérico o dirección de correo electrónico.
     */
    protected function resolveTargetUser(int|string $userKey): ?User
    {
        $key = trim((string) $userKey);

        if (is_numeric($key)) {
            return User::find((int) $key);
        }

        return User::where('email', strtolower($key))->first();
    }

    /**
     * Resuelve un proyecto por su ID numérico o identificador de prefijo (ej: "ENG" o 1).
     */
    protected function resolveProject(Request $request, int|string $projectIdOrIdentifier): ?Project
    {
        $project = null;

        if (is_numeric($projectIdOrIdentifier)) {
            $project = Project::find((int) $projectIdOrIdentifier);
        } else {
            $project = Project::where('identifier', strtoupper(trim((string) $projectIdOrIdentifier)))->first();
        }

        if ($project) {
            $this->resolveWorkspace($request, project: $project);
        }

        return $project;
    }

    /**
     * Resuelve un work item por clave combinada (ej: "ENG-101"), ID numérico o contexto de proyecto.
     */
    protected function resolveWorkItem(Request $request, int|string $workItemKey, ?Project $project = null): ?WorkItem
    {
        $item = null;
        $keyString = trim((string) $workItemKey);

        if (preg_match('/^([A-Za-z0-9_]+)-(\d+)$/', $keyString, $matches)) {
            $identifier = strtoupper($matches[1]);
            $sequenceId = (int) $matches[2];
            $targetProject = Project::where('identifier', $identifier)->first();
            if ($targetProject) {
                $this->resolveWorkspace($request, project: $targetProject);
                $item = WorkItem::where('project_id', $targetProject->id)
                    ->where('sequence_id', $sequenceId)
                    ->first();
            }
        }

        if (! $item && $project && is_numeric($keyString)) {
            // Primero buscar por sequence_id en el proyecto dado
            $item = WorkItem::where('project_id', $project->id)
                ->where('sequence_id', (int) $keyString)
                ->first();
        }

        if (! $item && is_numeric($keyString)) {
            $item = WorkItem::find((int) $keyString);
        }

        if ($item) {
            $this->resolveWorkspace($request, explicitWorkspaceId: $item->workspace_id);
        }

        return $item;
    }

    /**
     * Resuelve el rol del usuario en el proyecto dado (ADMIN, MEMBER, VIEWER) o null si no tiene acceso.
     */
    protected function getProjectRole(User $user, Project $project): ?string
    {
        // 1. Superadministrador de la instancia
        if ($user->is_instance_admin) {
            return 'ADMIN';
        }

        // 2. Dueño del workspace
        if ($project->workspace && (int) $project->workspace->owner_id === (int) $user->id) {
            return 'ADMIN';
        }

        // 3. Miembro registrado en project_members
        $member = ProjectMember::where('project_id', $project->id)
            ->where('user_id', $user->id)
            ->first();

        return $member?->role;
    }

    /**
     * Valida si el usuario tiene permiso para operar sobre el proyecto.
     * Retorna una Response de error de MCP si el acceso es denegado, o null si está autorizado.
     *
     * @param  string|null  $requiredRole  'ADMIN' o 'MEMBER' (para mutaciones) o null (para lectura)
     */
    protected function authorizeProject(Request $request, Project $project, ?string $requiredRole = null): ?Response
    {
        $user = $this->resolveUser($request);

        if (! $user) {
            return Response::error('Usuario no autenticado para realizar esta acción.');
        }

        $role = $this->getProjectRole($user, $project);

        if ($role === null) {
            return Response::error("Acceso denegado: No perteneces al proyecto '{$project->identifier}'.");
        }

        if ($requiredRole === 'ADMIN' && $role !== 'ADMIN') {
            return Response::error("Acción denegada: Requiere rol de Administrador en el proyecto '{$project->identifier}'.");
        }

        if ($requiredRole === 'MEMBER' && $role === 'VIEWER') {
            return Response::error("Acción denegada: Tu rol en el proyecto '{$project->identifier}' es de solo lectura.");
        }

        return null;
    }

    /**
     * Obtiene una consulta de proyectos filtrando según la visibilidad y membresía del usuario.
     */
    protected function resolveProjectsQuery(Request $request, Workspace $workspace): Builder
    {
        $user = $this->resolveUser($request);
        $query = Project::where('workspace_id', $workspace->id);

        if (! $user) {
            return $query->whereRaw('1 = 0');
        }

        // Superadministrador y dueño del workspace ven todos los proyectos
        if ($user->is_instance_admin || (int) $workspace->owner_id === (int) $user->id) {
            return $query;
        }

        // Usuarios regulares solo ven proyectos donde son miembros
        return $query->whereHas('members', function ($q) use ($user) {
            $q->where('users.id', $user->id);
        });
    }

    /**
     * Formatea un array de datos a JSON legible y estructurado.
     */
    protected function formatJson(mixed $data): string
    {
        return json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

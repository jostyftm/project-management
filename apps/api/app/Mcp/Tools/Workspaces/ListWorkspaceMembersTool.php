<?php

namespace App\Mcp\Tools\Workspaces;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\WorkspaceMember;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('list_workspace_members')]
#[Title('Listar Miembros del Espacio de Trabajo')]
#[Description('Lista los miembros de un espacio de trabajo con sus roles (OWNER, ADMIN, MEMBER, GUEST) y fechas de ingreso. Requiere pertenecer al espacio de trabajo o ser administrador de la instancia.')]
#[IsReadOnly]
class ListWorkspaceMembersTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'workspace' => $schema->string()
                ->description('ID numérico o slug del espacio de trabajo a consultar (ej: 1 o "acme-corp")')
                ->required(),
            'role' => $schema->string()
                ->enum(['OWNER', 'ADMIN', 'MEMBER', 'GUEST'])
                ->description('Filtro opcional por rol de membresía.'),
            'acting_user' => $schema->string()
                ->description('ID o email opcional del usuario en nombre de quien se ejecuta la acción (útil en CLI / stdio).'),
        ];
    }

    public function handle(Request $request): Response
    {
        $actingUser = $this->resolveActingUser($request, $request->get('acting_user'));

        if (! $actingUser) {
            return Response::error('Usuario no autenticado o no encontrado.');
        }

        $workspaceKey = $request->get('workspace');
        $workspace = $this->resolveWorkspaceByKey($workspaceKey);

        if (! $workspace) {
            return Response::error("Espacio de trabajo '{$workspaceKey}' no encontrado.");
        }

        if ($authError = $this->authorizeWorkspaceAccess($actingUser, $workspace)) {
            return $authError;
        }

        $query = WorkspaceMember::where('workspace_id', $workspace->id)
            ->with(['user:id,name,email']);

        if ($roleFilter = $request->get('role')) {
            $query->where('role', strtoupper(trim((string) $roleFilter)));
        }

        $members = $query->orderBy('role')->get()->map(function (WorkspaceMember $wm) {
            return [
                'user_id' => $wm->user_id,
                'name' => $wm->user?->name,
                'email' => $wm->user?->email,
                'role' => $wm->role,
                'joined_at' => $wm->joined_at?->toIso8601String(),
            ];
        });

        return Response::text($this->formatJson([
            'workspace' => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
            ],
            'total_members' => $members->count(),
            'members' => $members,
        ]));
    }
}

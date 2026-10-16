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

#[Name('get_workspace')]
#[Title('Obtener Detalle de Espacio de Trabajo')]
#[Description('Obtiene la información detallada de un espacio de trabajo por ID o slug, incluyendo propietario, miembros, conteo de proyectos y tareas. Requiere ser miembro del workspace o administrador de la instancia.')]
#[IsReadOnly]
class GetWorkspaceTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'workspace' => $schema->string()
                ->description('ID numérico o slug del espacio de trabajo a consultar (ej: 1 o "acme-corp")')
                ->required(),
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

        $workspace->load([
            'owner:id,name,email',
            'workspaceMembers.user:id,name,email',
        ]);
        $workspace->loadCount(['members', 'projects', 'workItems']);

        $role = $this->getWorkspaceRole($actingUser, $workspace);

        $members = $workspace->workspaceMembers->map(function (WorkspaceMember $wm) {
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
                'logo_url' => $workspace->logo_url,
                'owner' => $workspace->owner ? [
                    'id' => $workspace->owner->id,
                    'name' => $workspace->owner->name,
                    'email' => $workspace->owner->email,
                ] : null,
                'acting_user_role' => $role,
                'members_count' => $workspace->members_count,
                'projects_count' => $workspace->projects_count,
                'work_items_count' => $workspace->work_items_count,
                'created_at' => $workspace->created_at?->toIso8601String(),
                'updated_at' => $workspace->updated_at?->toIso8601String(),
            ],
            'members' => $members,
        ]));
    }
}

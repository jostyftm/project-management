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

#[Name('update_workspace_member_role')]
#[Title('Actualizar Rol de Miembro en Espacio de Trabajo')]
#[Description('Actualiza el rol de un miembro en el espacio de trabajo (ADMIN, MEMBER, GUEST). Requiere ser propietario del workspace o administrador de la instancia.')]
class UpdateWorkspaceMemberRoleTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'workspace' => $schema->string()
                ->description('ID numérico o slug del espacio de trabajo (ej: 1 o "acme-corp")')
                ->required(),
            'user' => $schema->string()
                ->description('Dirección de correo electrónico o ID numérico del miembro cuyo rol se modificará.')
                ->required(),
            'role' => $schema->string()
                ->enum(['ADMIN', 'MEMBER', 'GUEST'])
                ->description('Nuevo rol a asignar en el espacio de trabajo.')
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

        $isOwner = (int) $workspace->owner_id === (int) $actingUser->id;
        $isInstanceAdmin = (bool) $actingUser->is_instance_admin;

        if (! $isOwner && ! $isInstanceAdmin) {
            return Response::error("Acceso denegado: Solo el propietario del espacio de trabajo '{$workspace->name}' o un administrador de la instancia puede modificar los roles de membresía.");
        }

        $targetUserKey = trim((string) $request->get('user'));
        $targetUser = $this->resolveTargetUser($targetUserKey);

        if (! $targetUser) {
            return Response::error("El usuario objetivo '{$targetUserKey}' no fue encontrado.");
        }

        if ((int) $workspace->owner_id === (int) $targetUser->id) {
            return Response::error("El propietario del espacio de trabajo siempre mantiene el rol OWNER. Para cambiar su rol, transfiere la propiedad a otro usuario primero con 'update_workspace'.");
        }

        $membership = WorkspaceMember::where('workspace_id', $workspace->id)
            ->where('user_id', $targetUser->id)
            ->first();

        if (! $membership) {
            return Response::error("El usuario '{$targetUser->email}' no es miembro del espacio de trabajo '{$workspace->name}'.");
        }

        $newRole = strtoupper(trim((string) $request->get('role')));
        if (! in_array($newRole, ['ADMIN', 'MEMBER', 'GUEST'], true)) {
            return Response::error("Rol inválido '{$newRole}'. Los roles permitidos son ADMIN, MEMBER o GUEST.");
        }

        $oldRole = $membership->role;
        $membership->update(['role' => $newRole]);

        return Response::text($this->formatJson([
            'message' => "El rol de '{$targetUser->name}' en '{$workspace->name}' fue actualizado de {$oldRole} a {$newRole}.",
            'workspace' => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
            ],
            'member' => [
                'user_id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
                'old_role' => $oldRole,
                'new_role' => $newRole,
            ],
        ]));
    }
}

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

#[Name('remove_workspace_member')]
#[Title('Remover Miembro de Espacio de Trabajo')]
#[Description('Remueve a un miembro de un espacio de trabajo. Requiere rol de propietario o administrador del workspace o administrador de la instancia. No se puede remover al propietario sin transferir antes la propiedad.')]
class RemoveWorkspaceMemberTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'workspace' => $schema->string()
                ->description('ID numérico o slug del espacio de trabajo (ej: 1 o "acme-corp")')
                ->required(),
            'user' => $schema->string()
                ->description('Dirección de correo electrónico o ID numérico del usuario a remover.')
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

        $targetUserKey = trim((string) $request->get('user'));
        $targetUser = $this->resolveTargetUser($targetUserKey);

        if (! $targetUser) {
            return Response::error("El usuario a remover '{$targetUserKey}' no fue encontrado.");
        }

        if ((int) $workspace->owner_id === (int) $targetUser->id) {
            return Response::error("No se puede remover al propietario del espacio de trabajo '{$workspace->name}'. Transfiere la propiedad a otro usuario antes de removerlo.");
        }

        $membership = WorkspaceMember::where('workspace_id', $workspace->id)
            ->where('user_id', $targetUser->id)
            ->first();

        if (! $membership) {
            return Response::error("El usuario '{$targetUser->email}' no es miembro del espacio de trabajo '{$workspace->name}'.");
        }

        $isSelfRemoval = (int) $actingUser->id === (int) $targetUser->id;
        $actingRole = $this->getWorkspaceRole($actingUser, $workspace);
        $isWorkspaceAdminOrOwner = in_array($actingRole, ['OWNER', 'ADMIN'], true);
        $isInstanceAdmin = (bool) $actingUser->is_instance_admin;

        if (! $isSelfRemoval && ! $isWorkspaceAdminOrOwner && ! $isInstanceAdmin) {
            return Response::error("Acceso denegado: Requiere rol de Administrador o Propietario en el espacio de trabajo '{$workspace->name}' para remover a otros miembros.");
        }

        $membership->delete();

        return Response::text($this->formatJson([
            'message' => "El usuario '{$targetUser->name}' ({$targetUser->email}) ha sido removido del espacio de trabajo '{$workspace->name}'.",
            'workspace' => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
            ],
            'removed_user' => [
                'id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
            ],
        ]));
    }
}

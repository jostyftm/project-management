<?php

namespace App\Mcp\Tools\Workspaces;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('delete_workspace')]
#[Title('Eliminar Espacio de Trabajo')]
#[Description('Elimina un espacio de trabajo y todos sus recursos asociados. Requiere ser el propietario del workspace o administrador de la instancia.')]
class DeleteWorkspaceTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'workspace' => $schema->string()
                ->description('ID numérico o slug del espacio de trabajo a eliminar (ej: 1 o "acme-corp")')
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
        $isAdmin = (bool) $actingUser->is_instance_admin;

        if (! $isOwner && ! $isAdmin) {
            return Response::error("Acceso denegado: Solo el propietario del espacio de trabajo '{$workspace->name}' o un administrador de la instancia puede eliminarlo.");
        }

        $deletedInfo = [
            'id' => $workspace->id,
            'name' => $workspace->name,
            'slug' => $workspace->slug,
        ];

        $workspace->delete();

        return Response::text($this->formatJson([
            'message' => "El espacio de trabajo '{$deletedInfo['name']}' ({$deletedInfo['slug']}) ha sido eliminado exitosamente.",
            'deleted_workspace' => $deletedInfo,
        ]));
    }
}

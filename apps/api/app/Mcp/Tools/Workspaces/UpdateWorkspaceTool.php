<?php

namespace App\Mcp\Tools\Workspaces;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('update_workspace')]
#[Title('Actualizar Espacio de Trabajo')]
#[Description('Actualiza las propiedades de un espacio de trabajo (nombre, slug, logo o transferencia de propiedad). Los administradores de la instancia pueden modificar cualquier workspace; los usuarios estándar solo pueden modificar los workspaces de los que son propietarios.')]
class UpdateWorkspaceTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'workspace' => $schema->string()
                ->description('ID numérico o slug del espacio de trabajo a actualizar (ej: 1 o "acme-corp")')
                ->required(),
            'name' => $schema->string()
                ->description('Nuevo nombre del espacio de trabajo.'),
            'slug' => $schema->string()
                ->description('Nuevo slug único en minúsculas para el espacio de trabajo.'),
            'logo_url' => $schema->string()
                ->description('Nueva URL del logotipo del espacio de trabajo.'),
            'owner' => $schema->string()
                ->description('ID o email del nuevo usuario propietario para transferir la propiedad del workspace.'),
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
            return Response::error("Acceso denegado: Solo el propietario del espacio de trabajo '{$workspace->name}' o un administrador de la instancia puede modificar su configuración.");
        }

        DB::transaction(function () use ($request, $workspace, $isAdmin, $isOwner) {
            if ($name = $request->get('name')) {
                $workspace->name = trim((string) $name);
            }

            if ($slugInput = $request->get('slug')) {
                $newSlug = Str::slug(trim((string) $slugInput));
                $slugExists = Workspace::where('slug', $newSlug)
                    ->where('id', '!=', $workspace->id)
                    ->exists();

                if ($slugExists) {
                    throw new \RuntimeException("El slug '{$newSlug}' ya está en uso por otro espacio de trabajo.");
                }

                $workspace->slug = $newSlug;
            }

            if ($request->has('logo_url')) {
                $workspace->logo_url = $request->get('logo_url');
            }

            if ($newOwnerKey = $request->get('owner')) {
                if (! $isAdmin && ! $isOwner) {
                    throw new \RuntimeException('Solo el propietario actual o un administrador pueden transferir la propiedad del workspace.');
                }

                $newOwner = $this->resolveTargetUser($newOwnerKey);
                if (! $newOwner) {
                    throw new \RuntimeException("El nuevo usuario propietario '{$newOwnerKey}' no fue encontrado.");
                }

                $previousOwnerId = $workspace->owner_id;
                $workspace->owner_id = $newOwner->id;

                // Asegurar que el nuevo dueño tenga membresía con rol OWNER
                WorkspaceMember::updateOrCreate(
                    [
                        'workspace_id' => $workspace->id,
                        'user_id' => $newOwner->id,
                    ],
                    [
                        'role' => 'OWNER',
                        'joined_at' => now(),
                    ]
                );

                // Reasignar al dueño anterior a rol ADMIN si sigue como miembro
                if ((int) $previousOwnerId !== (int) $newOwner->id) {
                    WorkspaceMember::where('workspace_id', $workspace->id)
                        ->where('user_id', $previousOwnerId)
                        ->update(['role' => 'ADMIN']);
                }
            }

            $workspace->save();
        });

        $workspace->refresh()->load(['owner:id,name,email']);

        return Response::text($this->formatJson([
            'message' => "Espacio de trabajo '{$workspace->name}' actualizado correctamente.",
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
                'updated_at' => $workspace->updated_at?->toIso8601String(),
            ],
        ]));
    }
}

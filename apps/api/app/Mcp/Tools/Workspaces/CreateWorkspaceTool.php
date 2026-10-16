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

#[Name('create_workspace')]
#[Title('Crear Nuevo Espacio de Trabajo')]
#[Description('Crea un nuevo espacio de trabajo. Si el usuario es administrador de la instancia, puede asignar a cualquier usuario como propietario (owner); de lo contrario, el espacio de trabajo se crea con el usuario actual como propietario.')]
class CreateWorkspaceTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'name' => $schema->string()
                ->description('Nombre del espacio de trabajo (ej: "Acme Corporation")')
                ->required(),
            'slug' => $schema->string()
                ->description('Slug identificador opcional en minúsculas y sin espacios (ej: "acme-corp"). Si se omite, se generará a partir del nombre.'),
            'owner' => $schema->string()
                ->description('ID o email del usuario propietario. Los administradores pueden asignar a cualquier usuario; usuarios regulares solo pueden crearlo para sí mismos.'),
            'logo_url' => $schema->string()
                ->description('URL opcional del logotipo o icono del espacio de trabajo.'),
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

        $targetOwner = $actingUser;
        if ($ownerKey = $request->get('owner')) {
            $resolvedOwner = $this->resolveTargetUser($ownerKey);
            if (! $resolvedOwner) {
                return Response::error("El usuario propietario '{$ownerKey}' no fue encontrado.");
            }

            if ((int) $resolvedOwner->id !== (int) $actingUser->id && ! $actingUser->is_instance_admin) {
                return Response::error('Acceso denegado: Solo los administradores pueden crear espacios de trabajo para otros usuarios.');
            }

            $targetOwner = $resolvedOwner;
        }

        $name = trim((string) $request->get('name'));
        if (empty($name)) {
            return Response::error('El nombre del espacio de trabajo es requerido.');
        }

        $baseSlug = $request->get('slug')
            ? Str::slug((string) $request->get('slug'))
            : Str::slug($name);

        if (empty($baseSlug)) {
            $baseSlug = 'workspace-'.Str::random(6);
        }

        $workspace = DB::transaction(function () use ($name, $baseSlug, $targetOwner, $request) {
            $slug = $baseSlug;
            $counter = 1;

            while (Workspace::where('slug', $slug)->exists()) {
                $slug = $baseSlug.'-'.$counter++;
            }

            $ws = Workspace::create([
                'name' => $name,
                'slug' => $slug,
                'logo_url' => $request->get('logo_url'),
                'owner_id' => $targetOwner->id,
            ]);

            WorkspaceMember::create([
                'workspace_id' => $ws->id,
                'user_id' => $targetOwner->id,
                'role' => 'OWNER',
                'joined_at' => now(),
            ]);

            return $ws;
        });

        return Response::text($this->formatJson([
            'message' => "Espacio de trabajo '{$workspace->name}' creado exitosamente.",
            'workspace' => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
                'logo_url' => $workspace->logo_url,
                'owner' => [
                    'id' => $targetOwner->id,
                    'name' => $targetOwner->name,
                    'email' => $targetOwner->email,
                ],
                'created_at' => $workspace->created_at?->toIso8601String(),
            ],
        ]));
    }
}

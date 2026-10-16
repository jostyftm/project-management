<?php

namespace App\Mcp\Tools\Workspaces;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\Workspace;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('list_workspaces')]
#[Title('Listar Espacios de Trabajo')]
#[Description('Lista los espacios de trabajo. Si el usuario es administrador de la instancia, puede listar todos los workspaces o filtrar por un usuario específico; si es un usuario estándar, solo lista sus propios workspaces.')]
#[IsReadOnly]
class ListWorkspacesTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'user' => $schema->string()
                ->description('ID o email del usuario cuyos workspaces se desean consultar. Si se omite, los administradores ven todos los workspaces y los usuarios estándar ven los suyos.'),
            'query' => $schema->string()
                ->description('Término de búsqueda opcional por nombre o slug del espacio de trabajo.'),
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

        $targetUser = null;
        $targetUserKey = $request->get('user');

        if (! empty($targetUserKey)) {
            $targetUser = $this->resolveTargetUser($targetUserKey);
            if (! $targetUser) {
                return Response::error("El usuario objetivo '{$targetUserKey}' no fue encontrado.");
            }

            if ((int) $actingUser->id !== (int) $targetUser->id && ! $actingUser->is_instance_admin) {
                return Response::error('Acceso denegado: Solo los administradores pueden consultar los espacios de trabajo de otros usuarios.');
            }
        }

        $query = Workspace::with(['owner:id,name,email'])
            ->withCount(['members', 'projects', 'workItems']);

        if ($targetUser) {
            $query->where(function ($q) use ($targetUser) {
                $q->where('owner_id', $targetUser->id)
                    ->orWhereHas('workspaceMembers', function ($sub) use ($targetUser) {
                        $sub->where('user_id', $targetUser->id);
                    });
            });
        } elseif (! $actingUser->is_instance_admin) {
            $query->where(function ($q) use ($actingUser) {
                $q->where('owner_id', $actingUser->id)
                    ->orWhereHas('workspaceMembers', function ($sub) use ($actingUser) {
                        $sub->where('user_id', $actingUser->id);
                    });
            });
        }

        if ($search = $request->get('query')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $workspaces = $query->orderBy('name')->get()->map(function (Workspace $ws) use ($actingUser, $targetUser) {
            $evalUser = $targetUser ?? $actingUser;
            $role = $this->getWorkspaceRole($evalUser, $ws);

            return [
                'id' => $ws->id,
                'name' => $ws->name,
                'slug' => $ws->slug,
                'logo_url' => $ws->logo_url,
                'owner' => $ws->owner ? [
                    'id' => $ws->owner->id,
                    'name' => $ws->owner->name,
                    'email' => $ws->owner->email,
                ] : null,
                'role' => $role,
                'members_count' => $ws->members_count,
                'projects_count' => $ws->projects_count,
                'work_items_count' => $ws->work_items_count,
                'created_at' => $ws->created_at?->toIso8601String(),
            ];
        });

        return Response::text($this->formatJson([
            'acting_user' => [
                'id' => $actingUser->id,
                'name' => $actingUser->name,
                'email' => $actingUser->email,
                'is_instance_admin' => (bool) $actingUser->is_instance_admin,
            ],
            'target_user' => $targetUser ? [
                'id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
            ] : null,
            'total_workspaces' => $workspaces->count(),
            'workspaces' => $workspaces,
        ]));
    }
}

<?php

namespace App\Mcp\Tools\Workspaces;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\User;
use App\Models\WorkspaceMember;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Str;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('add_workspace_member')]
#[Title('Agregar Miembro a Espacio de Trabajo')]
#[Description('Agrega o invita a un usuario al espacio de trabajo con un rol determinado (ADMIN, MEMBER, GUEST). Requiere ser propietario o administrador del workspace o administrador de la instancia.')]
class AddWorkspaceMemberTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'workspace' => $schema->string()
                ->description('ID numérico o slug del espacio de trabajo (ej: 1 o "acme-corp")')
                ->required(),
            'user' => $schema->string()
                ->description('Dirección de correo electrónico o ID numérico del usuario a incorporar.')
                ->required(),
            'role' => $schema->string()
                ->enum(['ADMIN', 'MEMBER', 'GUEST'])
                ->description('Rol que se le asignará al nuevo miembro en el espacio de trabajo.')
                ->default('MEMBER'),
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

        if ($authError = $this->authorizeWorkspaceAccess($actingUser, $workspace, 'ADMIN')) {
            return $authError;
        }

        $targetUserKey = trim((string) $request->get('user'));
        $targetUser = $this->resolveTargetUser($targetUserKey);

        if (! $targetUser) {
            if (filter_var($targetUserKey, FILTER_VALIDATE_EMAIL)) {
                // Auto-aprovisionar usuario con el email indicado
                $targetUser = User::create([
                    'name' => explode('@', $targetUserKey)[0],
                    'email' => strtolower($targetUserKey),
                    'password' => bcrypt(Str::random(16)),
                ]);
            } else {
                return Response::error("No se encontró ningún usuario con el identificador '{$targetUserKey}'.");
            }
        }

        $existing = WorkspaceMember::where('workspace_id', $workspace->id)
            ->where('user_id', $targetUser->id)
            ->first();

        if ($existing) {
            return Response::error("El usuario '{$targetUser->email}' ya es miembro del espacio de trabajo '{$workspace->name}' con rol {$existing->role}.");
        }

        $role = strtoupper(trim((string) $request->get('role', 'MEMBER')));
        if (! in_array($role, ['ADMIN', 'MEMBER', 'GUEST'], true)) {
            $role = 'MEMBER';
        }

        $member = WorkspaceMember::create([
            'workspace_id' => $workspace->id,
            'user_id' => $targetUser->id,
            'role' => $role,
            'joined_at' => now(),
        ]);

        return Response::text($this->formatJson([
            'message' => "Usuario '{$targetUser->name}' ({$targetUser->email}) agregado exitosamente al espacio de trabajo '{$workspace->name}' con rol {$role}.",
            'workspace' => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
            ],
            'member' => [
                'user_id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
                'role' => $member->role,
                'joined_at' => $member->joined_at?->toIso8601String(),
            ],
        ]));
    }
}

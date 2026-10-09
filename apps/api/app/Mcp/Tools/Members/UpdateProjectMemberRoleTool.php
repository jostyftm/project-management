<?php

namespace App\Mcp\Tools\Members;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Models\ProjectMember;
use App\Services\ProjectMemberService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('update_project_member_role')]
#[Title('Actualizar Rol de Miembro en el Proyecto')]
#[Description('Modifica el rol asignado a un miembro existente en el proyecto (ADMIN, MEMBER, VIEWER).')]
class UpdateProjectMemberRoleTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'user' => $schema->string()
                ->description('ID numérico o dirección de correo electrónico del usuario')
                ->required(),
            'role' => $schema->string()
                ->enum(['ADMIN', 'MEMBER', 'VIEWER'])
                ->description('Nuevo rol a asignar al miembro')
                ->required(),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::error("Proyecto '{$projectKey}' no encontrado.");
        }

        if ($authError = $this->authorizeProject($request, $project, requiredRole: 'ADMIN')) {
            return $authError;
        }

        $userKey = $request->get('user');
        $targetUser = $this->resolveTargetUser($userKey);

        if (! $targetUser) {
            return Response::error("Usuario '{$userKey}' no encontrado.");
        }

        $role = strtoupper((string) $request->get('role'));
        if (! in_array($role, ['ADMIN', 'MEMBER', 'VIEWER'], true)) {
            return Response::error("El rol '{$role}' no es válido. Debe ser ADMIN, MEMBER o VIEWER.");
        }

        // Proteger al dueño del workspace contra degradaciones accidentales
        if ($project->workspace && (int) $project->workspace->owner_id === (int) $targetUser->id && $role !== 'ADMIN') {
            return Response::error('No se puede degradar el rol del propietario del espacio de trabajo.');
        }

        $isMember = ProjectMember::where('project_id', $project->id)
            ->where('user_id', $targetUser->id)
            ->exists();

        if (! $isMember) {
            return Response::error("El usuario '{$targetUser->email}' no es miembro del proyecto '{$project->identifier}'.");
        }

        try {
            $service = app(ProjectMemberService::class);
            $member = $service->updateMemberRole($project, $targetUser->id, $role);

            return Response::text($this->formatJson([
                'status' => 'success',
                'message' => "Rol del miembro actualizado a {$role} exitosamente.",
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'identifier' => $project->identifier,
                ],
                'member' => [
                    'user_id' => $targetUser->id,
                    'name' => $targetUser->name,
                    'email' => $targetUser->email,
                    'role' => $member->role,
                ],
            ]));
        } catch (\Throwable $e) {
            return Response::error("Error al actualizar el rol: {$e->getMessage()}");
        }
    }
}

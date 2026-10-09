<?php

namespace App\Mcp\Tools\Members;

use App\Mcp\Tools\Concerns\ResolvesWorkspaceContext;
use App\Services\ProjectMemberService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Title;
use Laravel\Mcp\Server\Tool;

#[Name('remove_project_member')]
#[Title('Remover Miembro o Cancelar Invitación')]
#[Description('Desvincula a un miembro de un proyecto o cancela una invitación pendiente por su ID.')]
class RemoveProjectMemberTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'user' => $schema->string()
                ->description('ID numérico o correo del usuario a remover del proyecto'),
            'invitation_id' => $schema->integer()
                ->description('ID numérico de la invitación pendiente a cancelar'),
        ];
    }

    public function handle(Request $request): Response
    {
        $projectKey = $request->get('project');
        $project = $this->resolveProject($request, $projectKey);

        if (! $project) {
            return Response::error("Proyecto '{$projectKey}' no encontrado.");
        }

        $userKey = $request->get('user');
        $invitationId = $request->get('invitation_id');

        if (empty($userKey) && empty($invitationId)) {
            return Response::error('Debes proporcionar el parámetro "user" (para desvincular a un miembro) o "invitation_id" (para cancelar una invitación).');
        }

        $service = app(ProjectMemberService::class);

        // Caso 1: Cancelar invitación pendiente
        if (! empty($invitationId)) {
            if ($authError = $this->authorizeProject($request, $project, requiredRole: 'ADMIN')) {
                return $authError;
            }

            $deleted = $service->cancelInvitation($project, (int) $invitationId);

            if (! $deleted) {
                return Response::error("No se encontró la invitación #{$invitationId} en el proyecto '{$project->identifier}'.");
            }

            return Response::text($this->formatJson([
                'status' => 'success',
                'message' => "Invitación #{$invitationId} cancelada exitosamente.",
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'identifier' => $project->identifier,
                ],
            ]));
        }

        // Caso 2: Remover miembro
        $targetUser = $this->resolveTargetUser($userKey);
        if (! $targetUser) {
            return Response::error("Usuario '{$userKey}' no encontrado.");
        }

        $currentUser = $this->resolveUser($request);

        // Si no se está removiendo a sí mismo, requiere rol ADMIN en el proyecto
        if (! $currentUser || (int) $currentUser->id !== (int) $targetUser->id) {
            if ($authError = $this->authorizeProject($request, $project, requiredRole: 'ADMIN')) {
                return $authError;
            }
        }

        // Proteger al dueño del workspace contra eliminación
        if ($project->workspace && (int) $project->workspace->owner_id === (int) $targetUser->id) {
            return Response::error('No se puede desvincular al propietario del espacio de trabajo del proyecto.');
        }

        $deleted = $service->removeMember($project, $targetUser->id);

        if (! $deleted) {
            return Response::error("El usuario '{$targetUser->email}' no es miembro del proyecto '{$project->identifier}'.");
        }

        return Response::text($this->formatJson([
            'status' => 'success',
            'message' => "Usuario '{$targetUser->name}' ({$targetUser->email}) desvinculado del proyecto '{$project->identifier}' exitosamente.",
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'identifier' => $project->identifier,
            ],
        ]));
    }
}

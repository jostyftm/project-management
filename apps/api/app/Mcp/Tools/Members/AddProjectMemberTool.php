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

#[Name('add_project_member')]
#[Title('Agregar o Invitar Miembro al Proyecto')]
#[Description('Añade un usuario existente directamente al proyecto (y espacio de trabajo) con un rol asignado, o genera y envía una invitación por correo si no está registrado.')]
class AddProjectMemberTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
                ->required(),
            'email' => $schema->string()
                ->description('Correo electrónico del usuario a agregar o invitar')
                ->required(),
            'role' => $schema->string()
                ->enum(['ADMIN', 'MEMBER', 'VIEWER'])
                ->description('Rol asignado en el proyecto (por defecto MEMBER)')
                ->default('MEMBER'),
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

        $email = strtolower(trim((string) $request->get('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return Response::error("La dirección de correo '{$email}' no es válida.");
        }

        $role = strtoupper($request->get('role', 'MEMBER'));
        if (! in_array($role, ['ADMIN', 'MEMBER', 'VIEWER'], true)) {
            $role = 'MEMBER';
        }

        $user = $this->resolveUser($request);
        if (! $user) {
            return Response::error('No se pudo determinar el usuario solicitante para realizar la invitación.');
        }

        try {
            $service = app(ProjectMemberService::class);
            $result = $service->addMemberOrInvite($project, [
                'email' => $email,
                'role' => $role,
            ], $user);

            return Response::text($this->formatJson([
                'status' => 'success',
                'action' => $result['type'] ?? 'MEMBER_ADDED',
                'message' => $result['message'] ?? 'Operación completada exitosamente.',
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'identifier' => $project->identifier,
                ],
                'details' => $result['user'] ?? $result['invitation'] ?? [],
            ]));
        } catch (\Throwable $e) {
            return Response::error("Error al procesar la adición o invitación: {$e->getMessage()}");
        }
    }
}

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

#[Name('list_project_members')]
#[Title('Listar Miembros e Invitaciones del Proyecto')]
#[Description('Lista todos los usuarios miembros activos de un proyecto con sus roles (ADMIN, MEMBER, VIEWER) y las invitaciones pendientes.')]
class ListProjectMembersTool extends Tool
{
    use ResolvesWorkspaceContext;

    public function schema(JsonSchema $schema): array
    {
        return [
            'project' => $schema->string()
                ->description('ID numérico del proyecto o identificador de prefijo (ej: "ENG" o 1)')
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

        if ($authError = $this->authorizeProject($request, $project)) {
            return $authError;
        }

        $service = app(ProjectMemberService::class);
        $members = $service->listMembers($project);
        $invitations = $service->listInvitations($project);

        return Response::text($this->formatJson([
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'identifier' => $project->identifier,
            ],
            'total_members' => $members->count(),
            'members' => $members->map(fn ($member) => [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'role' => $member->pivot?->role ?? 'MEMBER',
                'joined_at' => $member->pivot?->created_at?->format('Y-m-d H:i:s'),
            ])->values()->all(),
            'total_invitations' => $invitations->count(),
            'invitations' => $invitations->map(fn ($inv) => [
                'id' => $inv->id,
                'email' => $inv->email,
                'role' => $inv->role,
                'token' => $inv->token,
                'invited_by' => $inv->inviter ? [
                    'id' => $inv->inviter->id,
                    'name' => $inv->inviter->name,
                    'email' => $inv->inviter->email,
                ] : null,
                'expires_at' => $inv->expires_at?->format('Y-m-d H:i:s'),
            ])->values()->all(),
        ]));
    }
}

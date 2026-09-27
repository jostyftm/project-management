<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\ProjectMember;
use App\Models\User;
use App\Models\WorkspaceMember;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProjectMemberService
{
    /**
     * Obtiene los miembros del proyecto.
     */
    public function listMembers(Project $project): Collection
    {
        return $project->members()->withPivot('role', 'created_at')->get();
    }

    /**
     * Obtiene las invitaciones pendientes del proyecto.
     */
    public function listInvitations(Project $project): Collection
    {
        return ProjectInvitation::where('project_id', $project->id)
            ->where('status', 'PENDING')
            ->where('expires_at', '>', now())
            ->with('inviter:id,name,email')
            ->latest()
            ->get();
    }

    /**
     * Añade un usuario existente o genera una invitación por email.
     */
    public function addMemberOrInvite(Project $project, array $data, User $inviter): array
    {
        $email = strtolower(trim($data['email']));
        $role = $data['role'] ?? 'MEMBER';

        $existingUser = User::where('email', $email)->first();

        if ($existingUser) {
            // Asegurar que pertenezca al workspace
            WorkspaceMember::firstOrCreate(
                [
                    'workspace_id' => $project->workspace_id,
                    'user_id' => $existingUser->id,
                ],
                [
                    'role' => 'MEMBER',
                ]
            );

            // Añadir o actualizar membresía en el proyecto
            $member = ProjectMember::updateOrCreate(
                [
                    'project_id' => $project->id,
                    'user_id' => $existingUser->id,
                ],
                [
                    'role' => $role,
                ]
            );

            return [
                'type' => 'MEMBER_ADDED',
                'user' => [
                    'id' => $existingUser->id,
                    'name' => $existingUser->name,
                    'email' => $existingUser->email,
                    'role' => $role,
                ],
                'message' => 'Usuario añadido exitosamente al proyecto.',
            ];
        }

        // Si no existe, crear invitación con token único
        $token = Str::random(40);
        $invitation = ProjectInvitation::updateOrCreate(
            [
                'project_id' => $project->id,
                'email' => $email,
                'status' => 'PENDING',
            ],
            [
                'role' => $role,
                'token' => $token,
                'invited_by' => $inviter->id,
                'expires_at' => now()->addDays(7),
            ]
        );

        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');
        $inviteUrl = "{$frontendUrl}/invitations/{$invitation->token}";

        return [
            'type' => 'INVITATION_SENT',
            'invitation' => [
                'id' => $invitation->id,
                'email' => $invitation->email,
                'role' => $invitation->role,
                'token' => $invitation->token,
                'expires_at' => $invitation->expires_at->toIso8601String(),
                'invite_url' => $inviteUrl,
            ],
            'message' => 'Invitación generada exitosamente. Enlace disponible para unirse.',
        ];
    }

    /**
     * Actualiza el rol de un miembro.
     */
    public function updateMemberRole(Project $project, int $userId, string $role): ProjectMember
    {
        $member = ProjectMember::where('project_id', $project->id)
            ->where('user_id', $userId)
            ->firstOrFail();

        $member->update(['role' => $role]);

        return $member;
    }

    /**
     * Remueve un miembro del proyecto.
     */
    public function removeMember(Project $project, int $userId): bool
    {
        return (bool) ProjectMember::where('project_id', $project->id)
            ->where('user_id', $userId)
            ->delete();
    }

    /**
     * Cancela una invitación pendiente.
     */
    public function cancelInvitation(Project $project, int $invitationId): bool
    {
        return (bool) ProjectInvitation::where('project_id', $project->id)
            ->where('id', $invitationId)
            ->delete();
    }

    /**
     * Obtiene los detalles de una invitación por su token.
     */
    public function getInvitationByToken(string $token): ProjectInvitation
    {
        $invitation = ProjectInvitation::with(['project.workspace', 'inviter:id,name,email'])
            ->where('token', $token)
            ->firstOrFail();

        if ($invitation->status !== 'PENDING') {
            throw new Exception('Esta invitación ya ha sido procesada o cancelada.', 400);
        }

        if ($invitation->isExpired()) {
            throw new Exception('Esta invitación ha expirado.', 400);
        }

        return $invitation;
    }

    /**
     * Acepta una invitación y agrega al usuario autenticado.
     */
    public function acceptInvitation(string $token, User $user): Project
    {
        return DB::transaction(function () use ($token, $user) {
            $invitation = $this->getInvitationByToken($token);

            $project = $invitation->project;

            // Vincular al Workspace
            WorkspaceMember::firstOrCreate(
                [
                    'workspace_id' => $project->workspace_id,
                    'user_id' => $user->id,
                ],
                [
                    'role' => 'MEMBER',
                ]
            );

            // Vincular al Proyecto
            ProjectMember::updateOrCreate(
                [
                    'project_id' => $project->id,
                    'user_id' => $user->id,
                ],
                [
                    'role' => $invitation->role,
                ]
            );

            // Marcar invitación como aceptada
            $invitation->update([
                'status' => 'ACCEPTED',
            ]);

            return $project;
        });
    }
}

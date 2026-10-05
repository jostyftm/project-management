<?php

namespace App\Services;

use App\Mail\ProjectInvitationMail;
use App\Mail\ProjectMemberAddedMail;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\ProjectMember;
use App\Models\User;
use App\Models\WorkspaceMember;
use App\Services\NotificationService;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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

            // 1. Notificación In-App en la plataforma
            try {
                $notificationService = app(NotificationService::class);
                $notificationService->sendNotification(
                    workspaceId: $project->workspace_id,
                    recipientId: $existingUser->id,
                    actorId: $inviter->id,
                    type: 'PROJECT_INVITATION',
                    entityType: 'PROJECT',
                    entityId: $project->id,
                    title: 'Te han añadido a un proyecto',
                    message: "{$inviter->name} te ha añadido al proyecto «{$project->name}» con el rol {$role}.",
                    targetUrl: "/projects/{$project->id}"
                );
            } catch (Exception $e) {
                Log::warning("Error creando notificación in-app para usuario {$existingUser->id}: " . $e->getMessage());
            }

            // 2. Notificación por Correo Electrónico (Encolada mediante Job)
            try {
                $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
                $projectUrl = "{$frontendUrl}/projects/{$project->id}";
                \App\Jobs\SendNotificationEmailJob::dispatch(
                    $existingUser->email,
                    new ProjectMemberAddedMail(
                        project: $project->loadMissing('workspace'),
                        member: $existingUser,
                        inviter: $inviter,
                        role: $role,
                        projectUrl: $projectUrl
                    )
                );
            } catch (Exception $e) {
                Log::warning("No se pudo encolar correo a {$existingUser->email}: " . $e->getMessage());
            }

            return [
                'type' => 'MEMBER_ADDED',
                'user' => [
                    'id' => $existingUser->id,
                    'name' => $existingUser->name,
                    'email' => $existingUser->email,
                    'role' => $role,
                ],
                'message' => 'Usuario añadido exitosamente al proyecto. Se enviaron notificaciones por correo y en la app.',
            ];
        }

        // Si no existe, crear invitación con token único
        $token = Str::random(40);
        $invitation = ProjectInvitation::updateOrCreate(
            [
                'project_id' => $project->id,
                'email'      => $email,
                'status'     => 'PENDING',
            ],
            [
                'role'       => $role,
                'token'      => $token,
                'invited_by' => $inviter->id,
                'expires_at' => now()->addDays(7),
            ]
        );

        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');
        $inviteUrl = "{$frontendUrl}/invitations/{$invitation->token}";

        // Cargar relaciones necesarias para el Mailable antes de enviarlo
        $invitation->load(['project', 'inviter:id,name,email']);

        // Encolar correo de invitación usando el Job en segundo plano (cero impacto visual)
        try {
            \App\Jobs\SendNotificationEmailJob::dispatch(
                $email,
                new ProjectInvitationMail($invitation, $inviteUrl)
            );
        } catch (Exception $e) {
            Log::warning("No se pudo encolar correo de invitación a {$email}: " . $e->getMessage());
        }

        return [
            'type' => 'INVITATION_SENT',
            'invitation' => [
                'id'         => $invitation->id,
                'email'      => $invitation->email,
                'role'       => $invitation->role,
                'token'      => $invitation->token,
                'expires_at' => $invitation->expires_at->toIso8601String(),
                'invite_url' => $inviteUrl,
            ],
            'message' => 'Invitación generada exitosamente. Se envió un correo al destinatario.',
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

            // Generar notificación in-app de bienvenida para el usuario
            try {
                $notificationService = app(NotificationService::class);
                $notificationService->sendNotification(
                    workspaceId: $project->workspace_id,
                    recipientId: $user->id,
                    actorId: $invitation->invited_by,
                    type: 'PROJECT_INVITATION',
                    entityType: 'PROJECT',
                    entityId: $project->id,
                    title: '¡Bienvenido al proyecto!',
                    message: "Te has unido exitosamente al proyecto «{$project->name}» como {$invitation->role}.",
                    targetUrl: "/projects/{$project->id}"
                );
            } catch (Exception $e) {
                Log::warning("Error creando notificación de bienvenida para invitación: " . $e->getMessage());
            }

            return $project;
        });
    }

    /**
     * Completa el onboarding de un usuario no registrado:
     * Crea su cuenta, genera token de sesión, auto-acepta la invitación y genera su notificación in-app.
     */
    public function onboardAndAccept(string $token, array $data): array
    {
        return DB::transaction(function () use ($token, $data) {
            $invitation = $this->getInvitationByToken($token);
            $email = strtolower(trim($invitation->email));

            if (User::where('email', $email)->exists()) {
                throw new Exception('Ya existe una cuenta registrada con este correo electrónico. Por favor, inicia sesión.', 422);
            }

            // 1. Crear nuevo usuario con el correo de la invitación
            $user = User::create([
                'name'     => trim($data['name']),
                'email'    => $email,
                'password' => Hash::make($data['password']),
            ]);

            // 2. Generar token de sesión Sanctum
            $authToken = $user->createToken('auth-token')->plainTextToken;

            // 3. Aceptar la invitación y asociarlo al proyecto y workspace
            $project = $this->acceptInvitation($token, $user);

            return [
                'token'             => $authToken,
                'user'              => $user->load('workspaces'),
                'current_workspace' => $project->workspace,
                'project'           => [
                    'id'             => (string) $project->id,
                    'name'           => $project->name,
                    'identifier'     => $project->identifier,
                    'workspace_slug' => $project->workspace->slug,
                ],
                'message'           => '¡Cuenta creada y acceso al proyecto configurado con éxito!',
            ];
        });
    }
}

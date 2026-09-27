<?php

namespace App\Http\Controllers\Api\v1\Project;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\AddProjectMemberRequest;
use App\Http\Requests\Project\UpdateProjectMemberRoleRequest;
use App\Models\Project;
use App\Services\ProjectMemberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectMemberController extends Controller
{
    public function __construct(
        protected ProjectMemberService $memberService
    ) {}

    /**
     * Lista los miembros y las invitaciones pendientes del proyecto.
     */
    public function index(Request $request, Project $project): JsonResponse
    {
        $members = $this->memberService->listMembers($project);
        $invitations = $this->memberService->listInvitations($project);

        return response()->json([
            'data' => [
                'members' => $members->map(fn ($user) => [
                    'id' => (string) $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->pivot->role ?? 'MEMBER',
                    'joined_at' => $user->pivot->created_at?->toISOString(),
                ]),
                'invitations' => $invitations->map(fn ($inv) => [
                    'id' => (string) $inv->id,
                    'email' => $inv->email,
                    'role' => $inv->role,
                    'token' => $inv->token,
                    'invited_by' => $inv->inviter ? [
                        'id' => (string) $inv->inviter->id,
                        'name' => $inv->inviter->name,
                    ] : null,
                    'expires_at' => $inv->expires_at?->toISOString(),
                ]),
            ],
        ]);
    }

    /**
     * Añade un usuario o genera una invitación al proyecto.
     */
    public function store(AddProjectMemberRequest $request, Project $project): JsonResponse
    {
        $result = $this->memberService->addMemberOrInvite(
            $project,
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'data' => $result,
        ], 201);
    }

    /**
     * Actualiza el rol de un miembro en el proyecto.
     */
    public function update(UpdateProjectMemberRoleRequest $request, Project $project, int $userId): JsonResponse
    {
        $member = $this->memberService->updateMemberRole(
            $project,
            $userId,
            $request->validated('role')
        );

        return response()->json([
            'data' => [
                'id' => (string) $member->id,
                'user_id' => (string) $member->user_id,
                'role' => $member->role,
            ],
            'message' => 'Rol actualizado con éxito.',
        ]);
    }

    /**
     * Elimina un miembro del proyecto.
     */
    public function destroy(Project $project, int $userId): JsonResponse
    {
        $this->memberService->removeMember($project, $userId);

        return response()->json([
            'message' => 'Miembro eliminado del proyecto.',
        ]);
    }

    /**
     * Cancela una invitación pendiente.
     */
    public function cancelInvitation(Project $project, int $invitationId): JsonResponse
    {
        $this->memberService->cancelInvitation($project, $invitationId);

        return response()->json([
            'message' => 'Invitación cancelada correctamente.',
        ]);
    }
}

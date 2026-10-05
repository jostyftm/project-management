<?php

namespace App\Http\Controllers\Api\v1\Invitation;

use App\Http\Controllers\Controller;
use App\Services\ProjectMemberService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    public function __construct(
        protected ProjectMemberService $memberService
    ) {}

    /**
     * Muestra información de una invitación pública por su token.
     */
    public function show(string $token): JsonResponse
    {
        try {
            $invitation = $this->memberService->getInvitationByToken($token);

            return response()->json([
                'data' => [
                    'id' => (string) $invitation->id,
                    'email' => $invitation->email,
                    'role' => $invitation->role,
                    'project' => [
                        'id' => (string) $invitation->project->id,
                        'name' => $invitation->project->name,
                        'identifier' => $invitation->project->identifier,
                        'workspace' => [
                            'id' => (string) $invitation->project->workspace->id,
                            'name' => $invitation->project->workspace->name,
                            'slug' => $invitation->project->workspace->slug,
                        ],
                    ],
                    'inviter' => $invitation->inviter ? [
                        'name' => $invitation->inviter->name,
                        'email' => $invitation->inviter->email,
                    ] : null,
                    'user_exists' => \App\Models\User::where('email', strtolower(trim($invitation->email)))->exists(),
                    'expires_at' => $invitation->expires_at->toISOString(),
                ],
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Registra al usuario y auto-acepta la invitación (Onboarding).
     */
    public function onboard(Request $request, string $token): JsonResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        try {
            $result = $this->memberService->onboardAndAccept($token, $validated);

            return response()->json([
                'message'           => $result['message'],
                'token'             => $result['token'],
                'user'              => $result['user'],
                'current_workspace' => $result['current_workspace'],
                'data'              => [
                    'project' => $result['project'],
                ],
            ], 201);
        } catch (Exception $e) {
            $status = ($e->getCode() >= 400 && $e->getCode() < 500) ? $e->getCode() : 400;

            return response()->json([
                'message' => $e->getMessage(),
            ], $status);
        }
    }

    /**
     * Acepta una invitación con el usuario autenticado.
     */
    public function accept(Request $request, string $token): JsonResponse
    {
        try {
            $project = $this->memberService->acceptInvitation($token, $request->user());

            return response()->json([
                'message' => '¡Te has unido exitosamente al proyecto!',
                'data' => [
                    'project' => [
                        'id' => (string) $project->id,
                        'name' => $project->name,
                        'identifier' => $project->identifier,
                        'workspace_slug' => $project->workspace->slug,
                    ],
                ],
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}


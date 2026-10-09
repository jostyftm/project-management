<?php

namespace App\Http\Controllers\Api\v1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Services\AuthService;
use App\Traits\HasApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    use HasApiResponse;

    public function __construct(
        private AuthService $authService
    ) {}

    /**
     * Registro de nuevo usuario con workspace automático.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request);

        return $this->successResponse($result, 201);
    }

    /**
     * Inicio de sesión con credenciales email/password.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request);

        return $this->successResponse($result, 200);
    }

    /**
     * Obtener perfil del usuario autenticado y sus workspaces.
     */
    public function me(Request $request): JsonResponse
    {
        $result = $this->authService->me($request->user());

        return $this->successResponse($result, 200);
    }

    /**
     * Cerrar sesión y revocar token.
     */
    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return $this->successResponse(['message' => 'Sesión cerrada exitosamente.'], 200);
    }

    /**
     * Solicitar enlace temporal de 10 minutos para restablecer contraseña.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $result = $this->authService->forgotPassword($request);

        return $this->successResponse($result, 200);
    }

    /**
     * Restablecer la contraseña con el token firmado temporal.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $result = $this->authService->resetPassword($request);

        return $this->successResponse($result, 200);
    }
}

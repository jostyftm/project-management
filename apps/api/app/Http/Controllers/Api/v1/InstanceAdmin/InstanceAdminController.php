<?php

namespace App\Http\Controllers\Api\v1\InstanceAdmin;

use App\Http\Controllers\Controller;
use App\Http\Requests\InstanceAdmin\UpdateInstanceSettingsRequest;
use App\Services\InstanceAdminService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstanceAdminController extends Controller
{
    public function __construct(
        protected InstanceAdminService $adminService
    ) {}

    /**
     * Verifica que el usuario sea administrador de la instancia.
     */
    protected function authorizeAdmin(Request $request): void
    {
        if (! $request->user()?->is_instance_admin) {
            abort(403, 'Acceso restringido a administradores de la instancia.');
        }
    }

    /**
     * Obtiene la configuración general de la instancia.
     */
    public function getSettings(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $settings = $this->adminService->getSettings();

        return response()->json([
            'data' => $settings,
        ]);
    }

    /**
     * Actualiza la configuración de la instancia.
     */
    public function updateSettings(UpdateInstanceSettingsRequest $request): JsonResponse
    {
        $settings = $this->adminService->updateSettings($request->validated());

        return response()->json([
            'data' => $settings,
            'message' => 'Configuración de la instancia actualizada correctamente.',
        ]);
    }

    /**
     * Obtiene diagnósticos de salud del sistema.
     */
    public function getHealth(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $health = $this->adminService->getSystemHealth();

        return response()->json([
            'data' => $health,
        ]);
    }

    /**
     * Lista los usuarios de la instancia.
     */
    public function getUsers(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $perPage = (int) $request->get('per_page', 25);
        $users = $this->adminService->listUsers($perPage);

        return response()->json($users);
    }

    /**
     * Modifica el rol de administrador de un usuario.
     */
    public function toggleUserAdmin(Request $request, int $userId): JsonResponse
    {
        $this->authorizeAdmin($request);

        $request->validate([
            'is_instance_admin' => ['required', 'boolean'],
        ]);

        $user = $this->adminService->updateUserAdminStatus($userId, (bool) $request->is_instance_admin);

        return response()->json([
            'data' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_instance_admin' => (bool) $user->is_instance_admin,
            ],
            'message' => 'Permisos de administrador actualizados.',
        ]);
    }

    /**
     * Prueba el envío de correo electrónico SMTP.
     */
    public function testEmail(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $result = $this->adminService->sendTestEmail($request->email);

        return response()->json($result);
    }
}

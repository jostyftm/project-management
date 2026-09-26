<?php

namespace App\Services;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * Registra un nuevo usuario y crea su workspace por defecto.
     */
    public function register(Request $request): array
    {
        $data = $request->validated();

        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);

            $workspaceName = $data['workspace_name'] ?? ($user->name . "'s Workspace");
            $baseSlug = Str::slug($workspaceName);
            $slug = $baseSlug;
            $counter = 1;

            while (Workspace::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $counter++;
            }

            $workspace = Workspace::create([
                'name' => $workspaceName,
                'slug' => $slug,
                'owner_id' => $user->id,
            ]);

            WorkspaceMember::create([
                'workspace_id' => $workspace->id,
                'user_id' => $user->id,
                'role' => 'OWNER',
                'joined_at' => now(),
            ]);

            $token = $user->createToken('auth-token')->plainTextToken;

            return [
                'token' => $token,
                'user' => $user->load('workspaces'),
                'current_workspace' => $workspace,
            ];
        });
    }

    /**
     * Autentica credenciales y genera token de acceso.
     */
    public function login(Request $request): array
    {
        $data = $request->validated();
        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;
        $workspaces = $user->workspaces;
        $currentWorkspace = $workspaces->first();

        return [
            'token' => $token,
            'user' => $user->load('workspaces'),
            'current_workspace' => $currentWorkspace,
        ];
    }

    /**
     * Retorna el usuario autenticado con sus workspaces y roles.
     */
    public function me(User $user): array
    {
        return [
            'user' => $user->load(['workspaces']),
        ];
    }

    /**
     * Cierra la sesión revocando el token activo.
     */
    public function logout(User $user, ?string $currentToken = null): void
    {
        if ($currentToken) {
            $user->tokens()->where('token', hash('sha256', $currentToken))->delete();
        } else {
            $user->currentAccessToken()?->delete();
        }
    }
}

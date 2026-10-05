<?php

namespace App\Services;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Jobs\SendNotificationEmailJob;
use App\Mail\ResetPasswordMail;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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

    /**
     * Genera un token firmado temporal de 10 minutos y envía el correo de restablecimiento.
     */
    public function forgotPassword(ForgotPasswordRequest $request): array
    {
        $email = strtolower(trim($request->validated('email')));
        $user = User::where('email', $email)->first();

        if ($user) {
            $plainToken = Str::random(64);
            $hashedToken = hash('sha256', $plainToken);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $email],
                [
                    'token' => $hashedToken,
                    'created_at' => now(),
                ]
            );

            $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3010')), '/');
            $resetUrl = "{$frontendUrl}/reset-password?token={$plainToken}&email=" . urlencode($email);

            try {
                SendNotificationEmailJob::dispatch(
                    $user->email,
                    new ResetPasswordMail($resetUrl, $user->name, 10)
                );
            } catch (\Throwable $e) {
                Log::warning("No se pudo encolar correo de recuperación de contraseña para {$user->email}: " . $e->getMessage());
                try {
                    Mail::to($user->email)->send(new ResetPasswordMail($resetUrl, $user->name, 10));
                } catch (\Throwable $inner) {
                    Log::error("Fallo al enviar correo directo de recuperación a {$user->email}: " . $inner->getMessage());
                }
            }
        }

        return [
            'message' => 'Si el correo electrónico está registrado, recibirás un enlace de restablecimiento con una vigencia de 10 minutos.',
        ];
    }

    /**
     * Valida el token temporal firmado y restablece la contraseña del usuario.
     */
    public function resetPassword(ResetPasswordRequest $request): array
    {
        $email = strtolower(trim($request->validated('email')));
        $token = $request->validated('token');
        $password = $request->validated('password');

        $record = DB::table('password_reset_tokens')->where('email', $email)->first();

        if (! $record) {
            throw ValidationException::withMessages([
                'token' => ['El enlace de restablecimiento es inválido o ha expirado.'],
            ]);
        }

        $createdAt = Carbon::parse($record->created_at);
        if ($createdAt->addMinutes(10)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            throw ValidationException::withMessages([
                'token' => ['El enlace de restablecimiento ha expirado. Los enlaces tienen una vigencia de 10 minutos.'],
            ]);
        }

        if (! hash_equals($record->token, hash('sha256', $token))) {
            throw ValidationException::withMessages([
                'token' => ['El enlace de restablecimiento es inválido.'],
            ]);
        }

        $user = User::where('email', $email)->first();
        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['No se encontró ningún usuario asociado a esta cuenta.'],
            ]);
        }

        DB::transaction(function () use ($user, $password, $email) {
            $user->update([
                'password' => Hash::make($password),
            ]);

            // Revocar tokens de sesión existentes por seguridad
            $user->tokens()->delete();

            // Eliminar token ya utilizado
            DB::table('password_reset_tokens')->where('email', $email)->delete();
        });

        return [
            'message' => 'Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión.',
        ];
    }
}


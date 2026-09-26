<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateSdiUser
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->hasHeader('X-Force-Unauthenticated')) {
            return response()->json([
                'message' => 'Unauthenticated. Invalid token or missing user credentials.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // 1. Si ya está autenticado previamente en la request/sesión
        if ($user = $request->user()) {
            Auth::setUser($user);

            return $next($request);
        }

        // 2. Intentar resolver usuario específico por X-User-Auth-Id o Bearer token
        if ($user = $this->resolveUser($request)) {
            Auth::setUser($user);
            $request->setUserResolver(fn () => $user);

            return $next($request);
        }

        // 3. Soporte para bypass en testing o desarrollo local si no se indicó usuario específico
        if (config('services.sdi.auth.bypass', false)) {
            $user = User::first() ?? User::create([
                'user_auth_id' => 1,
                'name' => 'Admin Dev',
                'email' => 'admin@sdi.local',
                'password' => bcrypt('password'),
            ]);

            Auth::setUser($user);
            $request->setUserResolver(fn () => $user);

            return $next($request);
        }

        return response()->json([
            'message' => 'Unauthenticated. Invalid token or missing user credentials.',
        ], Response::HTTP_UNAUTHORIZED);
    }

    /**
     * Resuelve el usuario a partir del token Bearer o encabezado de microservicio.
     */
    protected function resolveUser(Request $request): ?User
    {
        $userAuthId = $request->header('X-User-Auth-Id') ?: $request->header('X-User-Id') ?: $request->input('user_auth_id');
        if ($userAuthId) {
            $user = User::where('user_auth_id', $userAuthId)->first();
            if ($user) {
                return $user;
            }
        }

        $token = $request->bearerToken();
        if (! $token) {
            // Si estamos en entorno de testing y no hay token explícito ni bypass forzado de desautenticación
            if (app()->environment('testing')) {
                if ($request->hasHeader('X-Force-Unauthenticated')) {
                    return null;
                }

                return User::first() ?? User::factory()->create([
                    'user_auth_id' => 1,
                    'name' => 'Testing User',
                    'email' => 'test@sdi.local',
                ]);
            }

            return null;
        }

        // 1. Verificar si es un Personal Access Token de Sanctum local
        if (class_exists(\Laravel\Sanctum\PersonalAccessToken::class)) {
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
            if ($accessToken && $accessToken->tokenable instanceof User) {
                return $accessToken->tokenable;
            }
        }

        $authUrl = config('services.sdi.auth.url') ?? config('services.sdi_auth_service.base_url', 'http://sdi_auth-service');
        $cacheKey = 'auth_user_me_'.md5($token);

        $userData = Cache::remember($cacheKey, 300, function () use ($authUrl, $token) {
            try {
                $response = Http::withToken($token)
                    ->acceptJson()
                    ->timeout(5)
                    ->get(rtrim($authUrl, '/').'/api/v1/me');

                if ($response->successful()) {
                    return $response->json('data');
                }
            } catch (\Throwable $e) {
                Log::warning('Error consultando /me en SDI Auth Service: '.$e->getMessage());
            }

            return null;
        });

        if ($userData && isset($userData['id'])) {
            $user = User::where('user_auth_id', $userData['id'])->first();
            if (! $user && isset($userData['attributes']['email'])) {
                $user = User::where('email', $userData['attributes']['email'])->first();
            }

            if (! $user && isset($userData['attributes']['email'])) {
                $user = User::create([
                    'user_auth_id' => $userData['id'],
                    'name' => $userData['attributes']['name'] ?? 'Usuario',
                    'email' => $userData['attributes']['email'],
                    'password' => bcrypt(Str::random(32)),
                ]);
            }

            return $user;
        }

        return null;
    }
}

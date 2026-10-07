<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateMcpRequest
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Si viene Bearer token en el header Authorization, autenticar con Sanctum
        if ($request->bearerToken()) {
            if ($user = auth('sanctum')->user()) {
                Auth::setUser($user);
                $request->setUserResolver(fn () => $user);

                return $next($request);
            }

            return response()->json([
                'status' => 401,
                'message' => 'Unauthenticated: Token inválido.',
            ], 401);
        }

        // 2. En entorno local/desarrollo o con bypass activo, autenticar automáticamente al SuperAdmin
        if (app()->environment('local', 'testing') || config('services.sdi.auth.bypass', false)) {
            $user = User::where('is_instance_admin', true)->first() ?? User::first();
            if ($user) {
                Auth::setUser($user);
                $request->setUserResolver(fn () => $user);
            }

            return $next($request);
        }

        // 3. En producción sin token, rechazar
        return response()->json([
            'status' => 401,
            'message' => 'Unauthenticated.',
        ], 401);
    }
}

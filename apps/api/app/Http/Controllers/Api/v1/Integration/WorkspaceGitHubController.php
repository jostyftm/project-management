<?php

namespace App\Http\Controllers\Api\v1\Integration;

use App\Http\Controllers\Controller;
use App\Models\Integration;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class WorkspaceGitHubController extends Controller
{
    /**
     * Retorna el estado de la integración de GitHub para el workspace,
     * incluyendo la organización conectada y los repositorios descubiertos.
     */
    public function show(Workspace $workspace): JsonResponse
    {
        $this->authorizeOwner($workspace);

        $integration = Integration::where('workspace_id', $workspace->id)
            ->where('provider', 'GITHUB')
            ->whereNull('project_id')
            ->first();

        if (! $integration || ! $integration->is_active) {
            return response()->json([
                'connected' => false,
                'org_name' => null,
                'avatar_url' => null,
                'account_type' => null,
                'auth_method' => null,
                'repositories_count' => 0,
                'repositories' => [],
                'last_sync_at' => null,
            ]);
        }

        $config = $integration->config ?? [];
        $repos = $config['repositories'] ?? [];

        return response()->json([
            'connected' => true,
            'id' => $integration->id,
            'org_name' => $config['org_name'] ?? null,
            'avatar_url' => $config['avatar_url'] ?? "https://github.com/{$config['org_name']}.png",
            'account_type' => $config['account_type'] ?? 'Organization',
            'auth_method' => $config['auth_method'] ?? 'token',
            'repositories_count' => count($repos),
            'repositories' => $repos,
            'last_sync_at' => $integration->last_sync_at?->toIso8601String(),
        ]);
    }

    /**
     * Verifica la validez de un Personal Access Token de GitHub y
     * devuelve el perfil del usuario autenticado junto con sus organizaciones.
     */
    public function verify(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorizeOwner($workspace);

        $validated = $request->validate([
            'access_token' => 'required|string|max:500',
        ]);

        $token = trim($validated['access_token']);

        $userResponse = Http::withHeaders([
            'Authorization' => "Bearer {$token}",
            'User-Agent' => 'Plane-SelfHosted-App',
            'Accept' => 'application/vnd.github.v3+json',
        ])->timeout(8)->get('https://api.github.com/user');

        if ($userResponse->status() === 401) {
            throw ValidationException::withMessages([
                'access_token' => ['El token de GitHub es inválido o ha expirado. Por favor verifica tus credenciales.'],
            ]);
        }

        if (! $userResponse->successful()) {
            $msg = $userResponse->json('message') ?? 'Error al comunicarse con la API de GitHub.';
            throw ValidationException::withMessages([
                'access_token' => ["GitHub API error: {$msg}"],
            ]);
        }

        $userData = $userResponse->json();

        // Consultar organizaciones del usuario
        $orgsResponse = Http::withHeaders([
            'Authorization' => "Bearer {$token}",
            'User-Agent' => 'Plane-SelfHosted-App',
            'Accept' => 'application/vnd.github.v3+json',
        ])->timeout(8)->get('https://api.github.com/user/orgs?per_page=100');

        $orgs = [];
        if ($orgsResponse->successful() && is_array($orgsResponse->json())) {
            $orgs = collect($orgsResponse->json())->map(function ($org) {
                return [
                    'login' => $org['login'] ?? '',
                    'avatar_url' => $org['avatar_url'] ?? '',
                    'description' => $org['description'] ?? '',
                ];
            })->all();
        }

        return response()->json([
            'valid' => true,
            'user' => [
                'login' => $userData['login'] ?? '',
                'name' => $userData['name'] ?? $userData['login'] ?? '',
                'avatar_url' => $userData['avatar_url'] ?? '',
            ],
            'organizations' => $orgs,
        ]);
    }

    /**
     * Conecta una organización o cuenta de GitHub al workspace y
     * descubre automáticamente los repositorios reales disponibles.
     */
    public function connect(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorizeOwner($workspace);

        $validated = $request->validate([
            'org_name' => 'nullable|string|max:100',
            'access_token' => 'nullable|string|max:500',
            'account_type' => 'nullable|string|in:Organization,User,All',
            'auth_method' => 'nullable|string|in:token,app',
            'app_id' => 'nullable|string|max:100',
            'installation_id' => 'nullable|string|max:100',
            'avatar_url' => 'nullable|string|url|max:255',
        ]);

        $accessToken = ! empty($validated['access_token']) ? trim($validated['access_token']) : null;
        $authMethod = $validated['auth_method'] ?? 'token';
        $installationId = $validated['installation_id'] ?? null;
        $appId = $validated['app_id'] ?? null;

        // Si se provee token y no se indica org_name, intentar autodetectar usuario autenticado
        $orgName = ! empty($validated['org_name']) ? trim($validated['org_name']) : null;
        $accountType = $validated['account_type'] ?? 'Organization';
        $detectedAvatar = null;

        if ($accessToken) {
            $userCheck = Http::withHeaders([
                'Authorization' => "Bearer {$accessToken}",
                'User-Agent' => 'Plane-SelfHosted-App',
                'Accept' => 'application/vnd.github.v3+json',
            ])->timeout(8)->get('https://api.github.com/user');

            if ($userCheck->status() === 401) {
                throw ValidationException::withMessages([
                    'access_token' => ['Token de GitHub inválido o expirado. Genera un nuevo token con scopes "repo" y "read:org".'],
                ]);
            }

            if ($userCheck->successful()) {
                $userProfile = $userCheck->json();
                if (empty($orgName)) {
                    $orgName = $userProfile['login'] ?? 'GitHub Account';
                    $accountType = 'User';
                }
                $detectedAvatar = $userProfile['avatar_url'] ?? null;
            }
        }

        if (empty($orgName)) {
            $orgName = 'GitHub Organization';
        }

        // Consultar repositorios reales
        $discoveredRepos = $this->fetchRepositoriesFromGitHub(
            $orgName,
            $accessToken,
            $accountType,
            $authMethod,
            $installationId
        );

        $avatarUrl = $validated['avatar_url'] ?? $detectedAvatar ?? "https://github.com/{$orgName}.png";

        $integration = Integration::updateOrCreate(
            [
                'workspace_id' => $workspace->id,
                'provider' => 'GITHUB',
                'project_id' => null,
            ],
            [
                'name' => "GitHub - {$orgName}",
                'config' => [
                    'org_name' => $orgName,
                    'avatar_url' => $avatarUrl,
                    'account_type' => $accountType,
                    'auth_method' => $authMethod,
                    'access_token' => $accessToken,
                    'app_id' => $appId,
                    'installation_id' => $installationId,
                    'repositories' => $discoveredRepos,
                ],
                'is_active' => true,
                'last_sync_at' => now(),
            ]
        );

        $repoCount = count($discoveredRepos);

        return response()->json([
            'message' => "Cuenta/Organización de GitHub '{$orgName}' conectada exitosamente ({$repoCount} repositorios reales mapeados)",
            'integration' => [
                'connected' => true,
                'id' => $integration->id,
                'org_name' => $orgName,
                'avatar_url' => $avatarUrl,
                'account_type' => $accountType,
                'auth_method' => $authMethod,
                'repositories_count' => $repoCount,
                'repositories' => $discoveredRepos,
                'last_sync_at' => $integration->last_sync_at?->toIso8601String(),
            ],
        ], 200);
    }

    /**
     * Refresca la lista de repositorios reales desde la API de GitHub.
     */
    public function sync(Workspace $workspace): JsonResponse
    {
        $this->authorizeOwner($workspace);

        $integration = Integration::where('workspace_id', $workspace->id)
            ->where('provider', 'GITHUB')
            ->whereNull('project_id')
            ->firstOrFail();

        $config = $integration->config ?? [];
        $orgName = $config['org_name'] ?? '';
        $accessToken = $config['access_token'] ?? null;
        $accountType = $config['account_type'] ?? 'Organization';
        $authMethod = $config['auth_method'] ?? 'token';
        $installationId = $config['installation_id'] ?? null;

        $discoveredRepos = $this->fetchRepositoriesFromGitHub(
            $orgName,
            $accessToken,
            $accountType,
            $authMethod,
            $installationId
        );

        $config['repositories'] = $discoveredRepos;
        $integration->config = $config;
        $integration->last_sync_at = now();
        $integration->save();

        return response()->json([
            'message' => 'Repositorios del workspace sincronizados exitosamente con GitHub',
            'repositories_count' => count($discoveredRepos),
            'repositories' => $discoveredRepos,
            'last_sync_at' => $integration->last_sync_at->toIso8601String(),
        ]);
    }

    /**
     * Desconecta la organización de GitHub del workspace.
     */
    public function disconnect(Workspace $workspace): JsonResponse
    {
        $this->authorizeOwner($workspace);

        $integration = Integration::where('workspace_id', $workspace->id)
            ->where('provider', 'GITHUB')
            ->whereNull('project_id')
            ->first();

        if ($integration) {
            $integration->delete();
        }

        return response()->json([
            'message' => 'Integración de GitHub desconectada del workspace',
        ]);
    }

    /**
     * Consulta la API oficial de GitHub para listar repositorios reales.
     * NUNCA devuelve datos ficticios ni fallbacks estáticos.
     */
    protected function fetchRepositoriesFromGitHub(
        string $orgName,
        ?string $token,
        string $accountType = 'Organization',
        string $authMethod = 'token',
        ?string $installationId = null
    ): array {
        $headers = [
            'User-Agent' => 'Plane-SelfHosted-App',
            'Accept' => 'application/vnd.github.v3+json',
        ];

        if (! empty($token)) {
            $headers['Authorization'] = "Bearer {$token}";
        }

        // 1. Caso Dokploy / GitHub App: Consulta /installation/repositories
        if ($authMethod === 'app' && ! empty($token)) {
            $response = Http::withHeaders($headers)
                ->timeout(10)
                ->get('https://api.github.com/installation/repositories?per_page=100');

            if ($response->successful()) {
                $repos = $response->json('repositories') ?? [];

                return $this->formatRepositories($repos);
            }

            if ($response->status() === 401 || $response->status() === 403) {
                throw ValidationException::withMessages([
                    'access_token' => ['Error al autenticar GitHub App. Verifica el token o el ID de instalación.'],
                ]);
            }
        }

        // 2. Caso Personal Access Token (PAT)
        if (! empty($token)) {
            // Si el accountType es 'All' o la orgName coincide con el usuario autenticado:
            if ($accountType === 'All') {
                $response = Http::withHeaders($headers)
                    ->timeout(10)
                    ->get('https://api.github.com/user/repos?per_page=100&affiliation=owner,collaborator,organization_member&sort=updated');

                if ($response->successful() && is_array($response->json())) {
                    return $this->formatRepositories($response->json());
                }
            }

            // Consultar por organización
            $endpoints = [];
            if ($accountType === 'User') {
                $endpoints[] = "https://api.github.com/users/{$orgName}/repos?per_page=100&type=all&sort=updated";
                $endpoints[] = 'https://api.github.com/user/repos?per_page=100&affiliation=owner,collaborator,organization_member&sort=updated';
            } else {
                $endpoints[] = "https://api.github.com/orgs/{$orgName}/repos?per_page=100&type=all&sort=updated";
                $endpoints[] = "https://api.github.com/users/{$orgName}/repos?per_page=100&type=all&sort=updated";
                $endpoints[] = 'https://api.github.com/user/repos?per_page=100&affiliation=owner,collaborator,organization_member&sort=updated';
            }

            foreach ($endpoints as $url) {
                $response = Http::withHeaders($headers)->timeout(10)->get($url);

                if ($response->successful() && is_array($response->json())) {
                    $raw = $response->json();
                    if (! empty($raw)) {
                        return $this->formatRepositories($raw);
                    }
                } elseif ($response->status() === 401) {
                    throw ValidationException::withMessages([
                        'access_token' => ['Token de GitHub inválido o expirado. Genera un nuevo token con scopes "repo" y "read:org".'],
                    ]);
                } elseif ($response->status() === 403) {
                    $msg = $response->json('message') ?? 'Acceso denegado por GitHub.';
                    throw ValidationException::withMessages([
                        'access_token' => ["GitHub API (403): {$msg}. Si usas una organización con SSO/SAML, autoriza el token en GitHub."],
                    ]);
                }
            }

            // Si llegamos aquí con token válido pero 0 repositorios encontrados
            return [];
        }

        // 3. Caso sin token (solo repositorios públicos):
        $publicUrls = [
            "https://api.github.com/orgs/{$orgName}/repos?per_page=100",
            "https://api.github.com/users/{$orgName}/repos?per_page=100",
        ];

        foreach ($publicUrls as $url) {
            $response = Http::withHeaders($headers)->timeout(8)->get($url);

            if ($response->successful() && is_array($response->json())) {
                return $this->formatRepositories($response->json());
            }

            if ($response->status() === 403) {
                throw ValidationException::withMessages([
                    'access_token' => ['Se ha alcanzado el límite de peticiones anónimas a la API de GitHub (60/hora). Por favor proporciona un Personal Access Token (PAT) con scope "repo".'],
                ]);
            }
        }

        // No se encontraron repositorios públicos y no se suministró token
        throw ValidationException::withMessages([
            'org_name' => ["No se encontraron repositorios públicos para '{$orgName}'. Si tus repositorios son privados o de organización, ingresa un GitHub Personal Access Token."],
        ]);
    }

    /**
     * Mapea el arreglo de repositorios retornado por la API de GitHub
     * a una estructura consistente y sanitizada.
     */
    protected function formatRepositories(array $rawRepos): array
    {
        return collect($rawRepos)
            ->filter(fn ($r) => is_array($r) && ! empty($r['name']))
            ->map(function ($r) {
                return [
                    'id' => (int) ($r['id'] ?? 0),
                    'name' => (string) ($r['name'] ?? ''),
                    'full_name' => (string) ($r['full_name'] ?? $r['name'] ?? ''),
                    'repo_url' => (string) ($r['html_url'] ?? "https://github.com/{$r['full_name']}"),
                    'default_branch' => (string) ($r['default_branch'] ?? 'main'),
                    'is_private' => (bool) ($r['private'] ?? false),
                    'description' => (string) ($r['description'] ?? ''),
                    'owner' => [
                        'login' => (string) ($r['owner']['login'] ?? ''),
                        'avatar_url' => (string) ($r['owner']['avatar_url'] ?? ''),
                    ],
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Valida que el usuario autenticado sea el dueño del workspace o administrador de la plataforma.
     */
    private function authorizeOwner(Workspace $workspace): void
    {
        $user = auth()->user();
        abort_if(
            ! $user || ((int) $workspace->owner_id !== (int) $user->id && ! $user->is_instance_admin),
            403,
            'Solo el dueño del workspace puede gestionar las integraciones del espacio de trabajo.'
        );
    }
}

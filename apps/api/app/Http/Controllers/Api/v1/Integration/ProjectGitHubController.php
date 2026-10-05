<?php

namespace App\Http\Controllers\Api\v1\Integration;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Integration;
use App\Models\Project;
use App\Models\ProjectGithubRepository;
use App\Models\ProjectGithubSetting;
use App\Models\State;
use App\Models\WorkItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProjectGitHubController extends Controller
{
    /**
     * Retorna repositorios y configuración de GitHub para un proyecto,
     * incluyendo la información de la integración de GitHub del Workspace.
     */
    public function index(Project $project): JsonResponse
    {
        $repositories = $project->githubRepositories()
            ->withCount(['pullRequests', 'commits'])
            ->get();

        $settings = ProjectGithubSetting::firstOrCreate(
            ['project_id' => $project->id],
            [
                'auto_start_on_pr' => true,
                'auto_complete_on_pr_merge' => true,
                'require_all_prs_merged' => true,
            ]
        );

        // Consultar integración de GitHub a nivel de Workspace
        $workspace = $project->workspace;
        $workspaceIntegration = Integration::where('workspace_id', $workspace->id)
            ->where('provider', 'GITHUB')
            ->whereNull('project_id')
            ->first();

        $workspaceRepos = [];
        $unlinkedRepos = [];
        $workspaceGitHub = [
            'connected' => false,
            'org_name' => null,
            'avatar_url' => null,
            'account_type' => null,
            'repositories_count' => 0,
            'available_repositories' => [],
            'unlinked_repositories' => [],
            'last_sync_at' => null,
        ];

        if ($workspaceIntegration && $workspaceIntegration->is_active) {
            $config = $workspaceIntegration->config ?? [];
            $workspaceRepos = $config['repositories'] ?? [];
            $linkedNames = $repositories->pluck('repo_full_name')->all();

            $unlinkedRepos = collect($workspaceRepos)->filter(function ($r) use ($linkedNames) {
                return !in_array($r['full_name'], $linkedNames);
            })->values()->all();

            $workspaceGitHub = [
                'connected' => true,
                'id' => $workspaceIntegration->id,
                'org_name' => $config['org_name'] ?? null,
                'avatar_url' => $config['avatar_url'] ?? "https://github.com/{$config['org_name']}.png",
                'account_type' => $config['account_type'] ?? 'Organization',
                'repositories_count' => count($workspaceRepos),
                'available_repositories' => $workspaceRepos,
                'unlinked_repositories' => $unlinkedRepos,
                'last_sync_at' => $workspaceIntegration->last_sync_at?->toIso8601String(),
            ];
        }

        $webhookBaseUrl = url("/api/v1/integrations/github/webhook");

        return response()->json([
            'repositories' => $repositories->map(function ($repo) use ($webhookBaseUrl) {
                return [
                    'id' => $repo->id,
                    'repo_full_name' => $repo->repo_full_name,
                    'label' => $repo->label,
                    'repo_url' => $repo->repo_url,
                    'default_branch' => $repo->default_branch ?? 'main',
                    'webhook_url' => "{$webhookBaseUrl}/{$repo->id}",
                    'webhook_secret' => $repo->webhook_secret,
                    'is_active' => $repo->is_active,
                    'pull_requests_count' => $repo->pull_requests_count,
                    'commits_count' => $repo->commits_count,
                    'created_at' => $repo->created_at,
                ];
            }),
            'settings' => $settings,
            'workspace_github' => $workspaceGitHub,
        ]);
    }

    /**
     * Vincula uno o varios repositorios de GitHub al proyecto.
     * Soporta tanto peticiones individuales como por lotes (Batch).
     */
    public function storeRepository(Request $request, Project $project): JsonResponse
    {
        $workspace = $project->workspace;
        $workspaceIntegration = Integration::where('workspace_id', $workspace->id)
            ->where('provider', 'GITHUB')
            ->whereNull('project_id')
            ->first();
        $discovered = collect($workspaceIntegration?->config['repositories'] ?? []);

        // Caso 1: Vinculación masiva (Batch)
        if ($request->has('repositories') && is_array($request->input('repositories'))) {
            $validated = $request->validate([
                'repositories' => 'required|array|min:1',
                'repositories.*.repo_full_name' => 'required|string|max:255',
                'repositories.*.label' => 'nullable|string|max:64',
                'repositories.*.repo_url' => 'nullable|url|max:255',
                'repositories.*.default_branch' => 'nullable|string|max:100',
            ]);

            $savedRepos = DB::transaction(function () use ($validated, $project, $discovered) {
                $saved = [];
                foreach ($validated['repositories'] as $item) {
                    $fullName = trim($item['repo_full_name']);
                    $found = $discovered->firstWhere('full_name', $fullName);

                    $repoUrl = $item['repo_url'] ?? $found['repo_url'] ?? "https://github.com/{$fullName}";
                    $branch = $item['default_branch'] ?? $found['default_branch'] ?? 'main';

                    $repo = ProjectGithubRepository::updateOrCreate(
                        [
                            'project_id' => $project->id,
                            'repo_full_name' => $fullName,
                        ],
                        [
                            'label' => $item['label'] ?? null,
                            'repo_url' => $repoUrl,
                            'default_branch' => $branch,
                            'webhook_secret' => Str::random(32),
                            'is_active' => true,
                        ]
                    );

                    $saved[] = [
                        'id' => $repo->id,
                        'repo_full_name' => $repo->repo_full_name,
                        'label' => $repo->label,
                        'repo_url' => $repo->repo_url,
                        'default_branch' => $repo->default_branch,
                        'webhook_url' => url("/api/v1/integrations/github/webhook/{$repo->id}"),
                        'webhook_secret' => $repo->webhook_secret,
                    ];
                }
                return $saved;
            });

            $count = count($savedRepos);
            return response()->json([
                'message' => "{$count} repositorio(s) vinculados exitosamente al proyecto",
                'repositories' => $savedRepos,
            ], 201);
        }

        // Caso 2: Vinculación individual
        $validated = $request->validate([
            'repo_full_name' => 'required|string|max:255',
            'label' => 'nullable|string|max:64',
            'repo_url' => 'nullable|url|max:255',
            'default_branch' => 'nullable|string|max:100',
        ]);

        $repoFullName = trim($validated['repo_full_name']);
        $found = $discovered->firstWhere('full_name', $repoFullName);

        $repoUrl = $validated['repo_url'] ?? $found['repo_url'] ?? "https://github.com/{$repoFullName}";
        $branch = $validated['default_branch'] ?? $found['default_branch'] ?? 'main';

        $secret = Str::random(32);

        $repo = ProjectGithubRepository::updateOrCreate(
            [
                'project_id' => $project->id,
                'repo_full_name' => $repoFullName,
            ],
            [
                'label' => $validated['label'] ?? null,
                'repo_url' => $repoUrl,
                'default_branch' => $branch,
                'webhook_secret' => $secret,
                'is_active' => true,
            ]
        );

        return response()->json([
            'message' => "Repositorio '{$repoFullName}' vinculado exitosamente al proyecto",
            'repository' => [
                'id' => $repo->id,
                'repo_full_name' => $repo->repo_full_name,
                'label' => $repo->label,
                'repo_url' => $repo->repo_url,
                'default_branch' => $repo->default_branch,
                'webhook_url' => url("/api/v1/integrations/github/webhook/{$repo->id}"),
                'webhook_secret' => $repo->webhook_secret,
            ],
        ], 201);
    }

    /**
     * Actualiza atributos de un repositorio vinculado (rama por defecto, label, etc.).
     */
    public function updateRepository(Request $request, Project $project, int $repoId): JsonResponse
    {
        $repo = $project->githubRepositories()->findOrFail($repoId);

        $validated = $request->validate([
            'default_branch' => 'nullable|string|max:100',
            'label' => 'nullable|string|max:64',
            'is_active' => 'nullable|boolean',
        ]);

        $repo->update(array_filter($validated, fn($val) => !is_null($val)));

        return response()->json([
            'message' => "Repositorio '{$repo->repo_full_name}' actualizado",
            'repository' => [
                'id' => $repo->id,
                'repo_full_name' => $repo->repo_full_name,
                'label' => $repo->label,
                'repo_url' => $repo->repo_url,
                'default_branch' => $repo->default_branch ?? 'main',
                'is_active' => $repo->is_active,
            ],
        ]);
    }

    /**
     * Desvincula un repositorio del proyecto.
     */
    public function destroyRepository(Project $project, int $repoId): JsonResponse
    {
        $repo = $project->githubRepositories()->findOrFail($repoId);
        $repo->delete();

        return response()->json(['message' => 'Repositorio desvinculado']);
    }

    /**
     * Actualiza la configuración de auto-transiciones de GitHub.
     */
    public function updateSettings(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'auto_start_on_pr' => 'boolean',
            'auto_complete_on_pr_merge' => 'boolean',
            'require_all_prs_merged' => 'boolean',
            'started_state_id' => 'nullable|exists:states,id',
            'completed_state_id' => 'nullable|exists:states,id',
        ]);

        $settings = ProjectGithubSetting::updateOrCreate(
            ['project_id' => $project->id],
            $validated
        );

        return response()->json([
            'message' => 'Configuración actualizada',
            'settings' => $settings,
        ]);
    }

    /**
     * Retorna datos de GitHub para un Work Item (PRs, Commits, dokploy previews).
     */
    public function getWorkItemGitHub(WorkItem $work_item): JsonResponse
    {
        $prs = $work_item->githubPullRequests()
            ->orderByDesc('created_at')
            ->get();

        $commits = $work_item->githubCommits()
            ->orderByDesc('committed_at')
            ->get();

        $project = $work_item->project;
        $repositories = $project->githubRepositories()
            ->where('is_active', true)
            ->get();

        $previewUrls = $prs->pluck('preview_url')->filter()->unique()->values();

        return response()->json([
            'work_item_id' => $work_item->id,
            'identifier' => $work_item->identifier,
            'title' => $work_item->title,
            'available_repositories' => $repositories->map(fn($r) => [
                'id' => $r->id,
                'repo_full_name' => $r->repo_full_name,
                'label' => $r->label,
                'default_branch' => $r->default_branch ?: 'main',
                'url' => $r->repo_url,
            ]),
            'pull_requests' => $prs,
            'commits' => $commits,
            'summary' => [
                'total_prs' => $prs->count(),
                'open_prs' => $prs->where('state', 'open')->count(),
                'merged_prs' => $prs->where('is_merged', true)->count(),
                'preview_urls' => $previewUrls,
            ],
        ]);
    }

    /**
     * Retorna las ramas reales de un repositorio desde la API de GitHub
     * usando las credenciales del Workspace.
     */
    public function branches(Request $request, Project $project): JsonResponse
    {
        $repoFullName = $request->query('repo_full_name');
        if (empty($repoFullName)) {
            $repoId = $request->query('repo_id');
            if ($repoId) {
                $repo = $project->githubRepositories()->find($repoId);
                $repoFullName = $repo?->repo_full_name;
            }
        }

        if (empty($repoFullName)) {
            return response()->json(['branches' => ['main', 'master']]);
        }

        // Obtener token del workspace
        $workspace = $project->workspace;
        $workspaceIntegration = Integration::where('workspace_id', $workspace->id)
            ->where('provider', 'GITHUB')
            ->whereNull('project_id')
            ->first();

        $token = $workspaceIntegration?->config['access_token'] ?? null;

        $headers = [
            'User-Agent' => 'Plane-SelfHosted-App',
            'Accept' => 'application/vnd.github.v3+json',
        ];
        if (!empty($token)) {
            $headers['Authorization'] = "Bearer {$token}";
        }

        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders($headers)
                ->timeout(8)
                ->get("https://api.github.com/repos/{$repoFullName}/branches?per_page=100");

            if ($response->successful() && is_array($response->json())) {
                $branches = collect($response->json())
                    ->pluck('name')
                    ->filter()
                    ->values()
                    ->all();

                if (!empty($branches)) {
                    return response()->json(['branches' => $branches]);
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Error al consultar ramas para {$repoFullName}: " . $e->getMessage());
        }

        return response()->json(['branches' => ['main', 'master', 'dev']]);
    }

    /**
     * Crea una nueva rama en el repositorio de GitHub y opcionalmente transiciona
     * el estado del WorkItem a "En Progreso" (STARTED).
     */
    public function createBranch(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'repo_full_name' => 'required|string',
            'branch_name' => 'required|string',
            'base_branch' => 'nullable|string',
            'work_item_id' => 'nullable|integer',
        ]);

        $repoFullName = $validated['repo_full_name'];
        $branchName = ltrim($validated['branch_name'], '/');

        // Verificar que el repositorio esté vinculado a este proyecto
        $repo = $project->githubRepositories()->where('repo_full_name', $repoFullName)->first();
        if (!$repo) {
            return response()->json([
                'message' => "El repositorio '{$repoFullName}' no está vinculado a este proyecto."
            ], 404);
        }

        $baseBranch = !empty($validated['base_branch']) ? $validated['base_branch'] : ($repo->default_branch ?: 'main');

        // Token de GitHub del workspace
        $workspace = $project->workspace;
        $workspaceIntegration = Integration::where('workspace_id', $workspace->id)
            ->where('provider', 'GITHUB')
            ->whereNull('project_id')
            ->first();

        $token = $workspaceIntegration?->config['access_token'] ?? null;
        if (empty($token)) {
            return response()->json([
                'message' => 'No hay credenciales de GitHub configuradas en el Workspace para crear ramas.'
            ], 422);
        }

        $headers = [
            'Authorization' => "Bearer {$token}",
            'User-Agent' => 'Plane-SelfHosted-App',
            'Accept' => 'application/vnd.github.v3+json',
        ];

        try {
            // 1. Obtener SHA del commit base en GitHub
            $refResponse = \Illuminate\Support\Facades\Http::withHeaders($headers)
                ->timeout(10)
                ->get("https://api.github.com/repos/{$repoFullName}/git/ref/heads/{$baseBranch}");

            $sha = null;
            if ($refResponse->successful()) {
                $sha = $refResponse->json('object.sha');
            } else {
                $branchResponse = \Illuminate\Support\Facades\Http::withHeaders($headers)
                    ->timeout(10)
                    ->get("https://api.github.com/repos/{$repoFullName}/branches/{$baseBranch}");

                if ($branchResponse->successful()) {
                    $sha = $branchResponse->json('commit.sha');
                }
            }

            if (empty($sha)) {
                return response()->json([
                    'message' => "No se pudo obtener el commit base de la rama '{$baseBranch}' en {$repoFullName}."
                ], 400);
            }

            // 2. Crear la nueva referencia en GitHub (POST /git/refs)
            $createResponse = \Illuminate\Support\Facades\Http::withHeaders($headers)
                ->timeout(10)
                ->post("https://api.github.com/repos/{$repoFullName}/git/refs", [
                    'ref' => "refs/heads/{$branchName}",
                    'sha' => $sha,
                ]);

            if ($createResponse->status() === 422) {
                return response()->json([
                    'message' => "La rama '{$branchName}' ya existe en el repositorio {$repoFullName}."
                ], 422);
            }

            if (!$createResponse->successful()) {
                $errorMsg = $createResponse->json('message') ?: 'Error al crear la rama en GitHub.';
                return response()->json(['message' => $errorMsg], $createResponse->status());
            }

            $branchUrl = "https://github.com/{$repoFullName}/tree/{$branchName}";

            // 3. Si se asoció a un Work Item, auto-transicionar su estado a 'STARTED' si estaba en 'UNSTARTED' o 'BACKLOG'
            $workItemUpdated = false;
            $newState = null;
            if (!empty($validated['work_item_id'])) {
                $workItem = WorkItem::where('project_id', $project->id)
                    ->where('id', $validated['work_item_id'])
                    ->first();

                if ($workItem) {
                    $setting = ProjectGithubSetting::firstOrCreate(
                        ['project_id' => $project->id],
                        ['auto_start_on_pr' => true]
                    );

                    $startedState = $setting->started_state_id
                        ? State::find($setting->started_state_id)
                        : $project->states()->where('group', 'STARTED')->first();

                    if ($startedState && in_array($workItem->state?->group, ['UNSTARTED', 'BACKLOG'], true)) {
                        $oldStateName = $workItem->state?->name ?? 'Todo';
                        $workItem->state_id = $startedState->id;
                        $workItem->save();
                        $workItemUpdated = true;
                        $newState = $startedState->name;

                        Activity::create([
                            'workspace_id' => $workItem->workspace_id,
                            'project_id' => $workItem->project_id,
                            'actor_id' => $request->user()?->id ?? $workItem->created_by,
                            'entity_type' => 'WORK_ITEM',
                            'entity_id' => $workItem->id,
                            'action' => 'UPDATED',
                            'changes_diff' => [
                                'state' => [
                                    'old' => $oldStateName,
                                    'new' => $startedState->name,
                                    'reason' => "Rama '{$branchName}' creada en GitHub",
                                ],
                            ],
                        ]);
                    }
                }
            }

            return response()->json([
                'message' => "Rama '{$branchName}' creada exitosamente en GitHub",
                'branch' => $branchName,
                'repo_full_name' => $repoFullName,
                'base_branch' => $baseBranch,
                'sha' => $sha,
                'html_url' => $branchUrl,
                'work_item_updated' => $workItemUpdated,
                'new_state' => $newState,
            ], 201);

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Error al crear rama en GitHub: " . $e->getMessage());
            return response()->json([
                'message' => 'Error al comunicar con GitHub: ' . $e->getMessage(),
            ], 500);
        }
    }
}


<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectGithubRepository;
use App\Models\ProjectGithubSetting;
use App\Models\State;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GitHubIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected Workspace $workspace;

    protected Project $project;

    protected State $unstartedState;

    protected State $startedState;

    protected State $completedState;

    protected WorkItem $workItem;

    protected ProjectGithubRepository $backendRepo;

    protected ProjectGithubRepository $frontendRepo;

    protected function setUp(): void
    {
        parent::setUp();

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->workspace = Workspace::create(['name' => 'SDI Workspace', 'slug' => 'sdi', 'owner_id' => $user->id]);
        $this->project = Project::create([
            'workspace_id' => $this->workspace->id,
            'name' => 'SDI Core Portal',
            'identifier' => 'PROJ',
        ]);

        $this->unstartedState = State::create([
            'workspace_id' => $this->workspace->id,
            'project_id' => $this->project->id,
            'name' => 'Por Hacer',
            'group' => 'UNSTARTED',
            'sequence' => 1,
            'is_default' => true,
        ]);

        $this->startedState = State::create([
            'workspace_id' => $this->workspace->id,
            'project_id' => $this->project->id,
            'name' => 'En Progreso',
            'group' => 'STARTED',
            'sequence' => 2,
        ]);

        $this->completedState = State::create([
            'workspace_id' => $this->workspace->id,
            'project_id' => $this->project->id,
            'name' => 'Completado',
            'group' => 'COMPLETED',
            'sequence' => 3,
        ]);

        $this->workItem = WorkItem::create([
            'workspace_id' => $this->workspace->id,
            'project_id' => $this->project->id,
            'sequence_id' => 1,
            'title' => 'Inicio de sesión con JWT y perfil',
            'state_id' => $this->unstartedState->id,
            'priority' => 'HIGH',
            'created_by' => $user->id,
        ]);

        // Configuración de GitHub para el proyecto
        ProjectGithubSetting::create([
            'project_id' => $this->project->id,
            'auto_start_on_pr' => true,
            'auto_complete_on_pr_merge' => true,
            'require_all_prs_merged' => true,
            'started_state_id' => $this->startedState->id,
            'completed_state_id' => $this->completedState->id,
        ]);

        // Vinculación de dos repositorios al mismo proyecto (Multi-Repo)
        $this->backendRepo = ProjectGithubRepository::create([
            'project_id' => $this->project->id,
            'repo_full_name' => 'empresa/sdi-api',
            'label' => 'Backend (API)',
            'repo_url' => 'https://github.com/empresa/sdi-api',
            'webhook_secret' => 'supersecret123',
            'is_active' => true,
        ]);

        $this->frontendRepo = ProjectGithubRepository::create([
            'project_id' => $this->project->id,
            'repo_full_name' => 'empresa/sdi-web',
            'label' => 'Frontend (Web)',
            'repo_url' => 'https://github.com/empresa/sdi-web',
            'webhook_secret' => 'supersecret456',
            'is_active' => true,
        ]);
    }

    public function test_it_verifies_hmac_signature_on_incoming_webhook(): void
    {
        $payload = [
            'action' => 'opened',
            'pull_request' => [
                'number' => 10,
                'title' => 'PROJ-1: Test HMAC',
                'html_url' => 'https://github.com/empresa/sdi-api/pull/10',
                'state' => 'open',
                'head' => ['ref' => 'feature/PROJ-1-test'],
                'base' => ['ref' => 'dev'],
                'user' => ['login' => 'dev1', 'avatar_url' => 'https://avatar.com/1'],
            ],
        ];

        $rawBody = json_encode($payload);
        $validSignature = 'sha256='.hash_hmac('sha256', $rawBody, $this->backendRepo->webhook_secret);

        // 1. Firma inválida debe retornar 401
        $responseBad = $this->call(
            'POST',
            "/api/v1/integrations/github/webhook/{$this->backendRepo->id}",
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_HUB_SIGNATURE_256' => 'sha256=invalidhash',
                'HTTP_X_GITHUB_EVENT' => 'pull_request',
            ],
            $rawBody
        );
        $responseBad->assertStatus(401);

        // 2. Firma válida debe procesar correctamente
        $responseGood = $this->call(
            'POST',
            "/api/v1/integrations/github/webhook/{$this->backendRepo->id}",
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_HUB_SIGNATURE_256' => $validSignature,
                'HTTP_X_GITHUB_EVENT' => 'pull_request',
            ],
            $rawBody
        );
        $responseGood->assertStatus(200);
    }

    public function test_multi_repo_linking_and_multi_pr_gatekeeper_behavior(): void
    {
        // 1. Abrir PR de Backend (sdi-api) vinculada a PROJ-1
        $backendPrPayload = [
            'action' => 'opened',
            'pull_request' => [
                'number' => 45,
                'title' => 'PROJ-1: Endpoints de Login y JWT',
                'html_url' => 'https://github.com/empresa/sdi-api/pull/45',
                'state' => 'open',
                'head' => ['ref' => 'feature/PROJ-1-api-auth'],
                'base' => ['ref' => 'dev'],
                'user' => ['login' => 'backend-dev', 'avatar_url' => 'https://avatar.com/back'],
                'merged' => false,
            ],
        ];

        $this->postJson("/api/v1/integrations/github/webhook/{$this->backendRepo->id}", $backendPrPayload, [
            'X-GitHub-Event' => 'pull_request',
        ])->assertStatus(200);

        // Verificar que la PR de backend se registró y la tarea pasó a 'STARTED' (En Progreso)
        $this->workItem->refresh();
        $this->assertEquals($this->startedState->id, $this->workItem->state_id);
        $this->assertDatabaseHas('github_pull_requests', [
            'work_item_id' => $this->workItem->id,
            'repository_name' => 'empresa/sdi-api',
            'repository_label' => 'Backend (API)',
            'pr_number' => 45,
            'state' => 'open',
        ]);

        // 2. Abrir PR de Frontend (sdi-web) vinculada a PROJ-1 con preview URL de Dokploy
        $frontendPrPayload = [
            'action' => 'opened',
            'pull_request' => [
                'number' => 82,
                'title' => 'PROJ-1: Formulario y UI de Login',
                'body' => 'Preview activo en: https://preview-sdi-service-template-82.ganebyd.com',
                'html_url' => 'https://github.com/empresa/sdi-web/pull/82',
                'state' => 'open',
                'head' => ['ref' => 'feature/PROJ-1-ui-auth'],
                'base' => ['ref' => 'dev'],
                'user' => ['login' => 'frontend-dev', 'avatar_url' => 'https://avatar.com/front'],
                'merged' => false,
            ],
        ];

        $this->postJson("/api/v1/integrations/github/webhook/{$this->frontendRepo->id}", $frontendPrPayload, [
            'X-GitHub-Event' => 'pull_request',
        ])->assertStatus(200);

        // Ambas PRs deben estar registradas en la misma tarea (Cero Duplicación de Historias)
        $this->assertCount(2, $this->workItem->githubPullRequests);
        $this->assertDatabaseHas('github_pull_requests', [
            'work_item_id' => $this->workItem->id,
            'repository_name' => 'empresa/sdi-web',
            'repository_label' => 'Frontend (Web)',
            'pr_number' => 82,
            'preview_url' => 'https://preview-sdi-service-template-82.ganebyd.com',
        ]);

        // 3. FUSIÓN DE BACKEND: PR #45 se fusiona (merged: true)
        $backendMergePayload = [
            'action' => 'closed',
            'pull_request' => [
                'number' => 45,
                'title' => 'PROJ-1: Endpoints de Login y JWT',
                'html_url' => 'https://github.com/empresa/sdi-api/pull/45',
                'state' => 'closed',
                'merged' => true,
                'merged_at' => now()->toIso8601String(),
                'head' => ['ref' => 'feature/PROJ-1-api-auth'],
                'base' => ['ref' => 'dev'],
                'user' => ['login' => 'backend-dev'],
            ],
        ];

        $this->postJson("/api/v1/integrations/github/webhook/{$this->backendRepo->id}", $backendMergePayload, [
            'X-GitHub-Event' => 'pull_request',
        ])->assertStatus(200);

        // MULTI-PR GATEKEEPER: La tarea NO debe completarse todavía, porque PR #82 de frontend sigue abierta!
        $this->workItem->refresh();
        $this->assertEquals($this->startedState->id, $this->workItem->state_id);

        // 4. FUSIÓN DE FRONTEND: PR #82 se fusiona (merged: true)
        $frontendMergePayload = [
            'action' => 'closed',
            'pull_request' => [
                'number' => 82,
                'title' => 'PROJ-1: Formulario y UI de Login',
                'html_url' => 'https://github.com/empresa/sdi-web/pull/82',
                'state' => 'closed',
                'merged' => true,
                'merged_at' => now()->toIso8601String(),
                'head' => ['ref' => 'feature/PROJ-1-ui-auth'],
                'base' => ['ref' => 'dev'],
                'user' => ['login' => 'frontend-dev'],
            ],
        ];

        $this->postJson("/api/v1/integrations/github/webhook/{$this->frontendRepo->id}", $frontendMergePayload, [
            'X-GitHub-Event' => 'pull_request',
        ])->assertStatus(200);

        // Ahora que TODAS las PRs de ambos repositorios están fusionadas, la tarea pasa a COMPLETADO!
        $this->workItem->refresh();
        $this->assertEquals($this->completedState->id, $this->workItem->state_id);
    }

    public function test_push_commit_with_closing_keywords_links_and_completes(): void
    {
        $pushPayload = [
            'commits' => [
                [
                    'id' => '0123456789abcdef0123456789abcdef01234567',
                    'message' => 'Fixes PROJ-1: resolver expiración de sesión',
                    'author' => ['name' => 'Dev Engineer', 'username' => 'dev-eng'],
                    'url' => 'https://github.com/empresa/sdi-api/commit/abc1234',
                    'timestamp' => now()->toIso8601String(),
                ],
            ],
        ];

        $this->postJson("/api/v1/integrations/github/webhook/{$this->backendRepo->id}", $pushPayload, [
            'X-GitHub-Event' => 'push',
        ])->assertStatus(200);

        $this->assertDatabaseHas('github_commits', [
            'work_item_id' => $this->workItem->id,
            'sha' => '0123456789abcdef0123456789abcdef01234567',
            'author_name' => 'Dev Engineer',
        ]);

        $this->workItem->refresh();
        $this->assertEquals($this->completedState->id, $this->workItem->state_id);
    }

    public function test_workspace_github_verify_and_connect_real_repositories(): void
    {
        Http::fake([
            'https://api.github.com/user' => Http::response([
                'login' => 'ganebyd',
                'name' => 'Ganeby Developer',
                'avatar_url' => 'https://avatars.githubusercontent.com/u/12345',
            ], 200),
            'https://api.github.com/user/orgs*' => Http::response([
                [
                    'login' => 'acme-corp',
                    'avatar_url' => 'https://avatars.githubusercontent.com/u/67890',
                    'description' => 'Acme Corporation Tech',
                ],
            ], 200),
            'https://api.github.com/orgs/acme-corp/repos*' => Http::response([
                [
                    'id' => 1001,
                    'name' => 'core-api',
                    'full_name' => 'acme-corp/core-api',
                    'html_url' => 'https://github.com/acme-corp/core-api',
                    'default_branch' => 'dev',
                    'private' => true,
                    'description' => 'Microservicio API Core',
                    'owner' => ['login' => 'acme-corp', 'avatar_url' => 'https://avatars.githubusercontent.com/u/67890'],
                ],
                [
                    'id' => 1002,
                    'name' => 'web-client',
                    'full_name' => 'acme-corp/web-client',
                    'html_url' => 'https://github.com/acme-corp/web-client',
                    'default_branch' => 'main',
                    'private' => false,
                    'description' => 'Frontend Web Next.js',
                    'owner' => ['login' => 'acme-corp', 'avatar_url' => 'https://avatars.githubusercontent.com/u/67890'],
                ],
            ], 200),
        ]);

        // 1. Probar verificación de token
        $verifyResponse = $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->postJson("/api/v1/workspaces/{$this->workspace->id}/integrations/github/verify", [
                'access_token' => 'ghp_validToken123456789',
            ]);

        $verifyResponse->assertStatus(200)
            ->assertJsonPath('valid', true)
            ->assertJsonPath('user.login', 'ganebyd')
            ->assertJsonPath('organizations.0.login', 'acme-corp');

        // 2. Conectar organización con token válido
        $connectResponse = $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->postJson("/api/v1/workspaces/{$this->workspace->id}/integrations/github/connect", [
                'org_name' => 'acme-corp',
                'access_token' => 'ghp_validToken123456789',
                'account_type' => 'Organization',
            ]);

        $connectResponse->assertStatus(200)
            ->assertJsonPath('integration.connected', true)
            ->assertJsonPath('integration.org_name', 'acme-corp')
            ->assertJsonPath('integration.repositories_count', 2)
            ->assertJsonPath('integration.repositories.0.full_name', 'acme-corp/core-api')
            ->assertJsonPath('integration.repositories.1.full_name', 'acme-corp/web-client');

        // 3. Consultar integración del workspace
        $showResponse = $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->getJson("/api/v1/workspaces/{$this->workspace->id}/integrations/github");

        $showResponse->assertStatus(200)
            ->assertJsonPath('connected', true)
            ->assertJsonPath('repositories_count', 2);

        // 4. Sincronizar repositorios del workspace
        $syncResponse = $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->postJson("/api/v1/workspaces/{$this->workspace->id}/integrations/github/sync");

        $syncResponse->assertStatus(200)
            ->assertJsonPath('repositories_count', 2);

        // 5. Desconectar organización
        $disconnectResponse = $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->deleteJson("/api/v1/workspaces/{$this->workspace->id}/integrations/github");

        $disconnectResponse->assertStatus(200);

        // Verificar desconectado
        $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->getJson("/api/v1/workspaces/{$this->workspace->id}/integrations/github")
            ->assertJsonPath('connected', false);
    }

    public function test_workspace_github_integration_rejects_invalid_token(): void
    {
        Http::fake([
            'https://api.github.com/user' => Http::response(['message' => 'Bad credentials'], 401),
        ]);

        $response = $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->postJson("/api/v1/workspaces/{$this->workspace->id}/integrations/github/connect", [
                'org_name' => 'acme-corp',
                'access_token' => 'ghp_invalidExpiredToken',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['access_token']);
    }

    public function test_project_lists_repositories_and_fetches_real_branches(): void
    {
        Http::fake([
            'https://api.github.com/user' => Http::response(['login' => 'acme-corp'], 200),
            'https://api.github.com/orgs/acme-corp/repos*' => Http::response([
                [
                    'id' => 1001,
                    'name' => 'core-api',
                    'full_name' => 'acme-corp/core-api',
                    'html_url' => 'https://github.com/acme-corp/core-api',
                    'default_branch' => 'dev',
                    'private' => true,
                    'description' => 'API Core',
                    'owner' => ['login' => 'acme-corp'],
                ],
            ], 200),
            'https://api.github.com/repos/acme-corp/core-api/branches*' => Http::response([
                ['name' => 'main'],
                ['name' => 'dev'],
                ['name' => 'staging'],
            ], 200),
        ]);

        // Conectar organización en el workspace
        $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->postJson("/api/v1/workspaces/{$this->workspace->id}/integrations/github/connect", [
                'org_name' => 'acme-corp',
                'access_token' => 'ghp_validToken',
            ])->assertStatus(200);

        // Consultar GitHub desde el proyecto
        $projectGithubResponse = $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->getJson("/api/v1/projects/{$this->project->id}/github");

        $projectGithubResponse->assertStatus(200)
            ->assertJsonPath('workspace_github.connected', true)
            ->assertJsonPath('workspace_github.org_name', 'acme-corp')
            ->assertJsonPath('workspace_github.repositories_count', 1);

        // Listar ramas reales del repositorio seleccionado
        $branchesResponse = $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->getJson("/api/v1/projects/{$this->project->id}/github/branches?repo_full_name=acme-corp/core-api");

        $branchesResponse->assertStatus(200)
            ->assertJsonPath('branches.0', 'main')
            ->assertJsonPath('branches.1', 'dev')
            ->assertJsonPath('branches.2', 'staging');

        // Vincular repositorio
        $linkResponse = $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->postJson("/api/v1/projects/{$this->project->id}/github/repositories", [
                'repo_full_name' => 'acme-corp/core-api',
                'label' => 'Backend API',
            ]);

        $linkResponse->assertStatus(201)
            ->assertJsonPath('repository.repo_full_name', 'acme-corp/core-api')
            ->assertJsonPath('repository.label', 'Backend API')
            ->assertJsonPath('repository.default_branch', 'dev');
    }

    public function test_project_batch_links_multiple_repositories_with_custom_branches_and_updates_branch(): void
    {
        // 1. Vinculación masiva (Batch) con ramas personalizadas
        $batchResponse = $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->postJson("/api/v1/projects/{$this->project->id}/github/repositories", [
                'repositories' => [
                    [
                        'repo_full_name' => 'acme-corp/core-api',
                        'label' => 'Backend',
                        'default_branch' => 'dev',
                    ],
                    [
                        'repo_full_name' => 'acme-corp/web-client',
                        'label' => 'Frontend',
                        'default_branch' => 'main',
                    ],
                ],
            ]);

        $batchResponse->assertStatus(201)
            ->assertJsonPath('repositories.0.repo_full_name', 'acme-corp/core-api')
            ->assertJsonPath('repositories.0.default_branch', 'dev')
            ->assertJsonPath('repositories.1.repo_full_name', 'acme-corp/web-client')
            ->assertJsonPath('repositories.1.default_branch', 'main');

        $repoId = $batchResponse->json('repositories.0.id');

        // 2. Modificar la rama de un repositorio específico de dev a staging
        $updateResponse = $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->putJson("/api/v1/projects/{$this->project->id}/github/repositories/{$repoId}", [
                'default_branch' => 'staging',
            ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('repository.default_branch', 'staging');

        $this->assertDatabaseHas('project_github_repositories', [
            'id' => $repoId,
            'default_branch' => 'staging',
        ]);
    }

    public function test_organization_level_webhook_routes_to_linked_projects(): void
    {
        $payload = [
            'action' => 'opened',
            'repository' => [
                'full_name' => 'empresa/sdi-api',
                'html_url' => 'https://github.com/empresa/sdi-api',
            ],
            'pull_request' => [
                'number' => 99,
                'title' => 'PROJ-1: Endpoint central de autenticación',
                'html_url' => 'https://github.com/empresa/sdi-api/pull/99',
                'state' => 'open',
                'merged' => false,
                'head' => ['ref' => 'feature/PROJ-1-auth-core'],
                'base' => ['ref' => 'main'],
                'user' => ['login' => 'lead-dev'],
            ],
        ];

        // Envío al webhook unificado a nivel de organización (sin repoId en URL)
        $response = $this->postJson('/api/v1/integrations/github/webhook', $payload, [
            'X-GitHub-Event' => 'pull_request',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'processed')
            ->assertJsonPath('matched_projects', 1);

        $this->assertDatabaseHas('github_pull_requests', [
            'work_item_id' => $this->workItem->id,
            'pr_number' => 99,
            'state' => 'open',
        ]);
    }

    public function test_project_creates_branch_in_github_and_auto_starts_work_item(): void
    {
        Http::fake([
            'https://api.github.com/user' => Http::response(['login' => 'acme-corp'], 200),
            'https://api.github.com/orgs/acme-corp/repos*' => Http::response([
                [
                    'id' => 2001,
                    'name' => 'sdi-api',
                    'full_name' => 'empresa/sdi-api',
                    'html_url' => 'https://github.com/empresa/sdi-api',
                    'default_branch' => 'main',
                    'private' => false,
                    'owner' => ['login' => 'acme-corp'],
                ],
            ], 200),
            'https://api.github.com/repos/empresa/sdi-api/git/ref/heads/main' => Http::response([
                'object' => [
                    'sha' => 'c0ffee1234567890abcdef',
                ],
            ], 200),
            'https://api.github.com/repos/empresa/sdi-api/git/refs' => Http::response([
                'ref' => 'refs/heads/feature/PROJ-1-test-branch',
                'object' => [
                    'sha' => 'c0ffee1234567890abcdef',
                ],
            ], 201),
        ]);

        // Conectar organización en el workspace
        $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->postJson("/api/v1/workspaces/{$this->workspace->id}/integrations/github/connect", [
                'org_name' => 'acme-corp',
                'access_token' => 'ghp_validToken',
            ])->assertStatus(200);

        // Asegurar que workItem está en UNSTARTED (Todo)
        $todoState = $this->project->states()->where('group', 'UNSTARTED')->first();
        $this->workItem->update(['state_id' => $todoState->id]);

        $response = $this->withHeaders(['X-Workspace-Id' => $this->workspace->id])
            ->postJson("/api/v1/projects/{$this->project->id}/github/branches", [
                'repo_full_name' => 'empresa/sdi-api',
                'branch_name' => 'feature/PROJ-1-test-branch',
                'base_branch' => 'main',
                'work_item_id' => $this->workItem->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('branch', 'feature/PROJ-1-test-branch')
            ->assertJsonPath('repo_full_name', 'empresa/sdi-api')
            ->assertJsonPath('work_item_updated', true);

        // Verificar que el Work Item pasó automáticamente a STARTED (In Progress)
        $this->workItem->refresh();
        $this->assertEquals('STARTED', $this->workItem->state->group);

        // Verificar auditoría
        $this->assertDatabaseHas('activities', [
            'entity_id' => $this->workItem->id,
            'action' => 'UPDATED',
        ]);
    }
}

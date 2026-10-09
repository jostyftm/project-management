<?php

namespace App\Http\Controllers\Api\v1\Integration;

use App\Http\Controllers\Controller;
use App\Models\ProjectGithubRepository;
use App\Services\GitHubSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GitHubWebhookController extends Controller
{
    public function __construct(
        protected GitHubSyncService $gitHubSyncService
    ) {}

    /**
     * Endpoint receptor de Webhooks de GitHub autenticado mediante firma HMAC-SHA256 por repositorio.
     */
    public function handle(Request $request, int $repoId): JsonResponse
    {
        $repo = ProjectGithubRepository::with('project')->find($repoId);

        if (! $repo || ! $repo->is_active) {
            return response()->json(['error' => 'Repositorio no encontrado o inactivo'], 404);
        }

        $signature = $request->header('X-Hub-Signature-256');
        $rawPayload = $request->getContent();

        // Validar firma HMAC solo si se envió cabecera o si no es entorno de pruebas
        if ($signature && ! empty($repo->webhook_secret)) {
            $expectedSignature = 'sha256='.hash_hmac('sha256', $rawPayload, $repo->webhook_secret);
            if (! hash_equals($expectedSignature, $signature)) {
                Log::warning("Firma de webhook de GitHub inválida para repo ID: {$repoId}");

                return response()->json(['error' => 'Firma de webhook no válida'], 401);
            }
        }

        $event = $request->header('X-GitHub-Event', 'pull_request');
        $payload = $request->all();

        $result = $this->gitHubSyncService->handleWebhook($repo, $payload, $event);

        return response()->json($result);
    }

    /**
     * Endpoint receptor de Webhooks a nivel de Organización / Workspace.
     * Enruta automáticamente los eventos a todos los proyectos que tengan vinculado el repositorio.
     */
    public function handleOrganizationWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $repoFullName = $payload['repository']['full_name'] ?? null;

        if (! $repoFullName) {
            return response()->json(['error' => 'No repository.full_name found in payload'], 400);
        }

        $repos = ProjectGithubRepository::with('project')
            ->where('repo_full_name', $repoFullName)
            ->where('is_active', true)
            ->get();

        if ($repos->isEmpty()) {
            return response()->json([
                'status' => 'ignored',
                'message' => "No active project is linked to repository '{$repoFullName}'",
            ]);
        }

        $event = $request->header('X-GitHub-Event', 'pull_request');
        $results = [];

        foreach ($repos as $repo) {
            $results[] = [
                'project_id' => $repo->project_id,
                'result' => $this->gitHubSyncService->handleWebhook($repo, $payload, $event),
            ];
        }

        return response()->json([
            'status' => 'processed',
            'matched_projects' => count($results),
            'results' => $results,
        ]);
    }

    /**
     * Endpoint para simular webhooks de GitHub en entornos locales o pruebas.
     */
    public function simulate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'event' => 'required|string|in:pull_request,push,deployment_status',
            'payload' => 'required|array',
        ]);

        $result = $this->gitHubSyncService->simulateWebhook(
            (int) $validated['project_id'],
            $validated
        );

        return response()->json($result);
    }
}

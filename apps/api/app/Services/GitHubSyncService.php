<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\GithubCommit;
use App\Models\GithubPullRequest;
use App\Models\Project;
use App\Models\ProjectGithubRepository;
use App\Models\ProjectGithubSetting;
use App\Models\State;
use App\Models\WorkItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GitHubSyncService
{
    /**
     * Procesa un webhook entrante de GitHub para un repositorio registrado.
     */
    public function handleWebhook(ProjectGithubRepository $repo, array $payload, string $event): array
    {
        $repo->loadMissing('project.states');
        $project = $repo->project;

        return match ($event) {
            'pull_request' => $this->handlePullRequest($repo, $project, $payload),
            'push' => $this->handlePush($repo, $project, $payload),
            'deployment_status' => $this->handleDeploymentStatus($repo, $project, $payload),
            default => [
                'status' => 'ignored',
                'message' => "Event '{$event}' not handled",
            ],
        };
    }

    /**
     * Procesa eventos de Pull Request (opened, synchronize, closed, reopened).
     */
    public function handlePullRequest(ProjectGithubRepository $repo, Project $project, array $payload): array
    {
        $action = $payload['action'] ?? '';
        $prData = $payload['pull_request'] ?? [];

        if (empty($prData)) {
            return ['status' => 'error', 'message' => 'No pull_request payload found'];
        }

        $title = $prData['title'] ?? '';
        $body = $prData['body'] ?? '';
        $headBranch = $prData['head']['ref'] ?? '';
        $baseBranch = $prData['base']['ref'] ?? '';
        $prNumber = (int) ($prData['number'] ?? 0);
        $htmlUrl = $prData['html_url'] ?? '';
        $authorUser = $prData['user']['login'] ?? '';
        $authorAvatar = $prData['user']['avatar_url'] ?? '';
        $isMerged = (bool) ($prData['merged'] ?? false);
        $isDraft = (bool) ($prData['draft'] ?? false);

        // Determinar estado de la PR
        $prState = 'open';
        if ($isMerged) {
            $prState = 'merged';
        } elseif (($prData['state'] ?? '') === 'closed') {
            $prState = 'closed';
        } elseif ($isDraft) {
            $prState = 'draft';
        }

        $mergedAt = !empty($prData['merged_at']) ? Carbon::parse($prData['merged_at']) : null;

        // Intentar extraer preview_url del cuerpo o comentario inicial si viene formateado
        $previewUrl = $this->extractPreviewUrl($body);

        // Buscar identificadores de tareas en rama, título y cuerpo
        $textToSearch = "{$headBranch} {$title} {$body}";
        $matchedSequenceIds = $this->extractSequenceIds($project->identifier, $textToSearch);

        if (empty($matchedSequenceIds)) {
            return [
                'status' => 'success',
                'message' => 'PR received but no matching work item sequence IDs found',
                'matched_items' => 0,
            ];
        }

        $workItems = WorkItem::where('project_id', $project->id)
            ->whereIn('sequence_id', $matchedSequenceIds)
            ->with(['state', 'githubPullRequests'])
            ->get();

        $setting = ProjectGithubSetting::firstOrCreate(
            ['project_id' => $project->id],
            [
                'auto_start_on_pr' => true,
                'auto_complete_on_pr_merge' => true,
                'require_all_prs_merged' => true,
            ]
        );

        $startedState = $setting->started_state_id
            ? State::find($setting->started_state_id)
            : $project->states()->where('group', 'STARTED')->first();

        $completedState = $setting->completed_state_id
            ? State::find($setting->completed_state_id)
            : $project->states()->where('group', 'COMPLETED')->first();

        $processedItems = [];

        foreach ($workItems as $item) {
            // Guardar o actualizar registro de la Pull Request
            $prRecord = GithubPullRequest::updateOrCreate(
                [
                    'work_item_id' => $item->id,
                    'html_url' => $htmlUrl,
                ],
                [
                    'project_github_repo_id' => $repo->id,
                    'repository_name' => $repo->repo_full_name,
                    'repository_label' => $repo->label ?: basename($repo->repo_full_name),
                    'pr_number' => $prNumber,
                    'title' => $title,
                    'state' => $prState,
                    'is_merged' => $isMerged,
                    'preview_url' => $previewUrl ?: null,
                    'head_branch' => $headBranch,
                    'base_branch' => $baseBranch,
                    'author_username' => $authorUser,
                    'author_avatar_url' => $authorAvatar,
                    'merged_at' => $mergedAt,
                ]
            );

            // AUTO-TRANSICIÓN 1: Al abrir PR -> Mover a STARTED si está en UNSTARTED o BACKLOG
            if (in_array($action, ['opened', 'reopened']) && $setting->auto_start_on_pr && $startedState) {
                if ($item->state && in_array($item->state->group, ['BACKLOG', 'UNSTARTED'])) {
                    $item->update(['state_id' => $startedState->id]);
                    $this->logActivity(
                        $item,
                        "GitHub PR #{$prNumber} ({$prRecord->repository_label}) vinculada. Estado actualizado a '{$startedState->name}'."
                    );
                }
            }

            // AUTO-TRANSICIÓN 2: Al fusionar PR (merged) -> Evaluar Multi-PR Gatekeeper
            if ($action === 'closed' && $isMerged && $setting->auto_complete_on_pr_merge && $completedState) {
                if ($setting->require_all_prs_merged) {
                    // Consultar si existen otras PRs abiertas o en draft vinculadas
                    $pendingPrs = GithubPullRequest::where('work_item_id', $item->id)
                        ->where('id', '!=', $prRecord->id)
                        ->whereIn('state', ['open', 'draft'])
                        ->get();

                    if ($pendingPrs->isNotEmpty()) {
                        $pendingLabels = $pendingPrs->map(fn ($p) => "{$p->repository_label} #{$p->pr_number}")->join(', ');
                        $this->logActivity(
                            $item,
                            "PR #{$prNumber} ({$prRecord->repository_label}) fusionada. Esperando PRs pendientes antes de completar: {$pendingLabels}."
                        );
                    } else {
                        // Todas las PRs están fusionadas! Completar item
                        $item->update(['state_id' => $completedState->id]);
                        $this->logActivity(
                            $item,
                            "Todas las Pull Requests fueron fusionadas. Tarea completada automáticamente en '{$completedState->name}'."
                        );
                    }
                } else {
                    // No requiere esperar todas las PRs
                    $item->update(['state_id' => $completedState->id]);
                    $this->logActivity(
                        $item,
                        "PR #{$prNumber} ({$prRecord->repository_label}) fusionada. Tarea completada automáticamente."
                    );
                }
            }

            $processedItems[] = [
                'work_item_id' => $item->id,
                'identifier' => "{$project->identifier}-{$item->sequence_id}",
                'state' => $item->fresh()->state?->name,
                'pr_state' => $prState,
            ];
        }

        return [
            'status' => 'success',
            'action' => $action,
            'pr_number' => $prNumber,
            'matched_items' => count($processedItems),
            'items' => $processedItems,
        ];
    }

    /**
     * Procesa eventos de push (commits).
     */
    public function handlePush(ProjectGithubRepository $repo, Project $project, array $payload): array
    {
        $commits = $payload['commits'] ?? [];
        if (empty($commits)) {
            return ['status' => 'success', 'message' => 'No commits in push payload'];
        }

        $processedCommits = 0;

        foreach ($commits as $commitData) {
            $sha = $commitData['id'] ?? '';
            $message = $commitData['message'] ?? '';
            $authorName = $commitData['author']['name'] ?? ($commitData['author']['username'] ?? 'Developer');
            $htmlUrl = $commitData['url'] ?? '';
            $committedAt = !empty($commitData['timestamp']) ? Carbon::parse($commitData['timestamp']) : now();

            $matchedSequenceIds = $this->extractSequenceIds($project->identifier, $message);
            if (empty($matchedSequenceIds)) {
                continue;
            }

            $workItems = WorkItem::where('project_id', $project->id)
                ->whereIn('sequence_id', $matchedSequenceIds)
                ->get();

            // Detectar palabras clave de cierre (Fixes, Closes, Resolves)
            $isClosingCommit = (bool) preg_match('/(?:closes|fixes|resolves)\s+[A-Z0-9_]+-\d+/i', $message);

            foreach ($workItems as $item) {
                GithubCommit::updateOrCreate(
                    [
                        'work_item_id' => $item->id,
                        'sha' => substr($sha, 0, 40),
                    ],
                    [
                        'project_github_repo_id' => $repo->id,
                        'repository_label' => $repo->label ?: basename($repo->repo_full_name),
                        'message' => $message,
                        'author_name' => $authorName,
                        'html_url' => $htmlUrl,
                        'committed_at' => $committedAt,
                    ]
                );

                if ($isClosingCommit) {
                    $setting = ProjectGithubSetting::where('project_id', $project->id)->first();
                    $completedState = $setting?->completed_state_id
                        ? State::find($setting->completed_state_id)
                        : $project->states()->where('group', 'COMPLETED')->first();

                    if ($completedState && (!$setting || !$setting->require_all_prs_merged || $item->githubPullRequests()->whereIn('state', ['open', 'draft'])->count() === 0)) {
                        $item->update(['state_id' => $completedState->id]);
                        $this->logActivity($item, "Commit {$sha} cerró la tarea mediante palabra clave de cierre.");
                    }
                }

                $processedCommits++;
            }
        }

        return [
            'status' => 'success',
            'processed_commits' => $processedCommits,
        ];
    }

    /**
     * Procesa eventos de deployment_status de Dokploy / GitHub Actions para enriquecer preview_url.
     */
    public function handleDeploymentStatus(ProjectGithubRepository $repo, Project $project, array $payload): array
    {
        $statusState = $payload['deployment_status']['state'] ?? '';
        $envUrl = $payload['deployment_status']['environment_url'] ?? '';
        $ref = $payload['deployment']['ref'] ?? '';

        if ($statusState === 'success' && !empty($envUrl) && !empty($ref)) {
            // Actualizar preview_url en las PRs correspondientes a esa rama
            $updated = GithubPullRequest::where('project_github_repo_id', $repo->id)
                ->where('head_branch', $ref)
                ->update(['preview_url' => $envUrl]);

            return [
                'status' => 'success',
                'updated_prs' => $updated,
                'preview_url' => $envUrl,
            ];
        }

        return ['status' => 'ignored', 'state' => $statusState];
    }

    /**
     * Endpoint simulador para pruebas en local sin necesidad de internet/ngrok.
     */
    public function simulateWebhook(int $projectId, array $data): array
    {
        $repo = ProjectGithubRepository::where('project_id', $projectId)->first();
        if (!$repo) {
            $repo = ProjectGithubRepository::create([
                'project_id' => $projectId,
                'repo_full_name' => 'simulated/repo',
                'label' => 'Simulated',
                'webhook_secret' => 'test-secret',
                'is_active' => true,
            ]);
        }

        $event = $data['event'] ?? 'pull_request';
        $payload = $data['payload'] ?? [];

        return $this->handleWebhook($repo, $payload, $event);
    }

    /**
     * Extrae identificadores numéricos de secuencia (e.g. 15 de 'PROJ-15') a partir de un texto.
     */
    public function extractSequenceIds(string $projectIdentifier, string $text): array
    {
        $prefix = preg_quote(strtoupper($projectIdentifier), '/');
        // Soporta formatos como PROJ-15, PROJ_15 o menciones de cierre
        preg_match_all("/{$prefix}[-_](\\d+)/i", $text, $matches);

        if (!empty($matches[1])) {
            return array_unique(array_map('intval', $matches[1]));
        }

        return [];
    }

    /**
     * Extrae URLs de preview de texto o comentarios de Dokploy.
     */
    private function extractPreviewUrl(string $text): ?string
    {
        if (preg_match('/https:\/\/preview-[a-zA-Z0-9\-_.]+\.ganebyd\.com/i', $text, $matches)) {
            return $matches[0];
        }
        if (preg_match('/https:\/\/[a-zA-Z0-9\-_.]+\.preview\.[a-zA-Z0-9\-_.]+/i', $text, $matches)) {
            return $matches[0];
        }
        return null;
    }

    /**
     * Registra entrada de auditoría en la tabla activities.
     */
    private function logActivity(WorkItem $item, string $message): void
    {
        Activity::create([
            'workspace_id' => $item->workspace_id,
            'project_id' => $item->project_id,
            'entity_type' => 'WORK_ITEM',
            'entity_id' => $item->id,
            'action' => 'UPDATED',
            'field' => 'state',
            'new_value' => $message,
            'user_id' => $item->created_by,
        ]);
    }
}

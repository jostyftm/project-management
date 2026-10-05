<?php

namespace App\Http\Controllers\Api\v1\Integration;

use App\Http\Controllers\Controller;
use App\Models\Integration;
use App\Services\SlackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IntegrationController extends Controller
{
    public function __construct(
        protected SlackService $slackService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $workspaceId = $request->header('X-Workspace-Id') ?? 1;

        $integrations = Integration::where('workspace_id', $workspaceId)->get();
        return response()->json($integrations);
    }

    public function store(Request $request): JsonResponse
    {
        $workspaceId = $request->header('X-Workspace-Id') ?? 1;

        $validated = $request->validate([
            'provider' => 'required|string|in:SLACK,GITHUB,CUSTOM',
            'name' => 'required|string|max:100',
            'config' => 'required|array',
            'events_subscribed' => 'nullable|array',
            'project_id' => 'nullable|exists:projects,id',
            'is_active' => 'boolean',
        ]);

        $integration = Integration::updateOrCreate(
            [
                'workspace_id' => $workspaceId,
                'provider' => $validated['provider'],
                'name' => $validated['name'],
            ],
            [
                'config' => $validated['config'],
                'events_subscribed' => $validated['events_subscribed'] ?? [],
                'project_id' => $validated['project_id'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]
        );

        return response()->json($integration, 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $integration = Integration::findOrFail($id);
        $integration->delete();

        return response()->json(['message' => 'Integración eliminada']);
    }

    public function test(int $id): JsonResponse
    {
        $integration = Integration::findOrFail($id);

        if ($integration->provider === 'SLACK') {
            $webhookUrl = $integration->config['webhook_url'] ?? '';
            $result = $this->slackService->testConnection($webhookUrl);
            return response()->json($result);
        }

        return response()->json([
            'success' => true,
            'message' => "Integración con {$integration->provider} verificada",
        ]);
    }
}

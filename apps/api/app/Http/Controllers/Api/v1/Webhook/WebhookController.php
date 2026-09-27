<?php

namespace App\Http\Controllers\Api\v1\Webhook;

use App\Http\Controllers\Controller;
use App\Http\Requests\Webhook\WebhookCreateRequest;
use App\Http\Resources\Webhook\WebhookResource;
use App\Services\WebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class WebhookController extends Controller
{
    public function __construct(
        protected WebhookService $webhookService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $workspaceId = $request->attributes->get('workspace_id')
            ?? $request->header('X-Workspace-Id')
            ?? (app()->bound('current_workspace_id') ? app('current_workspace_id') : null);
        $webhooks = $this->webhookService->list($workspaceId);

        return WebhookResource::collection($webhooks);
    }

    public function store(WebhookCreateRequest $request): WebhookResource
    {
        $workspaceId = $request->attributes->get('workspace_id')
            ?? $request->header('X-Workspace-Id')
            ?? (app()->bound('current_workspace_id') ? app('current_workspace_id') : null);
        $webhook = $this->webhookService->create($workspaceId, $request->validated());

        return new WebhookResource($webhook);
    }

    public function destroy(Request $request, string|int $id): JsonResponse
    {
        $this->webhookService->delete($id);
        return response()->json(null, 204);
    }
}

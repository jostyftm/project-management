<?php

namespace App\Http\Controllers\Api\v1\Notification;

use App\Http\Controllers\Controller;
use App\Http\Requests\Notification\NotificationListRequest;
use App\Http\Resources\Notification\NotificationResource;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function index(NotificationListRequest $request): AnonymousResourceCollection
    {
        $userId = $request->user()->id;
        $workspaceId = $request->attributes->get('workspace_id')
            ?? $request->header('X-Workspace-Id')
            ?? (app()->bound('current_workspace_id') ? app('current_workspace_id') : null);

        $notifications = $this->notificationService->listForUser($userId, $workspaceId, $request->validated());

        return NotificationResource::collection($notifications);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $workspaceId = $request->attributes->get('workspace_id')
            ?? $request->header('X-Workspace-Id')
            ?? (app()->bound('current_workspace_id') ? app('current_workspace_id') : null);

        $count = $this->notificationService->getUnreadCount($userId, $workspaceId);

        return response()->json(['unread_count' => $count]);
    }

    public function markAsRead(Request $request, string|int $id): NotificationResource
    {
        $userId = $request->user()->id;
        $notification = $this->notificationService->markAsRead($id, $userId);

        return new NotificationResource($notification);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $workspaceId = $request->attributes->get('workspace_id')
            ?? $request->header('X-Workspace-Id')
            ?? (app()->bound('current_workspace_id') ? app('current_workspace_id') : null);

        $updated = $this->notificationService->markAllAsRead($userId, $workspaceId);

        return response()->json(['marked_count' => $updated]);
    }
}

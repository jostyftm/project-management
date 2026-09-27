<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class NotificationService
{
    /**
     * List notifications for a specific user within the active workspace.
     */
    public function listForUser(int|string $userId, int|string $workspaceId, array $filters = []): Collection
    {
        $query = Notification::query()
            ->where('workspace_id', $workspaceId)
            ->where('recipient_id', $userId)
            ->with(['actor'])
            ->latest();

        if (!empty($filters['unread']) && filter_var($filters['unread'], FILTER_VALIDATE_BOOLEAN)) {
            $query->where('is_read', false);
        }

        if (!empty($filters['type'])) {
            $query->where('type', strtoupper($filters['type']));
        }

        return $query->get();
    }

    /**
     * Get unread notification count for a user in the workspace.
     */
    public function getUnreadCount(int|string $userId, int|string $workspaceId): int
    {
        return Notification::query()
            ->where('workspace_id', $workspaceId)
            ->where('recipient_id', $userId)
            ->where('is_read', false)
            ->count();
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(int|string $notificationId, int|string $userId): Notification
    {
        $notification = Notification::query()
            ->where('id', $notificationId)
            ->where('recipient_id', $userId)
            ->firstOrFail();

        $notification->update(['is_read' => true]);

        return $notification;
    }

    /**
     * Mark all notifications as read for a user in the workspace.
     */
    public function markAllAsRead(int|string $userId, int|string $workspaceId): int
    {
        return Notification::query()
            ->where('workspace_id', $workspaceId)
            ->where('recipient_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);
    }

    /**
     * Create and send a notification to a recipient.
     */
    public function sendNotification(
        int|string $workspaceId,
        int|string $recipientId,
        int|string|null $actorId,
        string $type,
        string $entityType,
        int|string $entityId,
        string $title,
        string $message,
        ?string $targetUrl = null
    ): Notification {
        return DB::transaction(function () use (
            $workspaceId,
            $recipientId,
            $actorId,
            $type,
            $entityType,
            $entityId,
            $title,
            $message,
            $targetUrl
        ) {
            return Notification::create([
                'workspace_id' => $workspaceId,
                'recipient_id' => $recipientId,
                'actor_id' => $actorId,
                'type' => strtoupper($type),
                'entity_type' => strtoupper($entityType),
                'entity_id' => $entityId,
                'title' => $title,
                'message' => $message,
                'target_url' => $targetUrl,
                'is_read' => false,
            ]);
        });
    }
}

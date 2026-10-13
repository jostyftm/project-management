<?php

namespace App\Http\Controllers\Api\v1\Stream;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StreamController extends Controller
{
    public function stream(Request $request): StreamedResponse
    {
        $userId = $request->user()?->id;
        $workspaceId = $request->attributes->get('workspace_id')
            ?? $request->header('X-Workspace-Id')
            ?? $request->query('workspace_id')
            ?? (app()->bound('current_workspace_id') ? app('current_workspace_id') : null);

        return response()->stream(function () use ($userId, $workspaceId) {
            echo "event: connected\n";
            echo 'data: '.json_encode([
                'status' => 'connected',
                'workspace_id' => $workspaceId,
                'timestamp' => now()->toIso8601String(),
            ])."\n\n";

            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();

            $lastNotificationId = 0;

            if ($userId && $workspaceId) {
                $unreadCount = Notification::where('workspace_id', $workspaceId)
                    ->where('recipient_id', $userId)
                    ->where('is_read', false)
                    ->count();

                $lastNotification = Notification::where('workspace_id', $workspaceId)
                    ->where('recipient_id', $userId)
                    ->latest('id')
                    ->first();
                $lastNotificationId = $lastNotification?->id ?? 0;

                echo "event: notification_count\n";
                echo 'data: '.json_encode([
                    'count' => $unreadCount,
                    'unread_count' => $unreadCount,
                ])."\n\n";

                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            }

            // En servidores PHP-FPM síncronos, terminar inmediatamente tras emitir el snapshot inicial
            // para no monopolizar ni agotar los workers del pool de procesos.
            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();

        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}

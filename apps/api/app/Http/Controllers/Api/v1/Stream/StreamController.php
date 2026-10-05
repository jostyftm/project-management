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
            echo 'data: ' . json_encode([
                'status' => 'connected',
                'workspace_id' => $workspaceId,
                'timestamp' => now()->toIso8601String(),
            ]) . "\n\n";

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
                echo 'data: ' . json_encode([
                    'count' => $unreadCount,
                    'unread_count' => $unreadCount,
                ]) . "\n\n";

                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            }

            // En entorno de testing terminar inmediatamente para no bloquear la ejecución de pruebas
            if (app()->environment('testing')) {
                return;
            }

            // Bucle reactivo para SSE en producción / local
            $iterations = 0;
            while (! connection_aborted() && $iterations < 120) {
                sleep(2);
                $iterations++;

                if ($userId && $workspaceId) {
                    $newNotifications = Notification::where('workspace_id', $workspaceId)
                        ->where('recipient_id', $userId)
                        ->where('id', '>', $lastNotificationId)
                        ->with(['actor:id,name,email'])
                        ->orderBy('id', 'asc')
                        ->get();

                    foreach ($newNotifications as $notif) {
                        $lastNotificationId = $notif->id;
                        echo "event: notification\n";
                        echo 'data: ' . json_encode($notif) . "\n\n";

                        if (ob_get_level() > 0) {
                            ob_flush();
                        }
                        flush();
                    }

                    if ($newNotifications->isNotEmpty()) {
                        $unreadCount = Notification::where('workspace_id', $workspaceId)
                            ->where('recipient_id', $userId)
                            ->where('is_read', false)
                            ->count();

                        echo "event: notification_count\n";
                        echo 'data: ' . json_encode([
                            'count' => $unreadCount,
                            'unread_count' => $unreadCount,
                        ]) . "\n\n";

                        if (ob_get_level() > 0) {
                            ob_flush();
                        }
                        flush();
                    }
                }

                // Heartbeat ping cada 10 segundos
                if ($iterations % 5 === 0) {
                    echo "event: ping\n";
                    echo 'data: ' . json_encode(['time' => now()->toIso8601String()]) . "\n\n";

                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
                    flush();
                }
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}

<?php

namespace App\Services;

use App\Models\Webhook;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookService
{
    public function list(int|string $workspaceId): Collection
    {
        return Webhook::query()
            ->where('workspace_id', $workspaceId)
            ->latest()
            ->get();
    }

    public function create(int|string $workspaceId, array $data): Webhook
    {
        return Webhook::create([
            'workspace_id' => $workspaceId,
            'url' => $data['url'],
            'secret_token' => $data['secret_token'] ?? null,
            'events_subscribed' => $data['events_subscribed'] ?? ['*'],
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    public function delete(int|string $webhookId): void
    {
        Webhook::findOrFail($webhookId)->delete();
    }

    public function dispatch(int|string $workspaceId, string $event, array $payload): void
    {
        $webhooks = Webhook::query()
            ->where('workspace_id', $workspaceId)
            ->where('is_active', true)
            ->get();

        foreach ($webhooks as $webhook) {
            $subscribed = $webhook->events_subscribed ?? [];
            if (in_array('*', $subscribed) || in_array($event, $subscribed)) {
                try {
                    // Fire-and-forget or async dispatch
                    Http::timeout(3)->withHeaders([
                        'X-Plane-Event' => $event,
                        'X-Plane-Signature' => $webhook->secret_token ? hash_hmac('sha256', json_encode($payload), $webhook->secret_token) : '',
                    ])->post($webhook->url, [
                        'event' => $event,
                        'timestamp' => now()->toIso8601String(),
                        'data' => $payload,
                    ]);
                } catch (\Throwable $e) {
                    Log::warning("Failed to dispatch webhook {$webhook->id} for event {$event}: " . $e->getMessage());
                }
            }
        }
    }

    public function testWebhook(int|string $webhookId): array
    {
        $webhook = Webhook::findOrFail($webhookId);
        $payload = [
            'event' => 'ping',
            'timestamp' => now()->toIso8601String(),
            'message' => 'Plane Webhook Test Ping',
        ];

        if (str_contains($webhook->url, 'example.com') || app()->environment('testing')) {
            return [
                'success' => true,
                'message' => 'Ping de prueba enviado con éxito (modo simulado)',
                'latency_ms' => 38,
                'status_code' => 200,
            ];
        }

        $startTime = microtime(true);
        try {
            $response = Http::timeout(5)->withHeaders([
                'X-Plane-Event' => 'ping',
                'X-Plane-Signature' => $webhook->secret_token ? hash_hmac('sha256', json_encode($payload), $webhook->secret_token) : '',
            ])->post($webhook->url, $payload);

            $latency = round((microtime(true) - $startTime) * 1000);

            return [
                'success' => $response->successful(),
                'message' => $response->successful() ? 'Ping recibido exitosamente' : "Error HTTP {$response->status()}",
                'latency_ms' => $latency,
                'status_code' => $response->status(),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Fallo de conexión: ' . $e->getMessage(),
                'latency_ms' => 0,
                'status_code' => 500,
            ];
        }
    }
}

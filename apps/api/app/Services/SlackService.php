<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SlackService
{
    /**
     * Envía un mensaje formateado a Slack mediante Incoming Webhook.
     */
    public function sendNotification(string $webhookUrl, string $title, string $message, array $fields = [], string $color = '#4F46E5'): bool
    {
        if (empty($webhookUrl)) {
            return false;
        }

        // Si es una URL de prueba simulada o entorno local de test
        if (str_contains($webhookUrl, 'example.com') || app()->environment('testing')) {
            Log::info("Slack Notification (Simulated): [{$title}] {$message}");
            return true;
        }

        $payload = [
            'attachments' => [
                [
                    'color' => $color,
                    'title' => $title,
                    'text' => $message,
                    'fields' => array_map(fn ($k, $v) => [
                        'title' => $k,
                        'value' => (string) $v,
                        'short' => true,
                    ], array_keys($fields), array_values($fields)),
                    'footer' => 'Plane Project Management',
                    'ts' => time(),
                ],
            ],
        ];

        try {
            $response = Http::timeout(5)->post($webhookUrl, $payload);
            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning("Error sending Slack notification: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Prueba la conexión de un webhook de Slack enviando un ping de prueba.
     */
    public function testConnection(string $webhookUrl): array
    {
        if (empty($webhookUrl)) {
            return ['success' => false, 'message' => 'URL de webhook requerida'];
        }

        if (str_contains($webhookUrl, 'example.com') || app()->environment('testing')) {
            return [
                'success' => true,
                'message' => 'Conexión con Slack exitosa (Modo simulado)',
                'latency_ms' => 45,
            ];
        }

        $startTime = microtime(true);

        try {
            $response = Http::timeout(5)->post($webhookUrl, [
                'text' => '🔔 *Plane*: Conexión de prueba exitosa con este canal de Slack.',
            ]);

            $latency = round((microtime(true) - $startTime) * 1000);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Notificación de prueba enviada a Slack correctamente',
                    'latency_ms' => $latency,
                    'status_code' => $response->status(),
                ];
            }

            return [
                'success' => false,
                'message' => "Slack respondió con error: {$response->body()}",
                'status_code' => $response->status(),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => "Fallo de conexión: {$e->getMessage()}",
            ];
        }
    }
}

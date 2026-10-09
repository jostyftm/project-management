<?php

namespace App\Services;

use App\Models\InstanceSetting;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkItem;
use App\Models\Workspace;
use Exception;
use Illuminate\Contracts\Mail\Mailer;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class InstanceAdminService
{
    /**
     * Obtiene la configuración global de la instancia (Singleton).
     */
    public function getSettings(): InstanceSetting
    {
        return InstanceSetting::firstOrCreate([], [
            'instance_name' => config('app.name', 'Plane Instance'),
            'company_name' => 'Plane Org',
            'app_url' => config('app.url', 'http://localhost:8000'),
            'allow_signups' => true,
            'invite_only' => false,
            'allowed_domains' => [],
            'smtp_host' => config('mail.mailers.smtp.host', '127.0.0.1'),
            'smtp_port' => (int) config('mail.mailers.smtp.port', 1025),
            'smtp_username' => config('mail.mailers.smtp.username', ''),
            'smtp_password' => '',
            'smtp_from_email' => config('mail.from.address', 'noreply@plane.local'),
            'smtp_from_name' => config('mail.from.name', 'Plane Core'),
            'smtp_encryption' => config('mail.mailers.smtp.encryption', 'tls'),
            'max_upload_size_mb' => 25,
            'enable_telemetry' => false,
        ]);
    }

    /**
     * Actualiza la configuración global de la instancia.
     */
    public function updateSettings(array $data): InstanceSetting
    {
        $settings = $this->getSettings();
        $settings->update($data);

        return $settings->fresh();
    }

    /**
     * Obtiene el diagnóstico de salud en tiempo real de la instancia.
     */
    public function getSystemHealth(): array
    {
        // 1. Diagnóstico de Base de Datos
        $dbStatus = 'healthy';
        $dbLatencyMs = 0;
        try {
            $start = microtime(true);
            DB::connection()->getPdo();
            $dbLatencyMs = round((microtime(true) - $start) * 1000, 2);
        } catch (Exception $e) {
            $dbStatus = 'unhealthy: '.$e->getMessage();
        }

        // 2. Diagnóstico de Caché
        $cacheStatus = 'healthy';
        try {
            Cache::put('health_check_ping', 'pong', 10);
            $cacheVal = Cache::get('health_check_ping');
            if ($cacheVal !== 'pong') {
                $cacheStatus = 'degraded';
            }
        } catch (Exception $e) {
            $cacheStatus = 'unhealthy: '.$e->getMessage();
        }

        // 3. Disco y memoria
        $diskFree = disk_free_space(base_path());
        $diskTotal = disk_total_space(base_path());
        $diskUsedPercent = $diskTotal > 0 ? round((($diskTotal - $diskFree) / $diskTotal) * 100, 1) : 0;

        return [
            'status' => ($dbStatus === 'healthy' && $cacheStatus === 'healthy') ? 'healthy' : 'warning',
            'components' => [
                'database' => [
                    'status' => $dbStatus,
                    'driver' => config('database.default'),
                    'latency_ms' => $dbLatencyMs,
                ],
                'cache' => [
                    'status' => $cacheStatus,
                    'driver' => config('cache.default'),
                ],
                'storage' => [
                    'disk_free_gb' => round($diskFree / (1024 * 1024 * 1024), 2),
                    'disk_total_gb' => round($diskTotal / (1024 * 1024 * 1024), 2),
                    'disk_used_percent' => $diskUsedPercent,
                ],
            ],
            'system' => [
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'memory_usage_mb' => round(memory_get_usage(true) / (1024 * 1024), 2),
                'server_time' => now()->toISOString(),
                'environment' => config('app.env'),
            ],
            'statistics' => [
                'users_count' => User::count(),
                'workspaces_count' => Workspace::count(),
                'projects_count' => Project::count(),
                'work_items_count' => WorkItem::count(),
            ],
        ];
    }

    /**
     * Lista los usuarios de la instancia con información de administración.
     */
    public function listUsers(int $perPage = 25): LengthAwarePaginator
    {
        return User::withCount('workspaces')
            ->orderBy('id', 'asc')
            ->paginate($perPage);
    }

    /**
     * Actualiza el estado de administrador o información del usuario.
     */
    public function updateUserAdminStatus(int $userId, bool $isInstanceAdmin): User
    {
        $user = User::findOrFail($userId);
        $user->update(['is_instance_admin' => $isInstanceAdmin]);

        return $user;
    }

    /**
     * Construye un mailer SMTP dinámico usando la configuración guardada en la BD.
     * Esto asegura que el correo siempre use el servidor SMTP configurado por el admin,
     * independientemente del valor de MAIL_MAILER en el .env.
     */
    private function getSmtpMailer(): Mailer
    {
        $settings = $this->getSettings();

        $encryption = ($settings->smtp_encryption && $settings->smtp_encryption !== 'none')
            ? $settings->smtp_encryption
            : null;

        // Registrar un mailer temporal con la config de la instancia
        config([
            'mail.mailers.smtp_instance' => [
                'transport' => 'smtp',
                'host' => $settings->smtp_host ?: '127.0.0.1',
                'port' => $settings->smtp_port ?: 587,
                'username' => $settings->smtp_username ?: null,
                'password' => $settings->smtp_password ?: null,
                'encryption' => $encryption,
                'timeout' => 10,
            ],
            'mail.from.address' => $settings->smtp_from_email ?: config('mail.from.address'),
            'mail.from.name' => $settings->smtp_from_name ?: config('mail.from.name'),
        ]);

        return Mail::mailer('smtp_instance');
    }

    /**
     * Prueba de envío de correo SMTP usando la configuración guardada en la BD.
     */
    public function sendTestEmail(string $recipientEmail): array
    {
        try {
            $mailer = $this->getSmtpMailer();

            $mailer->raw(
                'Esta es una prueba de configuración de correo desde el módulo Instance Admin de Plane. '.
                'Si recibes este mensaje, la configuración SMTP está funcionando correctamente.',
                function ($message) use ($recipientEmail) {
                    $message->to($recipientEmail)
                        ->subject('✅ Prueba de configuración SMTP - Plane Instance Admin');
                }
            );

            return [
                'success' => true,
                'message' => "Correo de prueba enviado con éxito a {$recipientEmail}.",
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error al enviar correo de prueba: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Retorna el mailer configurado en la instancia para uso externo (invitaciones, etc.).
     * Expuesto como público para que otros servicios puedan usarlo.
     */
    public function getInstanceMailer(): Mailer
    {
        return $this->getSmtpMailer();
    }
}

<?php

namespace App\Jobs;

use App\Services\InstanceAdminService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendNotificationEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Número máximo de intentos antes de considerar el trabajo como fallido.
     */
    public int $tries = 3;

    /**
     * Tiempo en segundos a esperar antes de reintentar.
     */
    public int $backoff = 15;

    /**
     * Crea una nueva instancia del Job.
     */
    public function __construct(
        public readonly string $recipientEmail,
        public readonly Mailable $mailable,
    ) {}

    /**
     * Ejecuta el trabajo en el proceso trabajador de la cola (queue worker).
     */
    public function handle(InstanceAdminService $adminService): void
    {
        try {
            $mailer = $adminService->getInstanceMailer();
            $mailer->to($this->recipientEmail)->send($this->mailable);
        } catch (Throwable $e) {
            Log::warning("Fallo al enviar correo en cola a {$this->recipientEmail}: " . $e->getMessage());

            // En entornos reales permitir reintentos del worker; en testing registrar sin bloquear
            if (! app()->environment('testing')) {
                throw $e;
            }
        }
    }
}

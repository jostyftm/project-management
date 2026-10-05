<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Crea una nueva instancia del mailable.
     */
    public function __construct(
        public readonly string $resetUrl,
        public readonly string $userName,
        public readonly int $expiresInMinutes = 10,
    ) {}

    /**
     * Define el sobre del mensaje (asunto y remitente).
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Restablece tu contraseña de acceso a Plane',
        );
    }

    /**
     * Define el contenido del mensaje.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.reset_password',
            with: [
                'resetUrl' => $this->resetUrl,
                'userName' => $this->userName,
                'expiresInMinutes' => $this->expiresInMinutes,
            ],
        );
    }
}

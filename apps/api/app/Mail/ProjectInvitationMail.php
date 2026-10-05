<?php

namespace App\Mail;

use App\Models\ProjectInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProjectInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Crea una nueva instancia del mailable.
     */
    public function __construct(
        public readonly ProjectInvitation $invitation,
        public readonly string $inviteUrl,
    ) {}

    /**
     * Define el sobre del mensaje (asunto y remitente).
     */
    public function envelope(): Envelope
    {
        $projectName = $this->invitation->project?->name ?? 'un proyecto';
        $inviterName = $this->invitation->inviter?->name ?? 'Un administrador';

        return new Envelope(
            subject: "{$inviterName} te ha invitado a unirte a «{$projectName}»",
        );
    }

    /**
     * Define el contenido del mensaje.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.project_invitation',
            with: [
                'invitation' => $this->invitation,
                'inviteUrl'  => $this->inviteUrl,
                'projectName' => $this->invitation->project?->name ?? 'el proyecto',
                'inviterName' => $this->invitation->inviter?->name ?? 'Un administrador',
                'role'        => $this->invitation->role,
                'expiresAt'   => $this->invitation->expires_at?->format('d/m/Y'),
            ],
        );
    }
}

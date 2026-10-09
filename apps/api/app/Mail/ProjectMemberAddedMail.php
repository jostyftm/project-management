<?php

namespace App\Mail;

use App\Models\Project;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProjectMemberAddedMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Crea una nueva instancia del mailable.
     */
    public function __construct(
        public readonly Project $project,
        public readonly User $member,
        public readonly User $inviter,
        public readonly string $role,
        public readonly string $projectUrl,
    ) {}

    /**
     * Define el sobre del mensaje (asunto y remitente).
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->inviter->name} te ha añadido al proyecto «{$this->project->name}»",
        );
    }

    /**
     * Define el contenido del mensaje.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.project_member_added',
            with: [
                'projectName' => $this->project->name,
                'projectIdentifier' => $this->project->identifier,
                'workspaceName' => $this->project->workspace?->name ?? 'Plane Workspace',
                'userName' => $this->member->name,
                'inviterName' => $this->inviter->name,
                'role' => $this->role,
                'projectUrl' => $this->projectUrl,
            ],
        );
    }
}

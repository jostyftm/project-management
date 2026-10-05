<?php

namespace App\Mail;

use App\Models\Cycle;
use App\Models\Project;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CycleCompletedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Cycle $cycle,
        public readonly Project $project,
        public readonly User $completedBy,
        public readonly int $completedCount,
        public readonly int $transferredCount,
        public readonly string $cycleUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[{$this->project->name}] El ciclo «{$this->cycle->name}» ha sido completado",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.cycle_completed',
            with: [
                'cycle'            => $this->cycle,
                'project'          => $this->project,
                'completedBy'      => $this->completedBy,
                'completedCount'   => $this->completedCount,
                'transferredCount' => $this->transferredCount,
                'cycleUrl'         => $this->cycleUrl,
            ],
        );
    }
}

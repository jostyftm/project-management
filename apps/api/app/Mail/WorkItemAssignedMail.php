<?php

namespace App\Mail;

use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WorkItemAssignedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly WorkItem $workItem,
        public readonly User $assignee,
        public readonly ?User $actor,
        public readonly string $workItemUrl,
    ) {}

    public function envelope(): Envelope
    {
        $projectName = $this->workItem->project?->name ?? 'Proyecto';
        $actorName = $this->actor?->name ?? 'Un miembro';

        return new Envelope(
            subject: "[{$projectName}] {$actorName} te ha asignado la tarea: «{$this->workItem->name}»",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.work_item_assigned',
            with: [
                'workItem'    => $this->workItem,
                'assignee'    => $this->assignee,
                'actor'       => $this->actor,
                'projectName' => $this->workItem->project?->name ?? 'Proyecto',
                'priority'    => $this->workItem->priority ?? 'NONE',
                'stateName'   => $this->workItem->state?->name ?? 'Por hacer',
                'workItemUrl' => $this->workItemUrl,
            ],
        );
    }
}

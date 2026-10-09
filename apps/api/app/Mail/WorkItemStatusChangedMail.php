<?php

namespace App\Mail;

use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WorkItemStatusChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly WorkItem $workItem,
        public readonly string $oldStateName,
        public readonly string $newStateName,
        public readonly ?User $actor,
        public readonly string $workItemUrl,
    ) {}

    public function envelope(): Envelope
    {
        $projectName = $this->workItem->project?->name ?? 'Proyecto';
        $actorName = $this->actor?->name ?? 'Un miembro';

        return new Envelope(
            subject: "[{$projectName}] {$actorName} cambió el estado de «{$this->workItem->name}» a «{$this->newStateName}»",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.work_item_status_changed',
            with: [
                'workItem' => $this->workItem,
                'oldStateName' => $this->oldStateName,
                'newStateName' => $this->newStateName,
                'actor' => $this->actor,
                'projectName' => $this->workItem->project?->name ?? 'Proyecto',
                'workItemUrl' => $this->workItemUrl,
            ],
        );
    }
}

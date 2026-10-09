<?php

namespace App\Mail;

use App\Models\Comment;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WorkItemCommentMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly WorkItem $workItem,
        public readonly Comment $comment,
        public readonly User $author,
        public readonly string $workItemUrl,
    ) {}

    public function envelope(): Envelope
    {
        $projectName = $this->workItem->project?->name ?? 'Proyecto';

        return new Envelope(
            subject: "[{$projectName}] {$this->author->name} comentó en: «{$this->workItem->name}»",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.work_item_comment',
            with: [
                'workItem' => $this->workItem,
                'comment' => $this->comment,
                'author' => $this->author,
                'projectName' => $this->workItem->project?->name ?? 'Proyecto',
                'workItemUrl' => $this->workItemUrl,
            ],
        );
    }
}

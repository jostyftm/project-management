<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserMentionedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $recipient,
        public readonly User $actor,
        public readonly string $contextTitle,
        public readonly string $contentSnippet,
        public readonly string $targetUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->actor->name} te mencionó en «{$this->contextTitle}»",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.user_mentioned',
            with: [
                'recipient'      => $this->recipient,
                'actor'          => $this->actor,
                'contextTitle'   => $this->contextTitle,
                'contentSnippet' => $this->contentSnippet,
                'targetUrl'      => $this->targetUrl,
            ],
        );
    }
}

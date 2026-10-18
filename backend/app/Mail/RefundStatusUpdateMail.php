<?php

namespace App\Mail;

use App\Models\Refund;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RefundStatusUpdateMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public Refund $refund
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Refund Update: '.$this->refund->refund_reference.' — Golden Resort',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.refund-update',
            with: [
                'refund' => $this->refund,
            ],
        );
    }
}

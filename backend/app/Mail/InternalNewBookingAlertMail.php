<?php

namespace App\Mail;

use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InternalNewBookingAlertMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public Reservation $reservation
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Staff Alert] New Reservation '.$this->reservation->booking_reference.' ('.$this->reservation->guest_name_snapshot.')',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.internal-new-booking',
            with: [
                'reservation' => $this->reservation,
            ],
        );
    }
}

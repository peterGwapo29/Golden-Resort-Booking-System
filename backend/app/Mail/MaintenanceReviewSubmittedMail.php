<?php

namespace App\Mail;

use App\Models\MaintenanceRequest;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MaintenanceReviewSubmittedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public MaintenanceRequest $maintenanceRequest,
        public User $technician,
        public string $completionNotes,
        public ?float $finalCost = null
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[Review Required] Completion Submitted for {$this->maintenanceRequest->tracking_number}: {$this->maintenanceRequest->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.maintenance-review-submitted',
            with: [
                'request' => $this->maintenanceRequest,
                'technician' => $this->technician,
                'completionNotes' => $this->completionNotes,
                'finalCost' => $this->finalCost,
            ],
        );
    }
}

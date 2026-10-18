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

class MaintenanceTaskProgressAlertMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public MaintenanceRequest $maintenanceRequest,
        public User $reporterOrStaff,
        public string $progressNotes,
        public ?float $recordedCost = null,
        public string $currentStatus = 'in_progress'
    ) {}

    public function envelope(): Envelope
    {
        $statusLabel = strtoupper(str_replace('_', ' ', $this->currentStatus));

        return new Envelope(
            subject: "[Maintenance Progress - {$statusLabel}] {$this->maintenanceRequest->tracking_number}: {$this->maintenanceRequest->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.maintenance-progress-alert',
            with: [
                'request' => $this->maintenanceRequest,
                'staff' => $this->reporterOrStaff,
                'progressNotes' => $this->progressNotes,
                'recordedCost' => $this->recordedCost,
                'currentStatus' => $this->currentStatus,
            ],
        );
    }
}

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

class MaintenanceReviewDecisionMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public MaintenanceRequest $maintenanceRequest,
        public User $assignee,
        public User $reviewer,
        public string $action, // 'approve' or 'reject'
        public ?string $feedbackNotes = null
    ) {}

    public function envelope(): Envelope
    {
        $statusPrefix = $this->action === 'approve' ? '[Approved]' : '[Revision Requested]';

        return new Envelope(
            subject: "{$statusPrefix} Maintenance Review for {$this->maintenanceRequest->tracking_number}: {$this->maintenanceRequest->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.maintenance-review-decision',
            with: [
                'request' => $this->maintenanceRequest,
                'assignee' => $this->assignee,
                'reviewer' => $this->reviewer,
                'action' => $this->action,
                'notes' => $this->feedbackNotes,
            ],
        );
    }
}

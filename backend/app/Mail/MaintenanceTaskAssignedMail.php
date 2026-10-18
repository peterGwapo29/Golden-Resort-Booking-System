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

class MaintenanceTaskAssignedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public MaintenanceRequest $maintenanceRequest,
        public User $assignee,
        public bool $isReassignment = false,
        public ?string $assignmentNotes = null
    ) {}

    public function envelope(): Envelope
    {
        $prefix = $this->isReassignment ? '[Reassigned]' : '[New Task Assigned]';

        return new Envelope(
            subject: "{$prefix} {$this->maintenanceRequest->tracking_number}: {$this->maintenanceRequest->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.maintenance-task-assigned',
            with: [
                'request' => $this->maintenanceRequest,
                'assignee' => $this->assignee,
                'isReassignment' => $this->isReassignment,
                'notes' => $this->assignmentNotes,
            ],
        );
    }
}

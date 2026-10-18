<?php

namespace App\Services;

use App\Mail\BookingCancellationMail;
use App\Mail\BookingConfirmationMail;
use App\Mail\CheckInReminderMail;
use App\Mail\InternalNewBookingAlertMail;
use App\Mail\MaintenanceReviewDecisionMail;
use App\Mail\MaintenanceReviewSubmittedMail;
use App\Mail\MaintenanceTaskAssignedMail;
use App\Mail\MaintenanceTaskProgressAlertMail;
use App\Mail\PaymentConfirmationMail;
use App\Mail\PaymentReminderMail;
use App\Mail\RefundStatusUpdateMail;
use App\Models\BookingNotification;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    /**
     * Send booking confirmation to guest.
     */
    public function sendBookingConfirmation(Reservation $reservation, bool $force = false): ?BookingNotification
    {
        $reservation->loadMissing(['room', 'guest']);
        $email = trim($reservation->guest_email_snapshot ?: $reservation->guest?->email ?: '');

        $idempotencyKey = $force
            ? "booking_conf_{$reservation->id}_manual_".time()
            : "booking_conf_{$reservation->id}";

        $subject = 'Reservation Confirmation: '.$reservation->booking_reference.' — Golden Resort';

        return $this->dispatchNotification([
            'reservation_id' => $reservation->id,
            'recipient_email' => $email,
            'recipient_type' => 'guest',
            'notification_type' => 'booking_confirmation',
            'channel' => 'mail',
            'subject' => $subject,
            'idempotency_key' => $idempotencyKey,
            'mailable' => new BookingConfirmationMail($reservation),
        ]);
    }

    /**
     * Send internal new booking alert to resort staff.
     */
    public function sendInternalNewBookingAlert(Reservation $reservation, bool $force = false): ?BookingNotification
    {
        $reservation->loadMissing(['room', 'guest']);

        // Determine destination staff recipient: primary admin email or configured contact
        $adminUser = User::where('role', 'admin')->first();
        $staffEmail = $adminUser?->email ?: config('mail.from.address', 'admin@goldenresort.com');

        $idempotencyKey = $force
            ? "staff_new_{$reservation->id}_manual_".time()
            : "staff_new_{$reservation->id}";

        $subject = '[Staff Alert] New Reservation '.$reservation->booking_reference.' ('.$reservation->guest_name_snapshot.')';

        return $this->dispatchNotification([
            'reservation_id' => $reservation->id,
            'recipient_email' => $staffEmail,
            'recipient_type' => 'staff',
            'notification_type' => 'internal_new_booking',
            'channel' => 'mail',
            'subject' => $subject,
            'idempotency_key' => $idempotencyKey,
            'mailable' => new InternalNewBookingAlertMail($reservation),
        ]);
    }

    /**
     * Send payment confirmation receipt to guest.
     */
    public function sendPaymentConfirmation(Payment $payment, bool $force = false): ?BookingNotification
    {
        $payment->loadMissing(['reservation.room', 'reservation.guest']);
        $reservation = $payment->reservation;

        if (! $reservation) {
            return null;
        }

        $email = trim($reservation->guest_email_snapshot ?: $reservation->guest?->email ?: '');

        $idempotencyKey = $force
            ? "pay_conf_{$payment->id}_manual_".time()
            : "pay_conf_{$payment->id}";

        $subject = 'Payment Receipt: '.$payment->payment_reference.' — Golden Resort';

        return $this->dispatchNotification([
            'reservation_id' => $reservation->id,
            'payment_id' => $payment->id,
            'recipient_email' => $email,
            'recipient_type' => 'guest',
            'notification_type' => 'payment_confirmation',
            'channel' => 'mail',
            'subject' => $subject,
            'idempotency_key' => $idempotencyKey,
            'mailable' => new PaymentConfirmationMail($payment),
        ]);
    }

    /**
     * Send payment balance reminder to guest.
     */
    public function sendPaymentReminder(Reservation $reservation, bool $force = false): ?BookingNotification
    {
        $reservation->loadMissing(['room', 'guest']);
        $email = trim($reservation->guest_email_snapshot ?: $reservation->guest?->email ?: '');

        $todayStr = Carbon::today()->toDateString();
        $idempotencyKey = $force
            ? "pay_remind_{$reservation->id}_{$todayStr}_manual_".time()
            : "pay_remind_{$reservation->id}_{$todayStr}";

        $subject = 'Reminder: Balance Due for Booking '.$reservation->booking_reference.' — Golden Resort';

        return $this->dispatchNotification([
            'reservation_id' => $reservation->id,
            'recipient_email' => $email,
            'recipient_type' => 'guest',
            'notification_type' => 'payment_reminder',
            'channel' => 'mail',
            'subject' => $subject,
            'idempotency_key' => $idempotencyKey,
            'mailable' => new PaymentReminderMail($reservation),
        ]);
    }

    /**
     * Send upcoming check-in reminder to guest.
     */
    public function sendCheckInReminder(Reservation $reservation, bool $force = false): ?BookingNotification
    {
        $reservation->loadMissing(['room', 'guest']);
        $email = trim($reservation->guest_email_snapshot ?: $reservation->guest?->email ?: '');

        $checkInStr = Carbon::parse($reservation->check_in)->toDateString();
        $idempotencyKey = $force
            ? "checkin_remind_{$reservation->id}_{$checkInStr}_manual_".time()
            : "checkin_remind_{$reservation->id}_{$checkInStr}";

        $subject = 'Upcoming Check-In Reminder: '.$reservation->booking_reference.' — Golden Resort';

        return $this->dispatchNotification([
            'reservation_id' => $reservation->id,
            'recipient_email' => $email,
            'recipient_type' => 'guest',
            'notification_type' => 'checkin_reminder',
            'channel' => 'mail',
            'subject' => $subject,
            'idempotency_key' => $idempotencyKey,
            'mailable' => new CheckInReminderMail($reservation),
        ]);
    }

    /**
     * Send booking cancellation notice to guest and staff.
     */
    public function sendCancellationNotice(Reservation $reservation, bool $force = false): ?BookingNotification
    {
        $reservation->loadMissing(['room', 'guest']);
        $email = trim($reservation->guest_email_snapshot ?: $reservation->guest?->email ?: '');

        $idempotencyKey = $force
            ? "res_cancel_{$reservation->id}_manual_".time()
            : "res_cancel_{$reservation->id}";

        $subject = 'Reservation Cancellation: '.$reservation->booking_reference.' — Golden Resort';

        return $this->dispatchNotification([
            'reservation_id' => $reservation->id,
            'recipient_email' => $email,
            'recipient_type' => 'guest',
            'notification_type' => 'booking_cancellation',
            'channel' => 'mail',
            'subject' => $subject,
            'idempotency_key' => $idempotencyKey,
            'mailable' => new BookingCancellationMail($reservation),
        ]);
    }

    /**
     * Send refund status update to guest.
     */
    public function sendRefundStatusUpdate(Refund $refund, bool $force = false): ?BookingNotification
    {
        $refund->loadMissing(['reservation.room', 'payment']);
        $reservation = $refund->reservation;

        if (! $reservation) {
            return null;
        }

        $email = trim($reservation->guest_email_snapshot ?: $reservation->guest?->email ?: '');

        $idempotencyKey = $force
            ? "refund_upd_{$refund->id}_{$refund->status}_manual_".time()
            : "refund_upd_{$refund->id}_{$refund->status}";

        $subject = 'Refund Update: '.$refund->refund_reference.' — Golden Resort';

        return $this->dispatchNotification([
            'reservation_id' => $reservation->id,
            'payment_id' => $refund->payment_id,
            'refund_id' => $refund->id,
            'recipient_email' => $email,
            'recipient_type' => 'guest',
            'notification_type' => 'refund_update',
            'channel' => 'mail',
            'subject' => $subject,
            'idempotency_key' => $idempotencyKey,
            'mailable' => new RefundStatusUpdateMail($refund),
        ]);
    }

    /**
     * Send maintenance task assignment or reassignment alert to technician.
     */
    public function sendMaintenanceTaskAssigned(MaintenanceRequest $request, bool $isReassignment = false, ?string $notes = null, bool $force = false): ?BookingNotification
    {
        $request->load(['assignedTo', 'room']);
        $assignee = $request->assignedTo;

        if (! $assignee || ! $assignee->email) {
            return null;
        }

        $type = $isReassignment ? 'maintenance_task_reassigned' : 'maintenance_task_assigned';
        $prefix = $isReassignment ? '[Reassigned]' : '[New Task Assigned]';
        $subject = "{$prefix} {$request->tracking_number}: {$request->title}";

        $idempotencyKey = $force
            ? "mnt_assign_{$request->id}_{$assignee->id}_".time()
            : "mnt_assign_{$request->id}_{$assignee->id}_{$request->status}";

        return $this->dispatchNotification([
            'maintenance_request_id' => $request->id,
            'recipient_email' => $assignee->email,
            'recipient_type' => 'staff',
            'notification_type' => $type,
            'channel' => 'mail',
            'subject' => $subject,
            'idempotency_key' => $idempotencyKey,
            'mailable' => new MaintenanceTaskAssignedMail($request, $assignee, $isReassignment, $notes),
        ]);
    }

    /**
     * Send progress update alert to administrator when work is updated or put on hold.
     */
    public function sendMaintenanceProgressAlert(MaintenanceRequest $request, User $staff, string $notes, ?float $cost = null, bool $force = false): ?BookingNotification
    {
        $request->loadMissing('room');

        $adminUser = User::where('role', 'admin')->first();
        $adminEmail = $adminUser?->email ?: config('mail.from.address', 'admin@goldenresort.com');

        $statusLabel = strtoupper(str_replace('_', ' ', $request->status));
        $subject = "[Maintenance Progress - {$statusLabel}] {$request->tracking_number}: {$request->title}";

        $idempotencyKey = $force
            ? "mnt_prog_{$request->id}_".time()
            : "mnt_prog_{$request->id}_{$request->status}_".time();

        return $this->dispatchNotification([
            'maintenance_request_id' => $request->id,
            'recipient_email' => $adminEmail,
            'recipient_type' => 'staff',
            'notification_type' => 'maintenance_progress_alert',
            'channel' => 'mail',
            'subject' => $subject,
            'idempotency_key' => $idempotencyKey,
            'mailable' => new MaintenanceTaskProgressAlertMail($request, $staff, $notes, $cost, $request->status),
        ]);
    }

    /**
     * Send review submission notification to administrator when technician completes work.
     */
    public function sendMaintenanceReviewSubmitted(MaintenanceRequest $request, User $technician, string $completionNotes, ?float $finalCost = null, bool $force = false): ?BookingNotification
    {
        $request->loadMissing('room');

        $adminUser = User::where('role', 'admin')->first();
        $adminEmail = $adminUser?->email ?: config('mail.from.address', 'admin@goldenresort.com');

        $subject = "[Review Required] Completion Submitted for {$request->tracking_number}: {$request->title}";

        $idempotencyKey = $force
            ? "mnt_rev_sub_{$request->id}_".time()
            : "mnt_rev_sub_{$request->id}";

        return $this->dispatchNotification([
            'maintenance_request_id' => $request->id,
            'recipient_email' => $adminEmail,
            'recipient_type' => 'staff',
            'notification_type' => 'maintenance_review_submitted',
            'channel' => 'mail',
            'subject' => $subject,
            'idempotency_key' => $idempotencyKey,
            'mailable' => new MaintenanceReviewSubmittedMail($request, $technician, $completionNotes, $finalCost),
        ]);
    }

    /**
     * Send review decision (approved or revision requested) to technician.
     */
    public function sendMaintenanceReviewDecision(MaintenanceRequest $request, User $reviewer, string $action, ?string $feedbackNotes = null, bool $force = false): ?BookingNotification
    {
        $request->load(['assignedTo', 'room']);
        $assignee = $request->assignedTo;

        if (! $assignee || ! $assignee->email) {
            return null;
        }

        $type = $action === 'approve' ? 'maintenance_review_approved' : 'maintenance_review_rejected';
        $statusPrefix = $action === 'approve' ? '[Approved]' : '[Revision Requested]';
        $subject = "{$statusPrefix} Maintenance Review for {$request->tracking_number}: {$request->title}";

        $idempotencyKey = $force
            ? "mnt_dec_{$request->id}_{$action}_".time()
            : "mnt_dec_{$request->id}_{$action}_".time();

        return $this->dispatchNotification([
            'maintenance_request_id' => $request->id,
            'recipient_email' => $assignee->email,
            'recipient_type' => 'staff',
            'notification_type' => $type,
            'channel' => 'mail',
            'subject' => $subject,
            'idempotency_key' => $idempotencyKey,
            'mailable' => new MaintenanceReviewDecisionMail($request, $assignee, $reviewer, $action, $feedbackNotes),
        ]);
    }

    /**
     * Retry sending a previously failed notification.
     */
    public function retryFailedNotification(BookingNotification $notification): BookingNotification
    {
        if ($notification->status !== 'failed') {
            return $notification;
        }

        $notification->loadMissing(['reservation', 'payment', 'refund', 'maintenanceRequest.assignedTo']);

        $mailable = match ($notification->notification_type) {
            'booking_confirmation' => $notification->reservation ? new BookingConfirmationMail($notification->reservation) : null,
            'internal_new_booking' => $notification->reservation ? new InternalNewBookingAlertMail($notification->reservation) : null,
            'payment_confirmation' => $notification->payment ? new PaymentConfirmationMail($notification->payment) : null,
            'payment_reminder' => $notification->reservation ? new PaymentReminderMail($notification->reservation) : null,
            'checkin_reminder' => $notification->reservation ? new CheckInReminderMail($notification->reservation) : null,
            'booking_cancellation' => $notification->reservation ? new BookingCancellationMail($notification->reservation) : null,
            'refund_update' => $notification->refund ? new RefundStatusUpdateMail($notification->refund) : null,
            'maintenance_task_assigned', 'maintenance_task_reassigned' => $notification->maintenanceRequest && $notification->maintenanceRequest->assignedTo
                ? new MaintenanceTaskAssignedMail(
                    $notification->maintenanceRequest,
                    $notification->maintenanceRequest->assignedTo,
                    $notification->notification_type === 'maintenance_task_reassigned'
                )
                : null,
            'maintenance_progress_alert' => $notification->maintenanceRequest && $notification->maintenanceRequest->assignedTo
                ? new MaintenanceTaskProgressAlertMail(
                    $notification->maintenanceRequest,
                    $notification->maintenanceRequest->assignedTo,
                    $notification->maintenanceRequest->repair_notes ?: 'Work progress recorded',
                    (float) $notification->maintenanceRequest->cost_php,
                    $notification->maintenanceRequest->status
                )
                : null,
            'maintenance_review_submitted' => $notification->maintenanceRequest && $notification->maintenanceRequest->assignedTo
                ? new MaintenanceReviewSubmittedMail(
                    $notification->maintenanceRequest,
                    $notification->maintenanceRequest->assignedTo,
                    $notification->maintenanceRequest->repair_notes ?: 'Completion submitted',
                    (float) $notification->maintenanceRequest->cost_php
                )
                : null,
            'maintenance_review_approved', 'maintenance_review_rejected' => $notification->maintenanceRequest && $notification->maintenanceRequest->assignedTo
                ? new MaintenanceReviewDecisionMail(
                    $notification->maintenanceRequest,
                    $notification->maintenanceRequest->assignedTo,
                    $notification->maintenanceRequest->assignedTo, // Fallback reviewer object
                    $notification->notification_type === 'maintenance_review_approved' ? 'approve' : 'reject',
                    $notification->maintenanceRequest->repair_notes
                )
                : null,
            default => null,
        };

        if (! $mailable) {
            $notification->update(['error_message' => 'Cannot rebuild mailable for unknown notification type']);

            return $notification;
        }

        try {
            Mail::to($notification->recipient_email)->send($mailable);
            $notification->update([
                'status' => 'sent',
                'error_message' => null,
                'sent_at' => Carbon::now(),
            ]);
        } catch (Exception $e) {
            Log::error('Failed to retry notification: '.$e->getMessage(), ['id' => $notification->id]);
            $notification->update([
                'status' => 'failed',
                'error_message' => 'Delivery error: '.$e->getMessage(),
            ]);
        }

        return $notification->fresh();
    }

    /**
     * Core dispatch logic enforcing idempotency and safe error capture.
     *
     * @param  array<string, mixed>  $payload
     */
    protected function dispatchNotification(array $payload): BookingNotification
    {
        $idempotencyKey = $payload['idempotency_key'];

        // Strict idempotency: check if identical notification was already queued/sent
        $existing = BookingNotification::where('idempotency_key', $idempotencyKey)->first();
        if ($existing) {
            return $existing;
        }

        $recipientEmail = $payload['recipient_email'];
        $isValidEmail = filter_var($recipientEmail, FILTER_VALIDATE_EMAIL);

        $notification = BookingNotification::create([
            'reservation_id' => $payload['reservation_id'] ?? null,
            'payment_id' => $payload['payment_id'] ?? null,
            'refund_id' => $payload['refund_id'] ?? null,
            'maintenance_request_id' => $payload['maintenance_request_id'] ?? null,
            'recipient_email' => $recipientEmail ?: 'unspecified@goldenresort.com',
            'recipient_type' => $payload['recipient_type'],
            'notification_type' => $payload['notification_type'],
            'channel' => $payload['channel'] ?? 'mail',
            'subject' => $payload['subject'],
            'status' => 'queued',
            'idempotency_key' => $idempotencyKey,
            'error_message' => ! $isValidEmail ? 'Invalid recipient email address' : null,
            'sent_at' => null,
        ]);

        if (! $isValidEmail) {
            $notification->update(['status' => 'failed']);

            return $notification;
        }

        try {
            Mail::to($recipientEmail)->send($payload['mailable']);

            $notification->update([
                'status' => 'sent',
                'sent_at' => Carbon::now(),
            ]);
        } catch (Exception $e) {
            Log::error('Failed to deliver notification email: '.$e->getMessage(), [
                'notification_id' => $notification->id,
                'type' => $payload['notification_type'],
            ]);

            $notification->update([
                'status' => 'failed',
                'error_message' => 'Delivery error: '.$e->getMessage(),
            ]);
        }

        return $notification;
    }
}

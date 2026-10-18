<?php

namespace App\Services;

use App\Mail\BookingCancellationMail;
use App\Mail\BookingConfirmationMail;
use App\Mail\CheckInReminderMail;
use App\Mail\InternalNewBookingAlertMail;
use App\Mail\PaymentConfirmationMail;
use App\Mail\PaymentReminderMail;
use App\Mail\RefundStatusUpdateMail;
use App\Models\BookingNotification;
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
     * Retry sending a previously failed notification.
     */
    public function retryFailedNotification(BookingNotification $notification): BookingNotification
    {
        if ($notification->status !== 'failed') {
            return $notification;
        }

        $mailable = match ($notification->notification_type) {
            'booking_confirmation' => new BookingConfirmationMail($notification->reservation),
            'internal_new_booking' => new InternalNewBookingAlertMail($notification->reservation),
            'payment_confirmation' => new PaymentConfirmationMail($notification->payment),
            'payment_reminder' => new PaymentReminderMail($notification->reservation),
            'checkin_reminder' => new CheckInReminderMail($notification->reservation),
            'booking_cancellation' => new BookingCancellationMail($notification->reservation),
            'refund_update' => new RefundStatusUpdateMail($notification->refund),
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

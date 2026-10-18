<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BookingNotification;
use App\Models\Reservation;
use App\Services\NotificationService;
use App\Services\SecurityAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminNotificationController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    /**
     * Display a paginated listing of notifications with filtering and metrics.
     */
    public function index(Request $request): JsonResponse
    {
        $query = BookingNotification::query()->with(['reservation.room', 'payment', 'refund']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('recipient_email', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhereHas('reservation', function ($rq) use ($search) {
                        $rq->where('booking_reference', 'like', "%{$search}%")
                            ->orWhere('guest_name_snapshot', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('notification_type') && $request->input('notification_type') !== 'all') {
            $query->where('notification_type', $request->input('notification_type'));
        }

        if ($request->filled('recipient_type') && $request->input('recipient_type') !== 'all') {
            $query->where('recipient_type', $request->input('recipient_type'));
        }

        if ($request->filled('read_status') && $request->input('read_status') !== 'all') {
            if ($request->input('read_status') === 'unread') {
                $query->unread();
            } elseif ($request->input('read_status') === 'read') {
                $query->read();
            }
        }

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->input('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->input('to_date'));
        }

        $notifications = $query->latest('id')->paginate(15);

        // High-level delivery and engagement metrics
        $metrics = [
            'total' => BookingNotification::count(),
            'unread' => BookingNotification::unread()->count(),
            'sent' => BookingNotification::where('status', 'sent')->count(),
            'queued' => BookingNotification::where('status', 'queued')->count(),
            'failed' => BookingNotification::where('status', 'failed')->count(),
        ];

        $items = collect($notifications->items())->map(function ($notif) {
            return [
                'id' => $notif->id,
                'reservation_id' => $notif->reservation_id,
                'booking_reference' => $notif->reservation?->booking_reference,
                'guest_name' => $notif->reservation?->guest_name_snapshot,
                'room_name' => $notif->reservation?->room?->name,
                'recipient_email' => $notif->recipient_email,
                'recipient_type' => $notif->recipient_type,
                'notification_type' => $notif->notification_type,
                'channel' => $notif->channel,
                'subject' => $notif->subject,
                'status' => $notif->status,
                'is_read' => $notif->is_read,
                'read_at' => $notif->read_at?->toISOString(),
                'error_message' => $notif->error_message,
                'sent_at' => $notif->sent_at?->toISOString(),
                'created_at' => $notif->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'data' => $items,
            'metrics' => $metrics,
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
        ]);
    }

    /**
     * Get all notifications for a specific reservation.
     */
    public function reservationNotifications(int $id): JsonResponse
    {
        $reservation = Reservation::findOrFail($id);

        $notifications = BookingNotification::where('reservation_id', $reservation->id)
            ->latest('id')
            ->get()
            ->map(function ($notif) {
                return [
                    'id' => $notif->id,
                    'recipient_email' => $notif->recipient_email,
                    'recipient_type' => $notif->recipient_type,
                    'notification_type' => $notif->notification_type,
                    'channel' => $notif->channel,
                    'subject' => $notif->subject,
                    'status' => $notif->status,
                    'error_message' => $notif->error_message,
                    'sent_at' => $notif->sent_at?->toISOString(),
                    'created_at' => $notif->created_at?->toISOString(),
                ];
            });

        return response()->json([
            'reservation_id' => $reservation->id,
            'booking_reference' => $reservation->booking_reference,
            'data' => $notifications,
        ]);
    }

    /**
     * Manually trigger/resend a notification for a specific reservation.
     */
    public function sendReservationNotification(Request $request, int $id): JsonResponse
    {
        $reservation = Reservation::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'type' => ['required', 'string', 'in:booking_confirmation,payment_reminder,checkin_reminder'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $type = $request->input('type');

        $notification = match ($type) {
            'booking_confirmation' => $this->notificationService->sendBookingConfirmation($reservation, force: true),
            'payment_reminder' => $this->notificationService->sendPaymentReminder($reservation, force: true),
            'checkin_reminder' => $this->notificationService->sendCheckInReminder($reservation, force: true),
        };

        SecurityAuditLogger::log('notification.triggered', "Staff triggered {$type} for {$reservation->booking_reference}", [
            'reservation_id' => $reservation->id,
            'notification_id' => $notification?->id,
            'type' => $type,
            'recipient' => $notification?->recipient_email,
            'status' => $notification?->status,
        ]);

        return response()->json([
            'message' => 'Notification dispatched successfully.',
            'data' => [
                'id' => $notification?->id,
                'recipient_email' => $notification?->recipient_email,
                'notification_type' => $notification?->notification_type,
                'subject' => $notification?->subject,
                'status' => $notification?->status,
                'sent_at' => $notification?->sent_at?->toISOString(),
                'created_at' => $notification?->created_at?->toISOString(),
            ],
        ], 201);
    }

    /**
     * Re-attempt delivery of a failed notification.
     */
    public function retry(int $id): JsonResponse
    {
        $notification = BookingNotification::findOrFail($id);

        if ($notification->status !== 'failed') {
            return response()->json([
                'message' => 'Only failed notifications can be retried.',
            ], 422);
        }

        $updated = $this->notificationService->retryFailedNotification($notification);

        SecurityAuditLogger::log('notification.retried', "Staff retried notification #{$notification->id}", [
            'notification_id' => $notification->id,
            'new_status' => $updated->status,
        ]);

        return response()->json([
            'message' => $updated->status === 'sent'
                ? 'Notification retried and delivered successfully.'
                : 'Notification retried but failed: '.($updated->error_message ?? 'Unknown error'),
            'data' => [
                'id' => $updated->id,
                'status' => $updated->status,
                'error_message' => $updated->error_message,
                'sent_at' => $updated->sent_at?->toISOString(),
            ],
        ]);
    }

    /**
     * Get the live count of authorized unread notifications for administrators.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $unreadCount = BookingNotification::unread()->count();

        return response()->json([
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark an individual notification as read.
     */
    public function markAsRead(int $id): JsonResponse
    {
        $notification = BookingNotification::findOrFail($id);

        if (! $notification->is_read) {
            $notification->markAsRead();

            SecurityAuditLogger::log('notification.marked_read', "Staff marked notification #{$id} as read", [
                'notification_id' => $notification->id,
            ]);
        }

        return response()->json([
            'message' => 'Notification marked as read.',
            'unread_count' => BookingNotification::unread()->count(),
            'data' => [
                'id' => $notification->id,
                'is_read' => true,
                'read_at' => $notification->read_at?->toISOString(),
            ],
        ]);
    }

    /**
     * Mark an individual notification as unread.
     */
    public function markAsUnread(int $id): JsonResponse
    {
        $notification = BookingNotification::findOrFail($id);

        if ($notification->is_read) {
            $notification->markAsUnread();

            SecurityAuditLogger::log('notification.marked_unread', "Staff marked notification #{$id} as unread", [
                'notification_id' => $notification->id,
            ]);
        }

        return response()->json([
            'message' => 'Notification marked as unread.',
            'unread_count' => BookingNotification::unread()->count(),
            'data' => [
                'id' => $notification->id,
                'is_read' => false,
                'read_at' => null,
            ],
        ]);
    }

    /**
     * Mark all unread notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $affected = BookingNotification::unread()->update([
            'read_at' => now(),
            'updated_at' => now(),
        ]);

        SecurityAuditLogger::log('notification.mark_all_read', "Staff marked all unread notifications as read ({$affected} items)", [
            'affected_count' => $affected,
        ]);

        return response()->json([
            'message' => 'All notifications marked as read.',
            'affected' => $affected,
            'unread_count' => 0,
        ]);
    }
}

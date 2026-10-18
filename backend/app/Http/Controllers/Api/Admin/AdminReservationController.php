<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateAdminReservationRequest;
use App\Http\Requests\Admin\UpdateReservationStatusRequest;
use App\Http\Resources\ReservationResource;
use App\Models\AccommodationRestriction;
use App\Models\Guest;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use App\Services\FinancialCalculationService;
use App\Services\NotificationService;
use App\Services\SecurityAuditLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminReservationController extends Controller
{
    /**
     * Display a listing of reservations for administrators.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Reservation::query()->with(['room', 'guest', 'payments', 'createdBy']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('booking_reference', 'like', "%{$search}%")
                    ->orWhere('guest_name_snapshot', 'like', "%{$search}%")
                    ->orWhere('guest_email_snapshot', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('room_id')) {
            $query->where('room_id', $request->input('room_id'));
        }

        if ($request->filled('from_date')) {
            $query->where('check_in', '>=', $request->input('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->where('check_out', '<=', $request->input('to_date'));
        }

        $reservations = $query->latest('id')->paginate(15);
        $financialService = app(FinancialCalculationService::class);

        $items = collect($reservations->items())->map(function ($res) use ($financialService) {
            $data = (new ReservationResource($res))->resolve(request());
            $summary = $financialService->reservationSummary($res);

            return array_merge($data, $summary);
        });

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $reservations->currentPage(),
                'last_page' => $reservations->lastPage(),
                'per_page' => $reservations->perPage(),
                'total' => $reservations->total(),
            ],
        ]);
    }

    /**
     * Create a new walk-in, phone, or front desk reservation with real-time inventory validation
     * and optional atomic initial payment recording.
     */
    public function store(CreateAdminReservationRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $reservation = DB::transaction(function () use ($validated, $user) {
            // Lock room record for update to serialize availability checks
            $room = Room::query()
                ->where('id', $validated['room_id'])
                ->lockForUpdate()
                ->first();

            if (! $room || ! $room->is_active) {
                abort(422, 'The selected accommodation is currently inactive or unavailable for booking.');
            }

            $checkIn = Carbon::parse($validated['check_in']);
            $checkOut = Carbon::parse($validated['check_out']);
            $nights = (int) $checkIn->diffInDays($checkOut);

            if ($nights <= 0) {
                abort(422, 'Check-out date must be at least one day after check-in.');
            }

            // Count overlapping reservations that block inventory
            $overlappingCount = Reservation::query()
                ->where('room_id', $room->id)
                ->blocksInventory()
                ->overlapping($validated['check_in'], $validated['check_out'])
                ->count();

            // Count active maintenance restrictions that block inventory
            $restrictedUnits = (int) AccommodationRestriction::query()
                ->where('room_id', $room->id)
                ->active()
                ->overlapping($validated['check_in'], $validated['check_out'])
                ->sum('blocked_units');

            if (($overlappingCount + $restrictedUnits) >= $room->total_inventory) {
                abort(409, 'The selected accommodation is no longer available for the requested dates due to existing bookings or maintenance restrictions.');
            }

            // Server-derived financial calculation
            $nightlyRate = $room->nightly_rate_php;
            $totalPrice = bcmul((string) $nightlyRate, (string) $nights, 2);

            $adults = (int) $validated['adults'];
            $children = (int) ($validated['children'] ?? 0);
            $totalGuests = $adults + $children;

            // Resolve or record guest
            $email = strtolower(trim($validated['guest_email']));
            $guest = Guest::firstOrCreate(
                ['email' => $email],
                [
                    'full_name' => trim($validated['guest_full_name']),
                    'phone' => trim($validated['guest_phone']),
                ]
            );

            // Generate unique, non-sequential public booking reference
            do {
                $randomSuffix = strtoupper(Str::random(4));
                $bookingReference = 'GR-'.$checkIn->format('Ymd').'-'.$randomSuffix;
            } while (Reservation::where('booking_reference', $bookingReference)->exists());

            $initialStatus = $validated['status'] ?? 'confirmed';

            // Create reservation record
            $res = Reservation::create([
                'booking_reference' => $bookingReference,
                'room_id' => $room->id,
                'guest_id' => $guest->id,
                'check_in' => $validated['check_in'],
                'check_out' => $validated['check_out'],
                'adults' => $adults,
                'children' => $children,
                'total_guests' => $totalGuests,
                'nights' => $nights,
                'nightly_rate_php' => $nightlyRate,
                'total_price_php' => $totalPrice,
                'currency' => 'PHP',
                'status' => $initialStatus,
                'booking_source' => $validated['booking_source'],
                'created_by_user_id' => $user?->id,
                'special_requests' => $validated['special_requests'] ?? null,
                'guest_name_snapshot' => trim($validated['guest_full_name']),
                'guest_email_snapshot' => $email,
                'guest_phone_snapshot' => trim($validated['guest_phone']),
            ]);

            // Optional atomic initial payment
            if (! empty($validated['initial_payment']) && isset($validated['initial_payment']['amount']) && (float) $validated['initial_payment']['amount'] > 0) {
                $paymentAmount = (float) $validated['initial_payment']['amount'];

                if ($paymentAmount > ((float) $totalPrice + 0.01)) {
                    abort(422, 'Initial payment amount cannot exceed the reservation total of ₱'.number_format((float) $totalPrice, 2).'.');
                }

                $payRef = 'PAY-'.Carbon::now()->format('Ymd').'-'.strtoupper(Str::random(4));

                Payment::create([
                    'reservation_id' => $res->id,
                    'payment_reference' => $payRef,
                    'amount' => $paymentAmount,
                    'currency' => 'PHP',
                    'payment_method' => $validated['initial_payment']['payment_method'],
                    'status' => 'completed',
                    'notes' => $validated['initial_payment']['notes'] ?? 'Initial payment recorded during reservation creation.',
                    'recorded_by_user_id' => $user?->id,
                ]);
            }

            return $res;
        });

        SecurityAuditLogger::log('reservation.created', 'Internal reservation created', [
            'reservation_id' => $reservation->id,
            'booking_reference' => $reservation->booking_reference,
            'booking_source' => $reservation->booking_source,
            'room_id' => $reservation->room_id,
            'created_by_user_id' => $user?->id,
            'status' => $reservation->status,
        ]);

        $reservation->load(['room', 'guest', 'createdBy', 'payments']);

        // Dispatch automated booking confirmation and internal staff alert
        $notificationService = app(NotificationService::class);
        $notificationService->sendBookingConfirmation($reservation);
        $notificationService->sendInternalNewBookingAlert($reservation);

        $financialService = app(FinancialCalculationService::class);
        $data = (new ReservationResource($reservation))->resolve(request());
        $summary = $financialService->reservationSummary($reservation);

        return response()->json([
            'message' => 'Reservation created successfully.',
            'data' => array_merge($data, $summary),
        ], 201);
    }

    /**
     * Display the specified reservation with complete history and payment details.
     */
    public function show(int $id): JsonResponse
    {
        $reservation = Reservation::with([
            'room',
            'guest',
            'createdBy',
            'payments.recordedBy',
            'payments.refunds.requestedBy',
            'payments.refunds.approvedBy',
            'refunds.requestedBy',
            'refunds.approvedBy',
        ])->findOrFail($id);

        $financialService = app(FinancialCalculationService::class);
        $summary = $financialService->reservationSummary($reservation);

        $data = (new ReservationResource($reservation))->resolve(request());
        $data = array_merge($data, $summary);

        $data['payments'] = $reservation->payments->map(function ($p) {
            return [
                'id' => $p->id,
                'payment_reference' => $p->payment_reference,
                'amount' => (float) $p->amount,
                'currency' => $p->currency,
                'payment_method' => $p->payment_method,
                'status' => $p->status,
                'notes' => $p->notes,
                'recorded_by' => $p->recordedBy?->name ?? 'Staff',
                'refunded_amount' => $p->completedRefundsTotal(),
                'remaining_refundable' => $p->remainingRefundable(),
                'refunds' => $p->refunds->map(function ($r) {
                    return [
                        'id' => $r->id,
                        'refund_reference' => $r->refund_reference,
                        'amount' => (float) $r->amount,
                        'currency' => $r->currency,
                        'reason' => $r->reason,
                        'status' => $r->status,
                        'notes' => $r->notes,
                        'requested_by' => $r->requestedBy?->name ?? 'Staff',
                        'approved_by' => $r->approvedBy?->name,
                        'created_at' => $r->created_at?->toISOString(),
                    ];
                }),
                'created_at' => $p->created_at?->toISOString(),
            ];
        });

        $data['refunds'] = $reservation->refunds->map(function ($r) {
            return [
                'id' => $r->id,
                'refund_reference' => $r->refund_reference,
                'payment_id' => $r->payment_id,
                'amount' => (float) $r->amount,
                'currency' => $r->currency,
                'reason' => $r->reason,
                'status' => $r->status,
                'notes' => $r->notes,
                'requested_by' => $r->requestedBy?->name ?? 'Staff',
                'approved_by' => $r->approvedBy?->name,
                'created_at' => $r->created_at?->toISOString(),
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Update the reservation status with concurrency and inventory re-validation.
     */
    public function updateStatus(UpdateReservationStatusRequest $request, int $id): JsonResponse
    {
        $reservation = Reservation::findOrFail($id);
        $newStatus = $request->input('status');

        $updated = DB::transaction(function () use ($reservation, $newStatus, $request) {
            // When confirming, re-verify that room inventory is available
            if ($newStatus === 'confirmed' && $reservation->status !== 'confirmed') {
                $room = Room::query()
                    ->where('id', $reservation->room_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $overlappingCount = Reservation::query()
                    ->where('room_id', $room->id)
                    ->where('id', '!=', $reservation->id)
                    ->blocksInventory()
                    ->overlapping($reservation->check_in, $reservation->check_out)
                    ->count();

                if ($overlappingCount >= $room->total_inventory) {
                    abort(409, 'Cannot confirm reservation: accommodation inventory is already fully booked for these dates.');
                }
            }

            $reservation->status = $newStatus;
            if ($request->filled('notes')) {
                $existing = $reservation->special_requests ?? '';
                $timestamp = now()->toDateTimeString();
                $reservation->special_requests = trim($existing."\n[Staff Note {$timestamp}]: ".$request->input('notes'));
            }
            $reservation->save();

            return $reservation;
        });

        $updated->load(['room', 'guest']);

        // Dispatch status-triggered automated notifications
        $notificationService = app(NotificationService::class);
        if ($newStatus === 'cancelled') {
            $notificationService->sendCancellationNotice($updated);
        } elseif ($newStatus === 'confirmed') {
            $notificationService->sendBookingConfirmation($updated);
        }

        return (new ReservationResource($updated))
            ->response()
            ->setStatusCode(200);
    }
}

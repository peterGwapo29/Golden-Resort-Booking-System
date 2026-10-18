<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateReservationStatusRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Models\Room;
use App\Services\FinancialCalculationService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminReservationController extends Controller
{
    /**
     * Display a listing of reservations for administrators.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Reservation::query()->with(['room', 'guest', 'payments']);

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
     * Display the specified reservation with complete history and payment details.
     */
    public function show(int $id): JsonResponse
    {
        $reservation = Reservation::with([
            'room',
            'guest',
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

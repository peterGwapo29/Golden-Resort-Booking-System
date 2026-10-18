<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HousekeepingTask;
use App\Models\HousekeepingTaskHistory;
use App\Models\Reservation;
use App\Services\FinancialCalculationService;
use App\Services\SecurityAuditLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AdminCheckInOutController extends Controller
{
    public function __construct(
        protected FinancialCalculationService $financialService
    ) {}

    /**
     * Display a daily overview of arrivals, departures, in-house guests, and front-desk metrics.
     */
    public function overview(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $dateStr = $request->input('date', Carbon::today()->toDateString());
        $targetDate = Carbon::parse($dateStr)->startOfDay();
        $todayStr = Carbon::today()->toDateString();
        $isPastNoon = Carbon::now()->hour >= 12;

        // 1. Expected / Scheduled Arrivals on $dateStr
        $arrivalsQuery = Reservation::query()
            ->with(['room', 'guest', 'payments', 'refunds', 'checkedInBy:id,name,email'])
            ->whereDate('check_in', $dateStr)
            ->where('status', '!=', 'cancelled')
            ->orderBy('id', 'desc')
            ->get();

        // 2. Expected / Scheduled Departures on $dateStr
        $departuresQuery = Reservation::query()
            ->with(['room', 'guest', 'payments', 'refunds', 'checkedInBy:id,name,email', 'checkedOutBy:id,name,email'])
            ->whereDate('check_out', $dateStr)
            ->where('status', '!=', 'cancelled')
            ->orderBy('id', 'desc')
            ->get();

        // 3. Currently In-House Guests (status === 'checked_in')
        $inHouseQuery = Reservation::query()
            ->with(['room', 'guest', 'payments', 'refunds', 'checkedInBy:id,name,email'])
            ->where('status', 'checked_in')
            ->orderBy('check_out', 'asc')
            ->get();

        $formatReservation = function (Reservation $res, bool $isDeparture = false) use ($todayStr, $isPastNoon) {
            $finSummary = $this->financialService->reservationSummary($res);
            $remaining = (float) $finSummary['remaining_balance_php'];
            $room = $res->room;

            // Overdue check: if departure date is today and past noon, or departure was before today, and still checked_in
            $isOverdue = false;
            if ($res->status === 'checked_in') {
                $checkOutDateStr = Carbon::parse($res->check_out)->toDateString();
                if ($checkOutDateStr < $todayStr || ($checkOutDateStr === $todayStr && $isPastNoon)) {
                    $isOverdue = true;
                }
            }

            return [
                'id' => $res->id,
                'booking_reference' => $res->booking_reference,
                'room_id' => $res->room_id,
                'room_name' => $room?->name ?? 'Unknown Room',
                'room_category' => $room?->category ?? 'room',
                'room_housekeeping_status' => $room?->housekeeping_status ?? 'clean',
                'is_room_ready' => $room?->housekeeping_status === 'inspected',
                'guest_id' => $res->guest_id,
                'guest_name' => $res->guest_name_snapshot ?? $res->guest?->full_name ?? 'Guest',
                'guest_email' => $res->guest_email_snapshot ?? $res->guest?->email ?? '',
                'guest_phone' => $res->guest_phone_snapshot ?? $res->guest?->phone ?? '',
                'adults' => (int) $res->adults,
                'children' => (int) $res->children,
                'total_guests' => (int) $res->total_guests,
                'nights' => (int) $res->nights,
                'check_in' => Carbon::parse($res->check_in)->toDateString(),
                'check_out' => Carbon::parse($res->check_out)->toDateString(),
                'status' => $res->status,
                'total_price_php' => (float) $res->total_price_php,
                'net_paid_php' => (float) $finSummary['net_paid_php'],
                'remaining_balance_php' => $remaining,
                'payment_status' => $finSummary['payment_status'],
                'has_outstanding_balance' => $remaining > 0,
                'is_overdue' => $isOverdue,
                'checked_in_at' => $res->checked_in_at?->toISOString(),
                'checked_out_at' => $res->checked_out_at?->toISOString(),
                'checked_in_by' => $res->checkedInBy ? [
                    'id' => $res->checkedInBy->id,
                    'name' => $res->checkedInBy->name,
                ] : null,
                'checked_out_by' => $res->checkedOutBy ? [
                    'id' => $res->checkedOutBy->id,
                    'name' => $res->checkedOutBy->name,
                ] : null,
                'check_in_notes' => $res->check_in_notes,
                'check_out_notes' => $res->check_out_notes,
                'special_requests' => $res->special_requests,
                'created_at' => $res->created_at?->toISOString(),
            ];
        };

        $arrivals = $arrivalsQuery->map(fn ($r) => $formatReservation($r, false))->values();
        $departures = $departuresQuery->map(fn ($r) => $formatReservation($r, true))->values();
        $inHouse = $inHouseQuery->map(fn ($r) => $formatReservation($r, true))->values();

        $metrics = [
            'date' => $dateStr,
            'total_arrivals' => $arrivals->count(),
            'arrived_count' => $arrivals->whereIn('status', ['checked_in', 'completed'])->count(),
            'pending_arrivals' => $arrivals->whereNotIn('status', ['checked_in', 'completed'])->count(),
            'unpaid_arrivals' => $arrivals->where('has_outstanding_balance', true)->count(),
            'total_departures' => $departures->count(),
            'departed_count' => $departures->where('status', 'completed')->count(),
            'pending_departures' => $departures->where('status', '!=', 'completed')->count(),
            'overdue_departures' => $departures->where('is_overdue', true)->count(),
            'in_house_count' => $inHouse->count(),
        ];

        return response()->json([
            'date' => $dateStr,
            'metrics' => $metrics,
            'arrivals' => $arrivals,
            'departures' => $departures,
            'in_house' => $inHouse,
        ]);
    }

    /**
     * Process guest check-in.
     */
    public function checkIn(Request $request, int $id): JsonResponse
    {
        $reservation = Reservation::with(['room', 'guest', 'payments'])->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'notes' => ['nullable', 'string', 'max:1000'],
            'acknowledge_balance' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($reservation->status === 'cancelled') {
            return response()->json([
                'message' => 'Cannot check in a cancelled reservation.',
            ], 422);
        }

        if ($reservation->status === 'checked_in') {
            return response()->json([
                'message' => 'Guest is already checked in.',
            ], 422);
        }

        if ($reservation->status === 'completed') {
            return response()->json([
                'message' => 'This reservation has already completed its stay.',
            ], 422);
        }

        // Verify payment requirements
        $outstanding = $this->financialService->outstandingBalance($reservation);
        if ($outstanding > 0 && ! $request->boolean('acknowledge_balance')) {
            return response()->json([
                'message' => 'Outstanding balance of ₱'.number_format($outstanding, 2).' detected. Please collect payment or acknowledge the balance to proceed.',
                'requires_acknowledgment' => true,
                'remaining_balance_php' => $outstanding,
                'currency' => 'PHP',
            ], 422);
        }

        DB::transaction(function () use ($reservation, $request) {
            $reservation->status = 'checked_in';
            $reservation->checked_in_at = Carbon::now();
            $reservation->checked_in_by_user_id = $request->user()->id;

            if ($request->filled('notes')) {
                $existing = $reservation->check_in_notes ?? '';
                $reservation->check_in_notes = trim($existing."\n".$request->input('notes'));
            }

            $reservation->save();
        });

        $reservation->load(['room', 'guest', 'checkedInBy:id,name,email']);
        $finSummary = $this->financialService->reservationSummary($reservation);

        return response()->json([
            'message' => "Guest successfully checked in for {$reservation->booking_reference}.",
            'reservation' => [
                'id' => $reservation->id,
                'booking_reference' => $reservation->booking_reference,
                'status' => $reservation->status,
                'checked_in_at' => $reservation->checked_in_at?->toISOString(),
                'checked_in_by' => $reservation->checkedInBy ? [
                    'id' => $reservation->checkedInBy->id,
                    'name' => $reservation->checkedInBy->name,
                ] : null,
                'check_in_notes' => $reservation->check_in_notes,
                'payment_status' => $finSummary['payment_status'],
                'remaining_balance_php' => $finSummary['remaining_balance_php'],
            ],
        ]);
    }

    /**
     * Process guest check-out and automatically flag accommodation for housekeeping turnover.
     */
    public function checkOut(Request $request, int $id): JsonResponse
    {
        $reservation = Reservation::with(['room', 'guest', 'payments'])->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'notes' => ['nullable', 'string', 'max:1000'],
            'acknowledge_balance' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($reservation->status !== 'checked_in') {
            return response()->json([
                'message' => 'Only currently checked-in reservations can be checked out.',
            ], 422);
        }

        // Verify outstanding balance
        $outstanding = $this->financialService->outstandingBalance($reservation);
        if ($outstanding > 0 && ! $request->boolean('acknowledge_balance')) {
            return response()->json([
                'message' => 'Outstanding balance of ₱'.number_format($outstanding, 2).' remains unsettled. Please collect payment or acknowledge the balance to proceed with check-out.',
                'requires_acknowledgment' => true,
                'remaining_balance_php' => $outstanding,
                'currency' => 'PHP',
            ], 422);
        }

        DB::transaction(function () use ($reservation, $request) {
            $reservation->status = 'completed';
            $reservation->checked_out_at = Carbon::now();
            $reservation->checked_out_by_user_id = $request->user()->id;

            if ($request->filled('notes')) {
                $existing = $reservation->check_out_notes ?? '';
                $reservation->check_out_notes = trim($existing."\n".$request->input('notes'));
            }

            $reservation->save();

            // Automatic Housekeeping Turnover Workflow
            $room = $reservation->room;
            if ($room) {
                // Preserve maintenance status if room is currently blocked for repair
                if ($room->housekeeping_status !== 'maintenance') {
                    $room->housekeeping_status = 'dirty';
                    $room->housekeeping_notes = "Turnover required following guest check-out ({$reservation->booking_reference}).";
                } else {
                    $existingNotes = $room->housekeeping_notes ? $room->housekeeping_notes."\n" : '';
                    $room->housekeeping_notes = $existingNotes."Guest checked out ({$reservation->booking_reference}). Room remains under maintenance.";
                }
                $room->save();

                // Idempotent task generation: check for existing active task on this room
                $activeTask = HousekeepingTask::query()
                    ->where('room_id', $room->id)
                    ->whereIn('status', ['pending', 'in_progress', 'pending_review'])
                    ->latest('id')
                    ->first();

                if ($activeTask) {
                    // Update existing active task instead of duplicating
                    if (in_array($activeTask->priority, ['low', 'normal'])) {
                        $activeTask->priority = 'high';
                    }
                    $appendNote = "[Check-out {$reservation->booking_reference}]: Guest checked out; turnover cleaning required.";
                    $activeTask->notes = trim(($activeTask->notes ?? '')."\n".$appendNote);
                    $activeTask->save();

                    HousekeepingTaskHistory::create([
                        'housekeeping_task_id' => $activeTask->id,
                        'actor_user_id' => $request->user()->id,
                        'action' => 'checkout_turnover',
                        'from_status' => $activeTask->status,
                        'to_status' => $activeTask->status,
                        'notes' => "Turnover triggered by check-out for {$reservation->booking_reference}. Active task updated.",
                        'created_at' => Carbon::now(),
                    ]);
                } else {
                    // Create new turnover cleaning task
                    $newTask = HousekeepingTask::create([
                        'room_id' => $room->id,
                        'created_by_user_id' => $request->user()->id,
                        'task_type' => 'cleaning',
                        'priority' => 'high',
                        'status' => 'pending',
                        'notes' => "Check-out turnover for {$reservation->booking_reference} ({$reservation->guest_name_snapshot})",
                        'scheduled_date' => Carbon::today()->toDateString(),
                    ]);

                    HousekeepingTaskHistory::create([
                        'housekeeping_task_id' => $newTask->id,
                        'actor_user_id' => $request->user()->id,
                        'action' => 'created',
                        'from_status' => null,
                        'to_status' => 'pending',
                        'notes' => "Automated turnover task generated following guest check-out ({$reservation->booking_reference}).",
                        'created_at' => Carbon::now(),
                    ]);
                }

                SecurityAuditLogger::log('housekeeping.checkout_turnover', 'Checkout turnover processed', [
                    'reservation_id' => $reservation->id,
                    'booking_reference' => $reservation->booking_reference,
                    'room_id' => $room->id,
                    'room_status' => $room->housekeeping_status,
                ]);
            }
        });

        $reservation->load(['room', 'guest', 'checkedOutBy:id,name,email']);
        $finSummary = $this->financialService->reservationSummary($reservation);

        return response()->json([
            'message' => "Guest successfully checked out for {$reservation->booking_reference}. Room marked for turnover cleaning.",
            'reservation' => [
                'id' => $reservation->id,
                'booking_reference' => $reservation->booking_reference,
                'status' => $reservation->status,
                'checked_out_at' => $reservation->checked_out_at?->toISOString(),
                'checked_out_by' => $reservation->checkedOutBy ? [
                    'id' => $reservation->checkedOutBy->id,
                    'name' => $reservation->checkedOutBy->name,
                ] : null,
                'check_out_notes' => $reservation->check_out_notes,
                'room_housekeeping_status' => $reservation->room?->housekeeping_status ?? 'dirty',
                'remaining_balance_php' => $finSummary['remaining_balance_php'],
            ],
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Room;
use App\Services\FinancialCalculationService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminCalendarController extends Controller
{
    public function __construct(
        protected FinancialCalculationService $financialService
    ) {}

    /**
     * Get accommodation schedules, reservation bars, and daily occupancy metrics.
     */
    public function schedule(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],
            'room_id' => ['nullable', 'integer', 'exists:rooms,id'],
            'category' => ['nullable', 'string', 'in:all,room,suite,villa'],
            'status' => ['nullable', 'string', 'in:all,pending,confirmed,completed,cancelled'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $now = Carbon::now();
        $startDateStr = $request->input('start_date', $now->copy()->startOfMonth()->toDateString());
        $endDateStr = $request->input('end_date', $now->copy()->endOfMonth()->toDateString());

        $startDate = Carbon::parse($startDateStr)->startOfDay();
        $endDate = Carbon::parse($endDateStr)->startOfDay();

        if ($endDate->lt($startDate)) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => [
                    'end_date' => ['The end date must be on or after the start date.'],
                ],
            ], 422);
        }

        $diffDays = $startDate->diffInDays($endDate) + 1;
        if ($diffDays > 62) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => [
                    'range' => ['Calendar query range cannot exceed 62 days (2 months).'],
                ],
            ], 422);
        }

        // Query accommodations
        $roomQuery = Room::query();
        if ($request->filled('room_id')) {
            $roomQuery->where('id', $request->input('room_id'));
        }
        if ($request->filled('category') && $request->input('category') !== 'all') {
            $roomQuery->where('category', $request->input('category'));
        }
        $rooms = $roomQuery->orderBy('category')->orderBy('name')->get();

        // Query reservations that overlap with [startDate, endDate + 1]
        $resQuery = Reservation::query()
            ->with(['room', 'guest', 'payments', 'refunds'])
            ->where('check_in', '<=', $endDateStr)
            ->where('check_out', '>', $startDateStr);

        if ($request->filled('room_id')) {
            $resQuery->where('room_id', $request->input('room_id'));
        }

        if ($request->filled('category') && $request->input('category') !== 'all') {
            $resQuery->whereHas('room', function ($q) use ($request) {
                $q->where('category', $request->input('category'));
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $resQuery->where('status', $request->input('status'));
        }

        $allReservations = $resQuery->orderBy('check_in')->get();

        // Generate date period
        $period = CarbonPeriod::create($startDate, $endDate);
        $dateStrings = [];
        foreach ($period as $date) {
            $dateStrings[] = $date->toDateString();
        }

        // Active inventory blockers: pending, confirmed, checked_in
        $blockingReservationsByRoom = [];
        foreach ($allReservations as $res) {
            if (in_array($res->status, ['pending', 'confirmed', 'checked_in'])) {
                $blockingReservationsByRoom[$res->room_id][] = [
                    'id' => $res->id,
                    'check_in' => Carbon::parse($res->check_in)->toDateString(),
                    'check_out' => Carbon::parse($res->check_out)->toDateString(),
                ];
            }
        }

        // Build room matrices
        $accommodationsData = [];
        $dailySummaries = [];

        foreach ($dateStrings as $dateStr) {
            $dailySummaries[$dateStr] = [
                'date' => $dateStr,
                'arrivals' => 0,
                'departures' => 0,
                'occupied_units' => 0,
                'total_capacity' => 0,
            ];
        }

        foreach ($rooms as $room) {
            $roomSchedule = [];
            $totalInventory = (int) $room->total_inventory;
            $isActive = (bool) $room->is_active;

            $roomBlocks = $blockingReservationsByRoom[$room->id] ?? [];

            foreach ($dateStrings as $dateStr) {
                // Count bookings active on dateStr: check_in <= dateStr < check_out
                $bookedCount = 0;
                foreach ($roomBlocks as $block) {
                    if ($block['check_in'] <= $dateStr && $block['check_out'] > $dateStr) {
                        $bookedCount++;
                    }
                }

                $availableUnits = max(0, $totalInventory - $bookedCount);

                $isMaintenanceBlocked = ! $isActive || $room->housekeeping_status === 'maintenance';

                $status = 'available';
                if ($isMaintenanceBlocked) {
                    $status = 'blocked';
                } elseif ($availableUnits === 0) {
                    $status = 'fully_booked';
                } elseif ($bookedCount > 0) {
                    $status = 'partially_booked';
                }

                $roomSchedule[] = [
                    'date' => $dateStr,
                    'total_inventory' => $totalInventory,
                    'booked_units' => $bookedCount,
                    'available_units' => $availableUnits,
                    'status' => $status,
                ];

                if (! $isMaintenanceBlocked) {
                    $dailySummaries[$dateStr]['total_capacity'] += $totalInventory;
                    $dailySummaries[$dateStr]['occupied_units'] += $bookedCount;
                }
            }

            $accommodationsData[] = [
                'id' => $room->id,
                'name' => $room->name,
                'slug' => $room->slug,
                'category' => $room->category,
                'total_inventory' => $totalInventory,
                'nightly_rate_php' => (float) $room->nightly_rate_php,
                'is_active' => $isActive,
                'housekeeping_status' => $room->housekeeping_status ?? 'clean',
                'schedule' => $roomSchedule,
            ];
        }

        // Format reservations list & calculate daily arrivals/departures
        $formattedReservations = [];
        $arrivalsInRange = 0;
        $departuresInRange = 0;

        foreach ($allReservations as $res) {
            $checkInStr = Carbon::parse($res->check_in)->toDateString();
            $checkOutStr = Carbon::parse($res->check_out)->toDateString();

            if ($res->status !== 'cancelled') {
                if (isset($dailySummaries[$checkInStr])) {
                    $dailySummaries[$checkInStr]['arrivals']++;
                    $arrivalsInRange++;
                }
                if (isset($dailySummaries[$checkOutStr])) {
                    $dailySummaries[$checkOutStr]['departures']++;
                    $departuresInRange++;
                }
            }

            $finSummary = $this->financialService->reservationSummary($res);

            $formattedReservations[] = [
                'id' => $res->id,
                'booking_reference' => $res->booking_reference,
                'room_id' => $res->room_id,
                'room_name' => $res->room?->name ?? 'Unknown Room',
                'room_category' => $res->room?->category ?? 'room',
                'guest_id' => $res->guest_id,
                'guest_name' => $res->guest_name_snapshot ?? $res->guest?->full_name ?? 'Guest',
                'guest_email' => $res->guest_email_snapshot ?? $res->guest?->email ?? '',
                'guest_phone' => $res->guest_phone_snapshot ?? $res->guest?->phone ?? '',
                'status' => $res->status,
                'payment_status' => $finSummary['payment_status'],
                'check_in' => $checkInStr,
                'check_out' => $checkOutStr,
                'nights' => (int) $res->nights,
                'adults' => (int) $res->adults,
                'children' => (int) $res->children,
                'total_guests' => (int) $res->total_guests,
                'total_price_php' => (float) $res->total_price_php,
                'gross_paid_php' => (float) $finSummary['gross_paid_php'],
                'refunded_php' => (float) $finSummary['refunded_php'],
                'net_paid_php' => (float) $finSummary['net_paid_php'],
                'remaining_balance_php' => (float) $finSummary['remaining_balance_php'],
                'special_requests' => $res->special_requests,
                'created_at' => $res->created_at?->toISOString(),
            ];
        }

        $totalCapacity = $rooms->where('is_active', true)->sum('total_inventory');

        return response()->json([
            'range' => [
                'start_date' => $startDateStr,
                'end_date' => $endDateStr,
                'days_count' => $diffDays,
            ],
            'accommodations' => $accommodationsData,
            'reservations' => $formattedReservations,
            'daily_summaries' => $dailySummaries,
            'metrics' => [
                'total_accommodations' => $rooms->count(),
                'total_capacity_units' => $totalCapacity,
                'total_reservations' => count($formattedReservations),
                'arrivals_in_range' => $arrivalsInRange,
                'departures_in_range' => $departuresInRange,
            ],
        ]);
    }

    /**
     * Quick availability and conflict detection check for a date range.
     */
    public function quickCheck(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'check_in' => ['required', 'date_format:Y-m-d'],
            'check_out' => ['required', 'date_format:Y-m-d', 'after:check_in'],
            'room_id' => ['nullable', 'integer', 'exists:rooms,id'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $checkIn = Carbon::parse($request->input('check_in'))->startOfDay();
        $checkOut = Carbon::parse($request->input('check_out'))->startOfDay();
        $nights = (int) $checkIn->diffInDays($checkOut);

        if ($nights > 62) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => [
                    'check_out' => ['Stay duration for availability check cannot exceed 62 nights.'],
                ],
            ], 422);
        }

        $roomQuery = Room::query()->active();
        if ($request->filled('room_id')) {
            $roomQuery->where('id', $request->input('room_id'));
        }
        $rooms = $roomQuery->orderBy('category')->orderBy('name')->get();

        $checkInStr = $checkIn->toDateString();
        $checkOutStr = $checkOut->toDateString();

        // Get nights in stay: checkIn up to checkOut - 1 day
        $stayPeriod = CarbonPeriod::create($checkIn, $checkOut->copy()->subDay());
        $stayNights = [];
        foreach ($stayPeriod as $d) {
            $stayNights[] = $d->toDateString();
        }

        $results = [];

        foreach ($rooms as $room) {
            // Find all blocking reservations that overlap this stay
            $overlappingRes = Reservation::query()
                ->where('room_id', $room->id)
                ->blocksInventory()
                ->overlapping($checkInStr, $checkOutStr)
                ->with(['guest'])
                ->get();

            // Find peak simultaneous booked units during any single night of the stay
            $peakBooked = 0;
            foreach ($stayNights as $night) {
                $nightBooked = 0;
                foreach ($overlappingRes as $res) {
                    $rIn = Carbon::parse($res->check_in)->toDateString();
                    $rOut = Carbon::parse($res->check_out)->toDateString();
                    if ($rIn <= $night && $rOut > $night) {
                        $nightBooked++;
                    }
                }
                if ($nightBooked > $peakBooked) {
                    $peakBooked = $nightBooked;
                }
            }

            $totalInventory = (int) $room->total_inventory;
            $minAvailableUnits = max(0, $totalInventory - $peakBooked);
            $isAvailable = $minAvailableUnits > 0;

            $formattedOverlaps = $overlappingRes->map(function ($res) {
                return [
                    'id' => $res->id,
                    'booking_reference' => $res->booking_reference,
                    'guest_name' => $res->guest_name_snapshot ?? $res->guest?->full_name ?? 'Guest',
                    'check_in' => Carbon::parse($res->check_in)->toDateString(),
                    'check_out' => Carbon::parse($res->check_out)->toDateString(),
                    'status' => $res->status,
                ];
            });

            $results[] = [
                'room_id' => $room->id,
                'name' => $room->name,
                'category' => $room->category,
                'total_inventory' => $totalInventory,
                'nightly_rate_php' => (float) $room->nightly_rate_php,
                'peak_booked_units' => $peakBooked,
                'available_units' => $minAvailableUnits,
                'is_available' => $isAvailable,
                'conflict_detected' => ! $isAvailable,
                'overlapping_reservations' => $formattedOverlaps,
            ];
        }

        return response()->json([
            'check_in' => $checkInStr,
            'check_out' => $checkOutStr,
            'nights' => $nights,
            'has_available_rooms' => collect($results)->contains('is_available', true),
            'rooms' => $results,
        ]);
    }
}

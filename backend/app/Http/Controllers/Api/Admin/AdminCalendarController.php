<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccommodationRestriction;
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

        // Query active accommodation restrictions that overlap the range
        $restrQuery = AccommodationRestriction::query()
            ->active()
            ->where('start_date', '<=', $endDateStr)
            ->where(function ($q) use ($startDateStr) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>', $startDateStr);
            })
            ->with(['maintenanceRequest']);

        if ($request->filled('room_id')) {
            $restrQuery->where('room_id', $request->input('room_id'));
        }

        $allRestrictions = $restrQuery->get();
        $restrictionsByRoom = $allRestrictions->groupBy('room_id');

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
                'restricted_units' => 0,
                'total_capacity' => 0,
            ];
        }

        foreach ($rooms as $room) {
            $roomSchedule = [];
            $totalInventory = (int) $room->total_inventory;
            $isActive = (bool) $room->is_active;

            $roomBlocks = $blockingReservationsByRoom[$room->id] ?? [];
            $roomRestrictions = $restrictionsByRoom->get($room->id, collect());

            foreach ($dateStrings as $dateStr) {
                // Count bookings active on dateStr: check_in <= dateStr < check_out
                $bookedCount = 0;
                foreach ($roomBlocks as $block) {
                    if ($block['check_in'] <= $dateStr && $block['check_out'] > $dateStr) {
                        $bookedCount++;
                    }
                }

                // Count active maintenance restrictions on dateStr
                $restrictedCount = 0;
                $activeRestrictionsOnDate = [];
                foreach ($roomRestrictions as $restr) {
                    $rStart = $restr->start_date ? Carbon::parse($restr->start_date)->toDateString() : null;
                    $rEnd = $restr->end_date ? Carbon::parse($restr->end_date)->toDateString() : null;
                    if ($rStart <= $dateStr && ($rEnd === null || $rEnd > $dateStr)) {
                        $restrictedCount += $restr->blocked_units;
                        $activeRestrictionsOnDate[] = [
                            'id' => $restr->id,
                            'restriction_number' => $restr->restriction_number,
                            'title' => $restr->title,
                            'restriction_type' => $restr->restriction_type,
                            'reason' => $restr->reason,
                            'blocked_units' => $restr->blocked_units,
                            'maintenance_request_id' => $restr->maintenance_request_id,
                        ];
                    }
                }

                $availableUnits = max(0, $totalInventory - $bookedCount - $restrictedCount);

                $isMaintenanceBlocked = ! $isActive || $room->housekeeping_status === 'maintenance';

                $status = 'available';
                if ($isMaintenanceBlocked) {
                    $status = 'blocked';
                } elseif ($restrictedCount >= $totalInventory) {
                    $status = 'maintenance_blocked';
                } elseif ($availableUnits === 0) {
                    $status = 'fully_booked';
                } elseif ($bookedCount > 0 || $restrictedCount > 0) {
                    $status = 'partially_booked';
                }

                $roomSchedule[] = [
                    'date' => $dateStr,
                    'total_inventory' => $totalInventory,
                    'booked_units' => $bookedCount,
                    'restricted_units' => $restrictedCount,
                    'available_units' => $availableUnits,
                    'status' => $status,
                    'restrictions' => $activeRestrictionsOnDate,
                ];

                if (! $isMaintenanceBlocked) {
                    $dailySummaries[$dateStr]['total_capacity'] += $totalInventory;
                    $dailySummaries[$dateStr]['occupied_units'] += $bookedCount;
                    $dailySummaries[$dateStr]['restricted_units'] += $restrictedCount;
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
                'active_restrictions' => $roomRestrictions->map(function ($r) {
                    return [
                        'id' => $r->id,
                        'restriction_number' => $r->restriction_number,
                        'title' => $r->title,
                        'restriction_type' => $r->restriction_type,
                        'start_date' => Carbon::parse($r->start_date)->toDateString(),
                        'end_date' => $r->end_date ? Carbon::parse($r->end_date)->toDateString() : null,
                        'is_indefinite' => (bool) $r->is_indefinite,
                        'blocked_units' => $r->blocked_units,
                    ];
                })->values(),
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

            // Find all active restrictions that overlap this stay
            $overlappingRestrictions = AccommodationRestriction::query()
                ->where('room_id', $room->id)
                ->active()
                ->overlapping($checkInStr, $checkOutStr)
                ->get();

            // Find peak simultaneous blockers (booked + restricted) during any single night of the stay
            $peakBooked = 0;
            $peakRestricted = 0;
            $peakTotalBlockers = 0;

            foreach ($stayNights as $night) {
                $nightBooked = 0;
                foreach ($overlappingRes as $res) {
                    $rIn = Carbon::parse($res->check_in)->toDateString();
                    $rOut = Carbon::parse($res->check_out)->toDateString();
                    if ($rIn <= $night && $rOut > $night) {
                        $nightBooked++;
                    }
                }

                $nightRestricted = 0;
                foreach ($overlappingRestrictions as $restr) {
                    $rIn = Carbon::parse($restr->start_date)->toDateString();
                    $rOut = $restr->end_date ? Carbon::parse($restr->end_date)->toDateString() : null;
                    if ($rIn <= $night && ($rOut === null || $rOut > $night)) {
                        $nightRestricted += $restr->blocked_units;
                    }
                }

                if ($nightBooked > $peakBooked) {
                    $peakBooked = $nightBooked;
                }
                if ($nightRestricted > $peakRestricted) {
                    $peakRestricted = $nightRestricted;
                }
                if (($nightBooked + $nightRestricted) > $peakTotalBlockers) {
                    $peakTotalBlockers = $nightBooked + $nightRestricted;
                }
            }

            $totalInventory = (int) $room->total_inventory;
            $minAvailableUnits = max(0, $totalInventory - $peakTotalBlockers);
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

            $formattedRestrictions = $overlappingRestrictions->map(function ($restr) {
                return [
                    'id' => $restr->id,
                    'restriction_number' => $restr->restriction_number,
                    'title' => $restr->title,
                    'restriction_type' => $restr->restriction_type,
                    'start_date' => Carbon::parse($restr->start_date)->toDateString(),
                    'end_date' => $restr->end_date ? Carbon::parse($restr->end_date)->toDateString() : null,
                    'is_indefinite' => (bool) $restr->is_indefinite,
                    'blocked_units' => $restr->blocked_units,
                    'reason' => $restr->reason,
                ];
            });

            $results[] = [
                'room_id' => $room->id,
                'name' => $room->name,
                'category' => $room->category,
                'total_inventory' => $totalInventory,
                'nightly_rate_php' => (float) $room->nightly_rate_php,
                'peak_booked_units' => $peakBooked,
                'peak_restricted_units' => $peakRestricted,
                'available_units' => $minAvailableUnits,
                'is_available' => $isAvailable,
                'conflict_detected' => ! $isAvailable,
                'overlapping_reservations' => $formattedOverlaps,
                'overlapping_restrictions' => $formattedRestrictions,
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

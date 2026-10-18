<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccommodationRestriction;
use App\Models\MaintenanceRequest;
use App\Models\MaintenanceRequestHistory;
use App\Models\Reservation;
use App\Models\Room;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminRestrictionController extends Controller
{
    /**
     * List accommodation availability restrictions.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AccommodationRestriction::with(['room', 'maintenanceRequest', 'createdBy', 'clearedBy']);

        if ($request->filled('room_id') && $request->input('room_id') !== 'all') {
            $query->where('room_id', $request->input('room_id'));
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('restriction_type') && $request->input('restriction_type') !== 'all') {
            $query->where('restriction_type', $request->input('restriction_type'));
        }

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('restriction_number', 'like', "%{$search}%")
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhereHas('room', function ($rq) use ($search) {
                        $rq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = min(max((int) $request->input('per_page', 15), 1), 100);
        $restrictions = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $restrictions->items(),
            'meta' => [
                'current_page' => $restrictions->currentPage(),
                'last_page' => $restrictions->lastPage(),
                'per_page' => $restrictions->perPage(),
                'total' => $restrictions->total(),
            ],
        ]);
    }

    /**
     * Pre-check for overlapping reservations before creating a restriction.
     */
    public function checkConflicts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'is_indefinite' => ['nullable', 'boolean'],
            'blocked_units' => ['nullable', 'integer', 'min:1'],
        ]);

        $room = Room::findOrFail($validated['room_id']);
        $startDate = $validated['start_date'];
        $endDate = ! empty($validated['is_indefinite']) ? Carbon::parse($startDate)->addYears(2)->toDateString() : ($validated['end_date'] ?? Carbon::parse($startDate)->addYears(2)->toDateString());
        $blockedUnits = (int) ($validated['blocked_units'] ?? 1);

        // Find active reservations that block inventory during this window
        $overlappingReservations = Reservation::query()
            ->where('room_id', $room->id)
            ->blocksInventory()
            ->overlapping($startDate, $endDate)
            ->with('guest')
            ->orderBy('check_in')
            ->get();

        $formatted = $overlappingReservations->map(function ($res) {
            return [
                'id' => $res->id,
                'booking_reference' => $res->booking_reference,
                'guest_name' => $res->guest_name_snapshot ?? $res->guest?->full_name ?? 'Guest',
                'guest_email' => $res->guest_email_snapshot ?? $res->guest?->email ?? 'N/A',
                'guest_phone' => $res->guest_phone_snapshot ?? $res->guest?->phone ?? 'N/A',
                'check_in' => Carbon::parse($res->check_in)->toDateString(),
                'check_out' => Carbon::parse($res->check_out)->toDateString(),
                'status' => $res->status,
                'total_guests' => $res->total_guests,
            ];
        });

        // Determine if capacity is exceeded: does $overlappingCount + $blockedUnits > $room->total_inventory on any date?
        $hasCapacityConflict = false;
        if ($overlappingReservations->isNotEmpty()) {
            if ($blockedUnits >= $room->total_inventory) {
                $hasCapacityConflict = true;
            } else {
                // Check if any night exceeds
                $checkPeriod = CarbonPeriod::create(Carbon::parse($startDate), Carbon::parse($endDate)->copy()->subDay());
                foreach ($checkPeriod as $day) {
                    $dStr = $day->toDateString();
                    $activeOnDay = 0;
                    foreach ($overlappingReservations as $r) {
                        $rIn = Carbon::parse($r->check_in)->toDateString();
                        $rOut = Carbon::parse($r->check_out)->toDateString();
                        if ($rIn <= $dStr && $rOut > $dStr) {
                            $activeOnDay++;
                        }
                    }
                    if (($activeOnDay + $blockedUnits) > $room->total_inventory) {
                        $hasCapacityConflict = true;
                        break;
                    }
                }
            }
        }

        return response()->json([
            'conflicts_detected' => $hasCapacityConflict,
            'overlapping_count' => $overlappingReservations->count(),
            'overlapping_reservations' => $formatted,
            'room' => [
                'id' => $room->id,
                'name' => $room->name,
                'total_inventory' => $room->total_inventory,
            ],
            'message' => $hasCapacityConflict
                ? "Warning: {$overlappingReservations->count()} existing reservation(s) overlap with this restriction and exceed remaining inventory."
                : "No conflicting guest reservations detected.",
        ]);
    }

    /**
     * Store a newly created accommodation availability restriction.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['admin', 'manager'], true)) {
            return response()->json(['message' => 'Only administrators and managers are authorized to place accommodation restrictions.'], 403);
        }

        $validated = $request->validate([
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'maintenance_request_id' => ['nullable', 'integer', 'exists:maintenance_requests,id'],
            'restriction_type' => ['required', 'string', 'in:maintenance_block,emergency_repair,scheduled_renovation,safety_hazard,operational_hold'],
            'title' => ['required', 'string', 'max:255'],
            'reason' => ['required', 'string'],
            'blocked_units' => ['nullable', 'integer', 'min:1'],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'is_indefinite' => ['nullable', 'boolean'],
            'handling_protocol' => ['nullable', 'string', 'max:50'],
        ]);

        $room = Room::findOrFail($validated['room_id']);
        $blockedUnits = min((int) ($validated['blocked_units'] ?? 1), $room->total_inventory);

        $isIndefinite = ! empty($validated['is_indefinite']) || empty($validated['end_date']);
        $endDate = $isIndefinite ? null : $validated['end_date'];

        $restriction = DB::transaction(function () use ($validated, $room, $blockedUnits, $isIndefinite, $endDate, $user) {
            // Check for overlapping reservations and capture conflict snapshot
            $effectiveEnd = $endDate ?? Carbon::parse($validated['start_date'])->addYears(2)->toDateString();
            $overlappingReservations = Reservation::query()
                ->where('room_id', $room->id)
                ->blocksInventory()
                ->overlapping($validated['start_date'], $effectiveEnd)
                ->with('guest')
                ->get();

            $conflictSnapshot = $overlappingReservations->map(function ($res) {
                return [
                    'id' => $res->id,
                    'booking_reference' => $res->booking_reference,
                    'guest_name' => $res->guest_name_snapshot ?? $res->guest?->full_name ?? 'Guest',
                    'check_in' => Carbon::parse($res->check_in)->toDateString(),
                    'check_out' => Carbon::parse($res->check_out)->toDateString(),
                    'status' => $res->status,
                ];
            })->values()->toArray();

            // Generate unique restriction reference number
            do {
                $code = strtoupper(Str::random(4));
                $restrictionNumber = 'AR-'.date('Ymd').'-'.$code;
            } while (AccommodationRestriction::where('restriction_number', $restrictionNumber)->exists());

            $record = AccommodationRestriction::create([
                'restriction_number' => $restrictionNumber,
                'room_id' => $room->id,
                'maintenance_request_id' => $validated['maintenance_request_id'] ?? null,
                'restriction_type' => $validated['restriction_type'],
                'title' => trim($validated['title']),
                'reason' => trim($validated['reason']),
                'blocked_units' => $blockedUnits,
                'start_date' => $validated['start_date'],
                'end_date' => $endDate,
                'is_indefinite' => $isIndefinite,
                'status' => 'active',
                'affected_reservations_snapshot' => ! empty($conflictSnapshot) ? $conflictSnapshot : null,
                'handling_protocol' => ! empty($conflictSnapshot) ? ($validated['handling_protocol'] ?? 'manager_review_queued') : 'no_conflicts',
                'created_by_user_id' => $user->id,
            ]);

            // If linked to maintenance request, record history event
            if (! empty($validated['maintenance_request_id'])) {
                MaintenanceRequestHistory::create([
                    'maintenance_request_id' => $validated['maintenance_request_id'],
                    'user_id' => $user->id,
                    'action' => 'restriction_placed',
                    'notes' => "Accommodation availability restriction placed: {$record->restriction_number} ({$record->title}).",
                ]);
            }

            return $record;
        });

        $restriction->load(['room', 'maintenanceRequest', 'createdBy']);

        return response()->json([
            'message' => 'Accommodation availability restriction placed successfully.',
            'data' => $restriction,
        ], 201);
    }

    /**
     * Display a single restriction.
     */
    public function show(int $id): JsonResponse
    {
        $restriction = AccommodationRestriction::with(['room', 'maintenanceRequest', 'createdBy', 'clearedBy'])
            ->findOrFail($id);

        return response()->json([
            'data' => $restriction,
        ]);
    }

    /**
     * Clear an active restriction and restore availability upon verified clearance.
     */
    public function clear(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['admin', 'manager'], true)) {
            return response()->json(['message' => 'Only administrators and managers are authorized to clear restrictions and restore room availability.'], 403);
        }

        $restriction = AccommodationRestriction::findOrFail($id);
        if ($restriction->status !== 'active') {
            return response()->json(['message' => "This restriction is already marked as '{$restriction->status}'."], 422);
        }

        $validated = $request->validate([
            'clearance_notes' => ['required', 'string', 'min:5', 'max:1000'],
            'room_condition' => ['nullable', 'string', 'in:inspected,clean,dirty'],
        ]);

        DB::transaction(function () use ($restriction, $validated, $user) {
            $restriction->update([
                'status' => 'cleared',
                'cleared_by_user_id' => $user->id,
                'cleared_at' => now(),
                'clearance_notes' => trim($validated['clearance_notes']),
            ]);

            // If room condition is specified, update the accommodation's housekeeping status
            if (! empty($validated['room_condition'])) {
                $room = $restriction->room;
                if ($room) {
                    $update = ['housekeeping_status' => $validated['room_condition']];
                    if ($validated['room_condition'] === 'inspected') {
                        $update['last_inspected_at'] = now();
                    } elseif ($validated['room_condition'] === 'clean') {
                        $update['last_cleaned_at'] = now();
                    }
                    $room->update($update);
                }
            }

            // If linked to a maintenance request, log history
            if ($restriction->maintenance_request_id) {
                MaintenanceRequestHistory::create([
                    'maintenance_request_id' => $restriction->maintenance_request_id,
                    'user_id' => $user->id,
                    'action' => 'restriction_cleared',
                    'notes' => "Operational clearance verified: {$validated['clearance_notes']}. Room availability restored.",
                ]);
            }
        });

        $restriction->load(['room', 'maintenanceRequest', 'createdBy', 'clearedBy']);

        return response()->json([
            'message' => 'Operational clearance verified. Accommodation availability has been restored.',
            'data' => $restriction,
        ]);
    }

    /**
     * Cancel an active restriction.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, ['admin', 'manager'], true)) {
            return response()->json(['message' => 'Only administrators and managers are authorized to cancel restrictions.'], 403);
        }

        $restriction = AccommodationRestriction::findOrFail($id);
        if ($restriction->status !== 'active') {
            return response()->json(['message' => "This restriction is already '{$restriction->status}'."], 422);
        }

        $validated = $request->validate([
            'cancellation_reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $restriction->update([
            'status' => 'cancelled',
            'cancellation_reason' => trim($validated['cancellation_reason']),
        ]);

        $restriction->load(['room', 'maintenanceRequest', 'createdBy']);

        return response()->json([
            'message' => 'Restriction cancelled successfully.',
            'data' => $restriction,
        ]);
    }
}

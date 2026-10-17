<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AvailabilityCheckRequest;
use App\Http\Resources\RoomResource;
use App\Models\Reservation;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class AvailabilityController extends Controller
{
    /**
     * Check availability of rooms for the given dates and guest counts.
     */
    public function __invoke(AvailabilityCheckRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $checkIn = $validated['check_in'];
        $checkOut = $validated['check_out'];
        $adults = (int) $validated['adults'];
        $children = (int) ($validated['children'] ?? 0);
        $totalGuests = $adults + $children;

        $checkInDate = Carbon::parse($checkIn);
        $checkOutDate = Carbon::parse($checkOut);
        $nights = (int) $checkInDate->diffInDays($checkOutDate);

        $query = Room::query()->active();

        if (! empty($validated['room_slug'])) {
            $query->where('slug', $validated['room_slug']);
        }

        if (! empty($validated['category']) && $validated['category'] !== 'all') {
            $query->where('category', $validated['category']);
        }

        $query->where('max_guests', '>=', $totalGuests);

        $rooms = $query->orderBy('nightly_rate_php', 'asc')->get();

        $availableRooms = [];

        foreach ($rooms as $room) {
            $bookedUnits = Reservation::where('room_id', $room->id)
                ->blocksInventory()
                ->overlapping($checkIn, $checkOut)
                ->count();

            $remainingInventory = $room->total_inventory - $bookedUnits;

            if ($remainingInventory > 0) {
                $nightlyRate = (float) $room->nightly_rate_php;
                $subtotal = $nightlyRate * $nights;

                $roomData = (new RoomResource($room))->resolve($request);
                $roomData['available_units'] = $remainingInventory;
                $roomData['nights'] = $nights;
                $roomData['calculated_total_php'] = $subtotal;

                $availableRooms[] = $roomData;
            }
        }

        return response()->json([
            'available_rooms' => $availableRooms,
            'search' => [
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'nights' => $nights,
                'adults' => $adults,
                'children' => $children,
                'total_guests' => $totalGuests,
                'count' => count($availableRooms),
            ],
        ]);
    }
}

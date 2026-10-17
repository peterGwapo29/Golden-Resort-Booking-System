<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoomResource;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RoomController extends Controller
{
    /**
     * Display a listing of active rooms.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Room::query()->active();

        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('min_guests')) {
            $minGuests = (int) $request->input('min_guests');
            if ($minGuests > 0) {
                $query->where('max_guests', '>=', $minGuests);
            }
        }

        $rooms = $query->orderBy('nightly_rate_php', 'asc')->get();

        return RoomResource::collection($rooms);
    }

    /**
     * Display the specified room by slug.
     */
    public function show(string $slug): RoomResource|JsonResponse
    {
        $room = Room::query()
            ->active()
            ->where('slug', $slug)
            ->firstOrFail();

        return new RoomResource($room);
    }
}

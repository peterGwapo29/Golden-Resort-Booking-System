<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminRoomRequest;
use App\Http\Resources\RoomResource;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminRoomController extends Controller
{
    /**
     * Display a listing of accommodations for administration.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Room::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('status')) {
            $status = $request->input('status');
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $rooms = $query->orderBy('id', 'desc')->paginate(15);

        return response()->json([
            'data' => RoomResource::collection($rooms->items()),
            'meta' => [
                'current_page' => $rooms->currentPage(),
                'last_page' => $rooms->lastPage(),
                'per_page' => $rooms->perPage(),
                'total' => $rooms->total(),
            ],
        ]);
    }

    /**
     * Store a newly created accommodation.
     */
    public function store(AdminRoomRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $validated['is_active'] = $validated['is_active'] ?? true;

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $extension = $file->getClientOriginalExtension() ?: $file->extension();
            $filename = Str::uuid().'.'.strtolower($extension);
            $path = $file->storeAs('accommodations', $filename, 'public');

            $alt = $request->input('image_alt') ?: $validated['name'];
            $imageObject = [
                'src' => Storage::disk('public')->url($path),
                'alt' => $alt,
                'source' => 'upload',
                'disk' => 'public',
                'path' => $path,
            ];

            $validated['featured_image'] = $imageObject;
            $validated['gallery'] = $validated['gallery'] ?? [$imageObject];
        } else {
            if (empty($validated['featured_image']) || empty($validated['featured_image']['src'])) {
                $alt = $request->input('image_alt') ?: $validated['name'];
                $imageObject = [
                    'src' => 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80',
                    'alt' => $alt,
                    'source' => 'fallback',
                ];
                $validated['featured_image'] = $imageObject;
                $validated['gallery'] = $validated['gallery'] ?? [$imageObject];
            }
        }

        unset($validated['image'], $validated['image_alt']);

        $room = Room::create($validated);

        return (new RoomResource($room))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified room with administrative statistics.
     */
    public function show(int $id): JsonResponse
    {
        $room = Room::findOrFail($id);

        $totalReservations = Reservation::where('room_id', $room->id)->count();
        $activeReservations = Reservation::where('room_id', $room->id)
            ->whereIn('status', ['pending', 'confirmed'])
            ->count();

        $resource = (new RoomResource($room))->resolve(request());
        $resource['stats'] = [
            'total_reservations' => $totalReservations,
            'active_reservations' => $activeReservations,
        ];

        return response()->json(['data' => $resource]);
    }

    /**
     * Update the specified accommodation.
     */
    public function update(AdminRoomRequest $request, int $id): JsonResponse
    {
        $room = Room::findOrFail($id);
        $validated = $request->validated();

        $oldFeaturedImage = $room->featured_image;

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $extension = $file->getClientOriginalExtension() ?: $file->extension();
            $filename = Str::uuid().'.'.strtolower($extension);
            $newPath = $file->storeAs('accommodations', $filename, 'public');

            $alt = $request->input('image_alt') ?: ($oldFeaturedImage['alt'] ?? $room->name);
            $newImageObject = [
                'src' => Storage::disk('public')->url($newPath),
                'alt' => $alt,
                'source' => 'upload',
                'disk' => 'public',
                'path' => $newPath,
            ];

            $validated['featured_image'] = $newImageObject;
            $validated['gallery'] = [$newImageObject];

            // Safely delete old image if it was a stored file on disk public
            if (! empty($oldFeaturedImage['path']) && Storage::disk('public')->exists($oldFeaturedImage['path'])) {
                Storage::disk('public')->delete($oldFeaturedImage['path']);
            }
        } else {
            // No new file: preserve existing image
            if (isset($validated['featured_image']) && ! empty($validated['featured_image']['src'])) {
                // Kept what was passed
            } else {
                $currentImage = $oldFeaturedImage ?? [];
                if ($request->filled('image_alt')) {
                    $currentImage['alt'] = $request->input('image_alt');
                }
                $validated['featured_image'] = $currentImage;
            }
        }

        unset($validated['image'], $validated['image_alt']);

        $room->update($validated);

        return (new RoomResource($room))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Toggle the active status of the room.
     */
    public function toggleActive(int $id): JsonResponse
    {
        $room = Room::findOrFail($id);
        $room->is_active = ! $room->is_active;
        $room->save();

        return response()->json([
            'message' => 'Accommodation successfully '.($room->is_active ? 'activated' : 'deactivated').'.',
            'is_active' => (bool) $room->is_active,
        ]);
    }

    /**
     * Safely delete a room if no reservations exist.
     */
    public function destroy(int $id): JsonResponse
    {
        $room = Room::findOrFail($id);

        $hasReservations = Reservation::where('room_id', $room->id)->exists();
        if ($hasReservations) {
            return response()->json([
                'message' => 'Cannot delete accommodation with existing reservation history. You may deactivate it instead.',
            ], 422);
        }

        // Clean up uploaded image if exists
        $featuredImage = $room->featured_image;
        if (! empty($featuredImage['path']) && Storage::disk('public')->exists($featuredImage['path'])) {
            Storage::disk('public')->delete($featuredImage['path']);
        }

        $room->delete();

        return response()->json([
            'message' => 'Accommodation deleted successfully.',
        ]);
    }
}

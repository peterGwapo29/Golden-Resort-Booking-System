<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReservationResource;
use App\Models\Guest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCustomerController extends Controller
{
    /**
     * Display a paginated listing of guests/customers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Guest::query()->withCount('reservations');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $customers = $query->orderBy('id', 'desc')->paginate(15);

        $items = collect($customers->items())->map(function ($guest) {
            return [
                'id' => $guest->id,
                'full_name' => $guest->full_name,
                'email' => $guest->email,
                'phone' => $guest->phone,
                'total_reservations' => $guest->reservations_count,
                'created_at' => $guest->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
        ]);
    }

    /**
     * Display customer details and reservation history.
     */
    public function show(int $id): JsonResponse
    {
        $guest = Guest::with(['reservations.room'])->findOrFail($id);

        $totalSpent = $guest->reservations
            ->whereIn('status', ['confirmed', 'completed'])
            ->sum('total_price_php');

        $totalNights = $guest->reservations
            ->whereIn('status', ['confirmed', 'completed'])
            ->sum('nights');

        return response()->json([
            'data' => [
                'id' => $guest->id,
                'full_name' => $guest->full_name,
                'email' => $guest->email,
                'phone' => $guest->phone,
                'created_at' => $guest->created_at?->toISOString(),
                'stats' => [
                    'total_reservations' => $guest->reservations->count(),
                    'total_nights' => (int) $totalNights,
                    'total_spent_php' => (float) $totalSpent,
                ],
                'reservations' => ReservationResource::collection($guest->reservations->sortByDesc('id')),
            ],
        ]);
    }
}

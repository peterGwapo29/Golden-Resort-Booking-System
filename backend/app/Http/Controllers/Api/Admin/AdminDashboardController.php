<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Models\Room;
use App\Services\FinancialCalculationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    /**
     * Return live operational metrics and recent activity for the dashboard.
     */
    public function stats(): JsonResponse
    {
        $today = Carbon::today()->format('Y-m-d');

        $totalRooms = Room::count();
        $activeRooms = Room::where('is_active', true)->count();
        $totalUnits = Room::where('is_active', true)->sum('total_inventory');

        $totalReservations = Reservation::count();
        $pendingCount = Reservation::where('status', 'pending')->count();
        $confirmedCount = Reservation::where('status', 'confirmed')->count();
        $cancelledCount = Reservation::where('status', 'cancelled')->count();
        $completedCount = Reservation::where('status', 'completed')->count();

        $checkInsToday = Reservation::where('check_in', $today)
            ->whereIn('status', ['pending', 'confirmed'])
            ->count();

        $checkOutsToday = Reservation::where('check_out', $today)
            ->whereIn('status', ['confirmed', 'completed'])
            ->count();

        // Financial calculations via authoritative service
        $financialService = app(FinancialCalculationService::class);
        $financialMetrics = $financialService->dashboardMetrics();
        $totalBookedValue = (float) Reservation::whereIn('status', ['confirmed', 'completed'])->sum('total_price_php');
        $pendingBookedValue = (float) Reservation::where('status', 'pending')->sum('total_price_php');

        // Recent 5 reservations
        $recentReservations = Reservation::with(['room', 'guest'])
            ->latest('id')
            ->limit(5)
            ->get();

        return response()->json([
            'metrics' => [
                'rooms' => [
                    'total' => $totalRooms,
                    'active' => $activeRooms,
                    'total_units' => (int) $totalUnits,
                ],
                'reservations' => [
                    'total' => $totalReservations,
                    'pending' => $pendingCount,
                    'confirmed' => $confirmedCount,
                    'cancelled' => $cancelledCount,
                    'completed' => $completedCount,
                ],
                'today' => [
                    'date' => $today,
                    'check_ins' => $checkInsToday,
                    'check_outs' => $checkOutsToday,
                ],
                'financials' => array_merge($financialMetrics, [
                    'confirmed_booked_value_php' => $totalBookedValue,
                    'pending_value_php' => $pendingBookedValue,
                ]),
            ],
            'recent_reservations' => ReservationResource::collection($recentReservations),
        ]);
    }
}

<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\Room;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class AnalyticsReportService
{
    /**
     * Resolve date range based on preset or explicit custom dates.
     */
    public function resolveDateRange(?string $preset = '30d', ?string $startDate = null, ?string $endDate = null): array
    {
        $today = Carbon::today();

        switch ($preset) {
            case '7d':
                $start = $today->copy()->subDays(6);
                $end = $today->copy();
                break;

            case 'this_month':
                $start = $today->copy()->startOfMonth();
                $end = $today->copy()->endOfMonth();
                break;

            case 'last_month':
                $start = $today->copy()->subMonth()->startOfMonth();
                $end = $today->copy()->subMonth()->endOfMonth();
                break;

            case 'ytd':
                $start = $today->copy()->startOfYear();
                $end = $today->copy();
                break;

            case 'custom':
                if ($startDate && $endDate) {
                    $start = Carbon::parse($startDate)->startOfDay();
                    $end = Carbon::parse($endDate)->startOfDay();
                    if ($start->gt($end)) {
                        $temp = $start;
                        $start = $end;
                        $end = $temp;
                    }
                    // Limit custom range to maximum 366 days
                    if ($start->diffInDays($end) > 366) {
                        $start = $end->copy()->subDays(366);
                    }
                } else {
                    $start = $today->copy()->subDays(29);
                    $end = $today->copy();
                }
                break;

            case '30d':
            default:
                $preset = '30d';
                $start = $today->copy()->subDays(29);
                $end = $today->copy();
                break;
        }

        return [
            'preset' => $preset,
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $end->format('Y-m-d'),
            'start_carbon' => $start,
            'end_carbon' => $end,
            'days_count' => $start->diffInDays($end) + 1,
        ];
    }

    /**
     * Generate complete Analytics and Business Intelligence metrics.
     */
    public function generateMetrics(array $range): array
    {
        $startDate = $range['start_date'];
        $endDate = $range['end_date'];
        $daysCount = $range['days_count'];

        // 1. Capacity and Rooms Setup
        $activeRooms = Room::where('is_active', true)->get();
        $totalDailyCapacity = (int) $activeRooms->sum('total_inventory');
        $totalAvailableRoomNights = $totalDailyCapacity * $daysCount;

        // 2. Fetch Reservations overlapping or created in the period
        $periodStartDateTime = Carbon::parse($startDate)->startOfDay();
        $periodEndDateTime = Carbon::parse($endDate)->endOfDay();

        // Reservations overlapping stay period: check_in <= endDate AND check_out > startDate
        $stayReservations = Reservation::with('room')
            ->where('check_in', '<=', $endDate)
            ->where('check_out', '>', $startDate)
            ->get();

        // Reservations created during this period
        $createdReservations = Reservation::whereBetween('created_at', [$periodStartDateTime, $periodEndDateTime])->get();

        // 3. Occupancy by Day & Trends
        $period = CarbonPeriod::create($startDate, $endDate);
        $dailyOccupancy = [];
        $weeklyAggregates = [];
        $monthlyAggregates = [];
        $totalOccupiedRoomNights = 0;

        foreach ($period as $date) {
            $dateStr = $date->format('Y-m-d');
            $weekKey = $date->format('o-\WW');
            $monthKey = $date->format('Y-m');

            // Count units occupied on this day (excluding cancelled and no_show)
            $occupiedUnits = 0;
            foreach ($stayReservations as $res) {
                if (in_array($res->status, ['confirmed', 'checked_in', 'completed'])) {
                    $checkInStr = $res->check_in instanceof \Carbon\CarbonInterface
                        ? $res->check_in->format('Y-m-d')
                        : (string) $res->check_in;
                    $checkOutStr = $res->check_out instanceof \Carbon\CarbonInterface
                        ? $res->check_out->format('Y-m-d')
                        : (string) $res->check_out;

                    if ($checkInStr <= $dateStr && $checkOutStr > $dateStr) {
                        $occupiedUnits += 1;
                    }
                }
            }

            $totalOccupiedRoomNights += $occupiedUnits;
            $dayOccupancyPercent = $totalDailyCapacity > 0
                ? round(($occupiedUnits / $totalDailyCapacity) * 100, 1)
                : 0.0;

            $dailyOccupancy[] = [
                'date' => $dateStr,
                'day_of_week' => $date->format('D'),
                'occupied_units' => $occupiedUnits,
                'total_capacity' => $totalDailyCapacity,
                'occupancy_percent' => $dayOccupancyPercent,
            ];

            // Weekly rollup accumulator
            if (!isset($weeklyAggregates[$weekKey])) {
                $weeklyAggregates[$weekKey] = [
                    'week_label' => 'Week ' . $date->format('W') . ' (' . $date->format('M Y') . ')',
                    'occupied_nights' => 0,
                    'available_nights' => 0,
                ];
            }
            $weeklyAggregates[$weekKey]['occupied_nights'] += $occupiedUnits;
            $weeklyAggregates[$weekKey]['available_nights'] += $totalDailyCapacity;

            // Monthly rollup accumulator
            if (!isset($monthlyAggregates[$monthKey])) {
                $monthlyAggregates[$monthKey] = [
                    'month_label' => $date->format('F Y'),
                    'occupied_nights' => 0,
                    'available_nights' => 0,
                ];
            }
            $monthlyAggregates[$monthKey]['occupied_nights'] += $occupiedUnits;
            $monthlyAggregates[$monthKey]['available_nights'] += $totalDailyCapacity;
        }

        // Format weekly rollup
        $weeklyTrends = [];
        foreach ($weeklyAggregates as $w) {
            $weeklyTrends[] = [
                'label' => $w['week_label'],
                'occupied_nights' => $w['occupied_nights'],
                'available_nights' => $w['available_nights'],
                'occupancy_percent' => $w['available_nights'] > 0
                    ? round(($w['occupied_nights'] / $w['available_nights']) * 100, 1)
                    : 0.0,
            ];
        }

        // Format monthly rollup
        $monthlyTrends = [];
        foreach ($monthlyAggregates as $m) {
            $monthlyTrends[] = [
                'label' => $m['month_label'],
                'occupied_nights' => $m['occupied_nights'],
                'available_nights' => $m['available_nights'],
                'occupancy_percent' => $m['available_nights'] > 0
                    ? round(($m['occupied_nights'] / $m['available_nights']) * 100, 1)
                    : 0.0,
            ];
        }

        // Period overall occupancy rate
        $periodOccupancyRate = $totalAvailableRoomNights > 0
            ? round(($totalOccupiedRoomNights / $totalAvailableRoomNights) * 100, 1)
            : 0.0;

        // 4. Booking Counts & Funnel (based on bookings created or staying in period)
        $totalBookings = $createdReservations->count();
        $confirmedCount = $createdReservations->where('status', 'confirmed')->count();
        $checkedInCount = $createdReservations->where('status', 'checked_in')->count();
        $completedCount = $createdReservations->where('status', 'completed')->count();
        $cancelledCount = $createdReservations->where('status', 'cancelled')->count();
        $noShowCount = $createdReservations->where('status', 'no_show')->count();
        $pendingCount = $createdReservations->where('status', 'pending')->count();

        $cancellationRate = $totalBookings > 0
            ? round(($cancelledCount / $totalBookings) * 100, 1)
            : 0.0;
        $noShowRate = $totalBookings > 0
            ? round(($noShowCount / $totalBookings) * 100, 1)
            : 0.0;

        // 5. Financial Collections in Period via Authoritative Payment / Refund Records
        $grossPayments = (float) Payment::where('status', 'completed')
            ->whereBetween('created_at', [$periodStartDateTime, $periodEndDateTime])
            ->sum('amount');

        $directRefunds = (float) Refund::where('status', 'completed')
            ->whereBetween('created_at', [$periodStartDateTime, $periodEndDateTime])
            ->sum('amount');

        $legacyRefunds = (float) Payment::where('status', 'refunded')
            ->whereBetween('created_at', [$periodStartDateTime, $periodEndDateTime])
            ->sum('amount');

        $completedRefunds = round($directRefunds + $legacyRefunds, 2);
        $netCollections = max(0, round($grossPayments - $completedRefunds, 2));

        // 6. ADR (Average Daily Rate) and ALOS (Average Length of Stay)
        // Valid stay reservations that generated room revenue
        $validStays = $stayReservations->filter(function ($r) {
            return in_array($r->status, ['confirmed', 'checked_in', 'completed']);
        });

        $totalRevenueForStays = (float) $validStays->sum('total_price_php');
        $totalNightsSold = (int) $validStays->sum('nights');
        $validStaysCount = $validStays->count();

        $adr = $totalOccupiedRoomNights > 0
            ? round($totalRevenueForStays / $totalOccupiedRoomNights, 2)
            : ($totalNightsSold > 0 ? round($totalRevenueForStays / $totalNightsSold, 2) : 0.0);

        $alos = $validStaysCount > 0
            ? round($totalNightsSold / $validStaysCount, 1)
            : 0.0;

        // 7. Most-Booked Accommodation Types Performance
        $roomPerformance = [];
        $allRooms = Room::all();

        foreach ($allRooms as $room) {
            $roomStays = $stayReservations->where('room_id', $room->id);
            $roomValidStays = $roomStays->filter(function ($r) {
                return in_array($r->status, ['confirmed', 'checked_in', 'completed']);
            });

            $roomBookingsCount = $roomValidStays->count();
            $roomNightsSold = (int) $roomValidStays->sum('nights');
            $roomRevenue = (float) $roomValidStays->sum('total_price_php');

            $roomAvailableNights = (int) $room->total_inventory * $daysCount;
            $roomOccupancyPercent = $roomAvailableNights > 0
                ? round(($roomNightsSold / $roomAvailableNights) * 100, 1)
                : 0.0;

            $roomPerformance[] = [
                'room_id' => $room->id,
                'name' => $room->name,
                'slug' => $room->slug,
                'category' => $room->category,
                'total_inventory' => (int) $room->total_inventory,
                'nightly_rate_php' => (float) $room->nightly_rate_php,
                'is_active' => (bool) $room->is_active,
                'bookings_count' => $roomBookingsCount,
                'nights_sold' => $roomNightsSold,
                'revenue_php' => round($roomRevenue, 2),
                'occupancy_percent' => min(100, $roomOccupancyPercent),
            ];
        }

        // Sort room performance by revenue descending, then bookings descending
        usort($roomPerformance, function ($a, $b) {
            if ($b['revenue_php'] === $a['revenue_php']) {
                return $b['bookings_count'] <=> $a['bookings_count'];
            }
            return $b['revenue_php'] <=> $a['revenue_php'];
        });

        // 8. Outstanding Balances across active reservations
        $financialService = app(FinancialCalculationService::class);
        $totalOutstandingBalances = $financialService->totalOutstandingBalances();

        return [
            'range' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'preset' => $range['preset'],
                'days_count' => $daysCount,
            ],
            'kpis' => [
                'occupancy_rate_percent' => $periodOccupancyRate,
                'total_room_nights_occupied' => $totalOccupiedRoomNights,
                'total_room_nights_available' => $totalAvailableRoomNights,
                'adr_php' => $adr,
                'alos_nights' => $alos,
                'total_bookings' => $totalBookings,
                'confirmed_stays' => $confirmedCount + $checkedInCount + $completedCount,
                'cancellations' => $cancelledCount,
                'cancellation_rate_percent' => $cancellationRate,
                'no_shows' => $noShowCount,
                'no_show_rate_percent' => $noShowRate,
                'pending_bookings' => $pendingCount,
            ],
            'financials' => [
                'gross_collections_php' => $grossPayments,
                'completed_refunds_php' => $completedRefunds,
                'net_collections_php' => $netCollections,
                'outstanding_balances_php' => $totalOutstandingBalances,
                'currency' => 'PHP',
            ],
            'occupancy_trends' => [
                'daily' => $dailyOccupancy,
                'weekly' => $weeklyTrends,
                'monthly' => $monthlyTrends,
            ],
            'room_type_performance' => $roomPerformance,
        ];
    }

    /**
     * Escape a field to ensure safe RFC 4180 CSV generation and prevent CSV injection.
     */
    private function sanitizeCsvCell(mixed $value): string
    {
        $str = (string) $value;

        // Prevent formula injection in Excel/Calc if starts with =, +, -, @, \t, \r
        if (preg_match('/^[=+\-@\t\r]/', $str)) {
            $str = "'" . $str;
        }

        // Standard RFC 4180 escaping: wrap in quotes if contains comma, quote, or newline
        if (str_contains($str, ',') || str_contains($str, '"') || str_contains($str, "\n") || str_contains($str, "\r")) {
            $str = '"' . str_replace('"', '""', $str) . '"';
        }

        return $str;
    }

    /**
     * Generate an RFC 4180 CSV export for the selected analytics period.
     */
    public function generateCsv(array $data): string
    {
        $range = $data['range'];
        $kpis = $data['kpis'];
        $fin = $data['financials'];
        $rooms = $data['room_type_performance'];
        $daily = $data['occupancy_trends']['daily'];

        $lines = [];

        // Title Block
        $lines[] = 'Golden Resort - Business Intelligence & Operational Report';
        $lines[] = 'Report Period: ' . $range['start_date'] . ' to ' . $range['end_date'] . ' (' . $range['days_count'] . ' days)';
        $lines[] = 'Generated At: ' . now()->toDateTimeString();
        $lines[] = '';

        // Executive KPI Summary
        $lines[] = 'EXECUTIVE SUMMARY METRICS';
        $lines[] = 'Metric,Value';
        $lines[] = 'Occupancy Rate (%),' . $kpis['occupancy_rate_percent'] . '%';
        $lines[] = 'Total Occupied Room Nights,' . $kpis['total_room_nights_occupied'];
        $lines[] = 'Total Available Room Nights,' . $kpis['total_room_nights_available'];
        $lines[] = 'Average Daily Rate (ADR PHP),' . number_format($kpis['adr_php'], 2, '.', '');
        $lines[] = 'Average Length of Stay (ALOS Nights),' . $kpis['alos_nights'];
        $lines[] = 'Total Bookings Created in Range,' . $kpis['total_bookings'];
        $lines[] = 'Cancellations,' . $kpis['cancellations'] . ' (' . $kpis['cancellation_rate_percent'] . '%)';
        $lines[] = 'No-Shows,' . $kpis['no_shows'] . ' (' . $kpis['no_show_rate_percent'] . '%)';
        $lines[] = 'Gross Collections (PHP),' . number_format($fin['gross_collections_php'], 2, '.', '');
        $lines[] = 'Completed Refunds (PHP),' . number_format($fin['completed_refunds_php'], 2, '.', '');
        $lines[] = 'Net Collections (PHP),' . number_format($fin['net_collections_php'], 2, '.', '');
        $lines[] = 'Total Active Outstanding Balances (PHP),' . number_format($fin['outstanding_balances_php'], 2, '.', '');
        $lines[] = '';

        // Accommodation Performance Ranking
        $lines[] = 'ACCOMMODATION PERFORMANCE';
        $lines[] = 'Accommodation,Category,Inventory Units,Bookings Count,Nights Sold,Revenue (PHP),Occupancy (%)';
        foreach ($rooms as $r) {
            $row = [
                $this->sanitizeCsvCell($r['name']),
                $this->sanitizeCsvCell($r['category']),
                $r['total_inventory'],
                $r['bookings_count'],
                $r['nights_sold'],
                number_format($r['revenue_php'], 2, '.', ''),
                $r['occupancy_percent'] . '%',
            ];
            $lines[] = implode(',', $row);
        }
        $lines[] = '';

        // Daily Occupancy Breakdown
        $lines[] = 'DAILY OCCUPANCY BREAKDOWN';
        $lines[] = 'Date,Day of Week,Occupied Units,Total Capacity,Occupancy (%)';
        foreach ($daily as $d) {
            $row = [
                $d['date'],
                $d['day_of_week'],
                $d['occupied_units'],
                $d['total_capacity'],
                $d['occupancy_percent'] . '%',
            ];
            $lines[] = implode(',', $row);
        }

        return implode("\r\n", $lines);
    }
}

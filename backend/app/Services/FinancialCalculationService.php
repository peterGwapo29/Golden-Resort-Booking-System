<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;

class FinancialCalculationService
{
    /**
     * Calculate gross collections (total completed payments).
     */
    public function grossCollections(?int $reservationId = null): float
    {
        $query = Payment::query()->where('status', 'completed');

        if ($reservationId !== null) {
            $query->where('reservation_id', $reservationId);
        }

        return (float) $query->sum('amount');
    }

    /**
     * Calculate total completed refunds.
     * Incorporates dedicated completed refunds and safely includes
     * any historical legacy payments with status 'refunded'.
     */
    public function completedRefunds(?int $reservationId = null): float
    {
        $refundsQuery = Refund::query()->where('status', 'completed');
        $legacyPaymentsQuery = Payment::query()->where('status', 'refunded');

        if ($reservationId !== null) {
            $refundsQuery->where('reservation_id', $reservationId);
            $legacyPaymentsQuery->where('reservation_id', $reservationId);
        }

        $refundsTotal = (float) $refundsQuery->sum('amount');
        $legacyRefundsTotal = (float) $legacyPaymentsQuery->sum('amount');

        return round($refundsTotal + $legacyRefundsTotal, 2);
    }

    /**
     * Calculate net collections (Gross Collections - Completed Refunds).
     */
    public function netCollections(?int $reservationId = null): float
    {
        $gross = $this->grossCollections($reservationId);
        $refunds = $this->completedRefunds($reservationId);

        return max(0, round($gross - $refunds, 2));
    }

    /**
     * Calculate total pending payment amounts awaiting verification.
     */
    public function pendingPayments(?int $reservationId = null): float
    {
        $query = Payment::query()->where('status', 'pending');

        if ($reservationId !== null) {
            $query->where('reservation_id', $reservationId);
        }

        return (float) $query->sum('amount');
    }

    /**
     * Count total pending payments awaiting verification.
     */
    public function pendingPaymentsCount(?int $reservationId = null): int
    {
        $query = Payment::query()->where('status', 'pending');

        if ($reservationId !== null) {
            $query->where('reservation_id', $reservationId);
        }

        return $query->count();
    }

    /**
     * Calculate authoritative outstanding balance for a specific reservation.
     */
    public function outstandingBalance(Reservation $reservation): float
    {
        $totalPrice = (float) $reservation->total_price_php;
        $netPaid = $this->netCollections($reservation->id);

        return max(0, round($totalPrice - $netPaid, 2));
    }

    /**
     * Determine standardized payment status for a reservation:
     * 'paid', 'partially_paid', or 'unpaid'.
     */
    public function paymentStatus(Reservation $reservation): string
    {
        $netPaid = $this->netCollections($reservation->id);
        $totalPrice = (float) $reservation->total_price_php;

        if ($netPaid >= $totalPrice && $totalPrice > 0) {
            return 'paid';
        }

        if ($netPaid > 0) {
            return 'partially_paid';
        }

        return 'unpaid';
    }

    /**
     * Calculate total outstanding balance across active reservations.
     * Excludes cancelled reservations.
     */
    public function totalOutstandingBalances(): float
    {
        $reservations = Reservation::query()
            ->whereIn('status', ['pending', 'confirmed', 'completed'])
            ->get(['id', 'total_price_php']);

        $totalOutstanding = 0.0;
        foreach ($reservations as $res) {
            $totalOutstanding += $this->outstandingBalance($res);
        }

        return round($totalOutstanding, 2);
    }

    /**
     * Build standard dashboard financial metrics package.
     */
    public function dashboardMetrics(): array
    {
        $gross = $this->grossCollections();
        $refunds = $this->completedRefunds();
        $net = $this->netCollections();
        $pending = $this->pendingPayments();
        $pendingCount = $this->pendingPaymentsCount();
        $outstanding = $this->totalOutstandingBalances();

        return [
            'gross_collections_php' => $gross,
            'completed_refunds_php' => $refunds,
            'net_collections_php' => $net,
            'pending_payments_php' => $pending,
            'pending_payments_count' => $pendingCount,
            'outstanding_balances_php' => $outstanding,
            'verified_revenue_php' => $net, // Backward-compatible alias for existing consumers
            'currency' => 'PHP',
        ];
    }

    /**
     * Build financial summary for a reservation.
     */
    public function reservationSummary(Reservation $reservation): array
    {
        $gross = $this->grossCollections($reservation->id);
        $refunds = $this->completedRefunds($reservation->id);
        $net = $this->netCollections($reservation->id);
        $outstanding = $this->outstandingBalance($reservation);
        $status = $this->paymentStatus($reservation);

        return [
            'gross_paid_php' => $gross,
            'refunded_php' => $refunds,
            'net_paid_php' => $net,
            'total_paid_php' => $net, // Canonical net paid applied to booking
            'remaining_balance_php' => $outstanding,
            'payment_status' => $status,
        ];
    }
}

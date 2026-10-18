@extends('emails.layout')

@section('content')
    <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-warning">Friendly Reminder</span>
        <h2 style="margin: 8px 0; color: #13382c; font-size: 22px;">Upcoming Stay — Payment Balance Due</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Booking Reference: <strong style="color: #13382c;">{{ $reservation->booking_reference }}</strong></p>
    </div>

    <p class="greeting">Dear {{ $reservation->guest_name_snapshot }},</p>
    <p>This is a gentle reminder regarding your upcoming stay at Golden Resort. Our records indicate there is an outstanding balance remaining on your reservation.</p>

    @php
        $financialService = app(\App\Services\FinancialCalculationService::class);
        $summary = $financialService->reservationSummary($reservation);
        $remaining = (float) $summary['remaining_balance_php'];
    @endphp

    <div class="card" style="background-color: #fefcf7; border-color: #fae4be;">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #fae4be; padding-bottom: 8px;">
            Reservation Balance Breakdown
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td class="data-label" style="padding: 6px 0;">Accommodation</td>
                <td class="data-value" style="padding: 6px 0;">{{ $reservation->room->name ?? 'Room' }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Check-In Date</td>
                <td class="data-value" style="padding: 6px 0;">{{ \Carbon\Carbon::parse($reservation->check_in)->format('M d, Y') }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Check-Out Date</td>
                <td class="data-value" style="padding: 6px 0;">{{ \Carbon\Carbon::parse($reservation->check_out)->format('M d, Y') }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Total Stay Amount</td>
                <td class="data-value" style="padding: 6px 0;">₱{{ number_format((float) $reservation->total_price_php, 2) }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Total Paid So Far</td>
                <td class="data-value" style="padding: 6px 0; color: #137333;">₱{{ number_format((float) $summary['net_paid_php'], 2) }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0; font-weight: 700; color: #b06000;">Outstanding Balance Due</td>
                <td class="data-value highlight-value" style="padding: 6px 0; color: #b06000;">
                    ₱{{ number_format($remaining, 2) }}
                </td>
            </tr>
        </table>
    </div>

    <div style="margin: 20px 0; padding: 14px 18px; background: #fdfbf7; border-radius: 8px; border: 1px solid #e5dfd2; font-size: 13px;">
        <strong style="color: #13382c;">Settlement Information:</strong>
        <p style="margin: 6px 0 0 0; color: #555;">You may settle your remaining balance upon arrival at the Front Desk via Cash, Credit/Debit Card, GCash, or Maya. For bank transfers prior to arrival, please reply directly to this email or call our desk.</p>
    </div>

    <div style="text-align: center; margin-top: 25px;">
        <p style="font-size: 13px; color: #666;">If you have already settled this balance recently, please disregard this notice.</p>
    </div>
@endsection

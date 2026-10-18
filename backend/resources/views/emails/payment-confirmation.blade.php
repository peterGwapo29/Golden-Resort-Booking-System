@extends('emails.layout')

@section('content')
    <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-success">Payment Received</span>
        <h2 style="margin: 8px 0; color: #13382c; font-size: 22px;">Official Payment Receipt</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Payment Reference: <strong style="color: #13382c;">{{ $payment->payment_reference }}</strong></p>
    </div>

    <p class="greeting">Dear {{ $payment->reservation->guest_name_snapshot }},</p>
    <p>We are pleased to confirm that your payment has been successfully recorded and processed for your reservation at Golden Resort.</p>

    <div class="card" style="background-color: #f7f9f6; border-color: #d8e5d6;">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #d8e5d6; padding-bottom: 8px;">
            Payment Transaction Summary
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td class="data-label" style="padding: 6px 0;">Amount Paid</td>
                <td class="data-value highlight-value" style="padding: 6px 0; color: #137333;">₱{{ number_format((float) $payment->amount, 2) }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Payment Method</td>
                <td class="data-value" style="padding: 6px 0; text-transform: uppercase;">{{ str_replace('_', ' ', $payment->payment_method) }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Transaction Status</td>
                <td class="data-value" style="padding: 6px 0; text-transform: uppercase; color: #137333;">{{ $payment->status }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Booking Reference</td>
                <td class="data-value" style="padding: 6px 0;">{{ $payment->reservation->booking_reference }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Accommodation</td>
                <td class="data-value" style="padding: 6px 0;">{{ $payment->reservation->room->name ?? 'Room' }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Total Reservation Cost</td>
                <td class="data-value" style="padding: 6px 0;">₱{{ number_format((float) $payment->reservation->total_price_php, 2) }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Total Net Collections Paid</td>
                <td class="data-value" style="padding: 6px 0;">₱{{ number_format((float) $payment->reservation->totalPaid(), 2) }}</td>
            </tr>
            @php
                $remaining = max(0, (float)$payment->reservation->total_price_php - (float)$payment->reservation->totalPaid());
            @endphp
            <tr>
                <td class="data-label" style="padding: 6px 0; font-weight: 700;">Remaining Balance Due</td>
                <td class="data-value" style="padding: 6px 0; font-weight: 700; color: {{ $remaining > 0 ? '#b06000' : '#137333' }};">
                    ₱{{ number_format($remaining, 2) }}
                </td>
            </tr>
        </table>
    </div>

    @if(!empty($payment->notes))
        <div style="margin: 15px 0; padding: 12px 16px; background: #fdfbf7; border-radius: 6px; font-size: 13px; color: #555; border: 1px solid #e5dfd2;">
            <strong>Transaction Notes:</strong> {{ $payment->notes }}
        </div>
    @endif

    <div style="text-align: center; margin-top: 25px;">
        <p style="font-size: 13px; color: #666;">Thank you for your business. We look forward to your arrival!</p>
    </div>
@endsection

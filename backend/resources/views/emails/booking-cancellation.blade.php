@extends('emails.layout')

@section('content')
    <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-danger">Reservation Cancelled</span>
        <h2 style="margin: 8px 0; color: #13382c; font-size: 22px;">Notice of Reservation Cancellation</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Booking Reference: <strong style="color: #13382c;">{{ $reservation->booking_reference }}</strong></p>
    </div>

    <p class="greeting">Dear {{ $reservation->guest_name_snapshot }},</p>
    <p>This message confirms that your reservation at Golden Resort has been cancelled.</p>

    <div class="card" style="background-color: #fff9f9; border-color: #f7d6d5;">
        <div style="font-weight: 700; color: #c5221f; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #f7d6d5; padding-bottom: 8px;">
            Cancelled Reservation Details
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td class="data-label" style="padding: 6px 0;">Accommodation</td>
                <td class="data-value" style="padding: 6px 0;">{{ $reservation->room->name ?? 'Room' }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Original Dates</td>
                <td class="data-value" style="padding: 6px 0;">
                    {{ \Carbon\Carbon::parse($reservation->check_in)->format('M d, Y') }} &rarr; {{ \Carbon\Carbon::parse($reservation->check_out)->format('M d, Y') }}
                </td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Total Booking Value</td>
                <td class="data-value" style="padding: 6px 0;">₱{{ number_format((float) $reservation->total_price_php, 2) }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Total Paid Amount</td>
                <td class="data-value" style="padding: 6px 0;">₱{{ number_format((float) $reservation->totalPaid(), 2) }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Updated Status</td>
                <td class="data-value" style="padding: 6px 0; color: #c5221f; font-weight: 700; text-transform: uppercase;">
                    CANCELLED
                </td>
            </tr>
        </table>
    </div>

    <div style="margin: 20px 0; padding: 14px 18px; background: #fdfbf7; border-radius: 8px; border: 1px solid #e5dfd2; font-size: 13px;">
        <strong style="color: #13382c;">Refund & Policy Inquiries:</strong>
        <p style="margin: 6px 0 0 0; color: #555;">If you made payments towards this reservation and are eligible for a refund according to our resort policy, our reservations team will process it accordingly. For questions or to rebook, please reply to this email or contact front desk support.</p>
    </div>

    <div style="text-align: center; margin-top: 25px;">
        <p style="font-size: 13px; color: #666;">We hope to have the opportunity to welcome you to Golden Resort in the future.</p>
    </div>
@endsection

@extends('emails.layout')

@section('content')
    <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-success">Upcoming Stay</span>
        <h2 style="margin: 8px 0; color: #13382c; font-size: 22px;">We Look Forward to Welcoming You!</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Booking Reference: <strong style="color: #13382c;">{{ $reservation->booking_reference }}</strong></p>
    </div>

    <p class="greeting">Mabuhay, {{ $reservation->guest_name_snapshot }}!</p>
    <p>Your tropical getaway at Golden Resort is just around the corner! We are eager to provide you with a memorable and relaxing resort stay.</p>

    <div class="card">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #e5dfd2; padding-bottom: 8px;">
            Check-In & Arrival Information
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td class="data-label" style="padding: 6px 0;">Arrival Date</td>
                <td class="data-value highlight-value" style="padding: 6px 0; color: #13382c;">
                    {{ \Carbon\Carbon::parse($reservation->check_in)->format('l, F j, Y') }}
                </td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Standard Check-In Time</td>
                <td class="data-value" style="padding: 6px 0;">From 2:00 PM onward</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Standard Check-Out Time</td>
                <td class="data-value" style="padding: 6px 0;">Until 12:00 PM (Noon)</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Reserved Accommodation</td>
                <td class="data-value" style="padding: 6px 0;">{{ $reservation->room->name ?? 'Room' }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Guests</td>
                <td class="data-value" style="padding: 6px 0;">{{ $reservation->total_guests }} Guest(s)</td>
            </tr>
        </table>
    </div>

    <div style="margin: 20px 0; padding: 16px 20px; background: #fdfbf7; border-radius: 8px; border: 1px solid #e5dfd2;">
        <h3 style="margin: 0 0 8px 0; color: #13382c; font-size: 15px;">Key Arrival Tips:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 13px; line-height: 1.6;">
            <li><strong>Valid ID Required:</strong> Please present a government-issued photo ID upon registration at the front desk.</li>
            <li><strong>Early Arrival:</strong> Guests arriving early are welcome to relax in our garden lounge and enjoy resort amenities while rooms are prepared.</li>
            <li><strong>Directions & Transfers:</strong> Contact our concierge for boat transfers from Batangas Port or island shuttle pickups.</li>
        </ul>
    </div>

    <div style="text-align: center; margin-top: 25px;">
        <p style="font-size: 13px; color: #666;">Safe travels and see you soon at Golden Resort!</p>
    </div>
@endsection

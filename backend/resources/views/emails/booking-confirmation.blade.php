@extends('emails.layout')

@section('content')
    <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-success">Reservation Received</span>
        <h2 style="margin: 8px 0; color: #13382c; font-size: 22px;">Booking Confirmation</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Booking Reference: <strong style="color: #13382c;">{{ $reservation->booking_reference }}</strong></p>
    </div>

    <p class="greeting">Mabuhay, {{ $reservation->guest_name_snapshot }}!</p>
    <p>Thank you for choosing Golden Resort. We have received your booking request and our team is preparing for your upcoming stay.</p>

    <div class="card">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #e5dfd2; padding-bottom: 8px;">
            Stay & Accommodation Details
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td class="data-label" style="padding: 6px 0;">Accommodation</td>
                <td class="data-value" style="padding: 6px 0;">{{ $reservation->room->name ?? 'Room' }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Check-In Date</td>
                <td class="data-value" style="padding: 6px 0;">{{ \Carbon\Carbon::parse($reservation->check_in)->format('M d, Y') }} (from 2:00 PM)</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Check-Out Date</td>
                <td class="data-value" style="padding: 6px 0;">{{ \Carbon\Carbon::parse($reservation->check_out)->format('M d, Y') }} (until 12:00 PM)</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Length of Stay</td>
                <td class="data-value" style="padding: 6px 0;">{{ $reservation->nights }} night(s)</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Guests</td>
                <td class="data-value" style="padding: 6px 0;">{{ $reservation->total_guests }} Guest(s) ({{ $reservation->adults }} Adults, {{ $reservation->children }} Children)</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Status</td>
                <td class="data-value" style="padding: 6px 0; text-transform: uppercase;">{{ $reservation->status }}</td>
            </tr>
        </table>
    </div>

    <div class="card" style="background-color: #f7f9f6; border-color: #d8e5d6;">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #d8e5d6; padding-bottom: 8px;">
            Financial Summary
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td class="data-label" style="padding: 6px 0;">Nightly Rate</td>
                <td class="data-value" style="padding: 6px 0;">₱{{ number_format((float) $reservation->nightly_rate_php, 2) }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Total Booking Price</td>
                <td class="data-value highlight-value" style="padding: 6px 0; color: #13382c;">₱{{ number_format((float) $reservation->total_price_php, 2) }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Payment Status</td>
                <td class="data-value" style="padding: 6px 0; text-transform: uppercase; color: {{ $reservation->paymentStatus() === 'paid' ? '#137333' : '#b06000' }};">
                    {{ str_replace('_', ' ', $reservation->paymentStatus()) }}
                </td>
            </tr>
        </table>
    </div>

    @if(!empty($reservation->special_requests))
        <div style="margin: 15px 0; padding: 12px 16px; background: #fff8e8; border-radius: 6px; font-size: 13px; color: #73510d; border-left: 3px solid #c6a66b;">
            <strong>Special Requests:</strong> {{ $reservation->special_requests }}
        </div>
    @endif

    <div style="text-align: center; margin-top: 25px;">
        <p style="font-size: 13px; color: #666;">We look forward to welcoming you to Golden Resort!</p>
    </div>
@endsection

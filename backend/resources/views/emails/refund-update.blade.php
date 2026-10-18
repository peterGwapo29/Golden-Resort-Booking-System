@extends('emails.layout')

@section('content')
    <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge {{ $refund->status === 'completed' ? 'badge-success' : 'badge-info' }}">Refund Update</span>
        <h2 style="margin: 8px 0; color: #13382c; font-size: 22px;">Refund {{ ucfirst($refund->status) }}</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Refund Reference: <strong style="color: #13382c;">{{ $refund->refund_reference }}</strong></p>
    </div>

    <p class="greeting">Dear {{ $refund->reservation->guest_name_snapshot }},</p>
    <p>This is an official notice regarding the refund issued for your reservation at Golden Resort.</p>

    <div class="card" style="background-color: #f7f9f6; border-color: #d8e5d6;">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #d8e5d6; padding-bottom: 8px;">
            Refund Breakdown
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td class="data-label" style="padding: 6px 0;">Refund Amount</td>
                <td class="data-value highlight-value" style="padding: 6px 0; color: #137333;">₱{{ number_format((float) $refund->amount, 2) }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Original Payment Ref</td>
                <td class="data-value" style="padding: 6px 0;">{{ $refund->payment->payment_reference ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Booking Reference</td>
                <td class="data-value" style="padding: 6px 0;">{{ $refund->reservation->booking_reference }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Refund Reason</td>
                <td class="data-value" style="padding: 6px 0;">{{ $refund->reason }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Status</td>
                <td class="data-value" style="padding: 6px 0; font-weight: 700; text-transform: uppercase; color: {{ $refund->status === 'completed' ? '#137333' : '#b06000' }};">
                    {{ $refund->status }}
                </td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Processed On</td>
                <td class="data-value" style="padding: 6px 0;">{{ \Carbon\Carbon::parse($refund->created_at)->format('M d, Y h:i A') }}</td>
            </tr>
        </table>
    </div>

    @if(!empty($refund->notes))
        <div style="margin: 15px 0; padding: 12px 16px; background: #fdfbf7; border-radius: 6px; font-size: 13px; color: #555; border: 1px solid #e5dfd2;">
            <strong>Staff Notes:</strong> {{ $refund->notes }}
        </div>
    @endif

    <div style="margin: 20px 0; padding: 14px 18px; background: #fdfbf7; border-radius: 8px; border: 1px solid #e5dfd2; font-size: 13px;">
        <strong style="color: #13382c;">Processing Time:</strong>
        <p style="margin: 6px 0 0 0; color: #555;">Credit card or e-wallet refunds typically post within 3 to 7 banking days depending on your financial institution's processing schedule.</p>
    </div>

    <div style="text-align: center; margin-top: 25px;">
        <p style="font-size: 13px; color: #666;">Thank you for your patience and understanding.</p>
    </div>
@endsection

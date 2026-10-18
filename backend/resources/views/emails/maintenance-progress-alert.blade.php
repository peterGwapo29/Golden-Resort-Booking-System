@extends('emails.layout')

@section('content')
    <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-info">
            Progress Update: {{ strtoupper(str_replace('_', ' ', $currentStatus)) }}
        </span>
        <h2 style="margin: 8px 0; color: #13382c; font-size: 22px;">Maintenance Progress Alert</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Tracking #: <strong style="color: #13382c;">{{ $request->tracking_number }}</strong></p>
    </div>

    <p class="greeting">Attention Operations &amp; Administration,</p>
    <p>Staff member <strong>{{ $staff->name }}</strong> has recorded a work progress update on the following maintenance task:</p>

    <div class="card">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #e5dfd2; padding-bottom: 8px;">
            Task Overview
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td class="data-label" style="padding: 6px 0;">Work Order</td>
                <td class="data-value" style="padding: 6px 0; font-weight: 600;">{{ $request->title }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Resource</td>
                <td class="data-value" style="padding: 6px 0;">{{ $request->resource_name }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Current Status</td>
                <td class="data-value" style="padding: 6px 0; font-weight: 700; text-transform: uppercase;">
                    {{ str_replace('_', ' ', $currentStatus) }}
                </td>
            </tr>
            @if ($recordedCost !== null && $recordedCost > 0)
            <tr>
                <td class="data-label" style="padding: 6px 0;">Cumulative Repair Cost</td>
                <td class="data-value" style="padding: 6px 0; font-weight: 700; color: #13382c;">
                    ₱{{ number_format((float) $request->cost_php, 2) }}
                </td>
            </tr>
            @endif
        </table>
    </div>

    <div class="card" style="background-color: #fcfbf9;">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 6px; font-size: 13px;">
            Recorded Progress Notes:
        </div>
        <p style="margin: 0; font-size: 13px; color: #333; font-family: monospace; white-space: pre-wrap;">{{ $progressNotes }}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ config('app.url') }}/admin/maintenance" class="btn" style="background-color: #13382c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            Open Maintenance Hub &rarr;
        </a>
    </div>
@endsection

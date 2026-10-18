@extends('emails.layout')

@section('content')
    <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-warning" style="background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;">
            Supervisor Review Required
        </span>
        <h2 style="margin: 8px 0; color: #13382c; font-size: 22px;">Completion Submitted</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Tracking #: <strong style="color: #13382c;">{{ $request->tracking_number }}</strong></p>
    </div>

    <p class="greeting">Attention Resort Administrators &amp; Supervisors,</p>
    <p>Technician <strong>{{ $technician->name }}</strong> has finished work on the following maintenance task and submitted it for supervisor inspection and approval:</p>

    <div class="card">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #e5dfd2; padding-bottom: 8px;">
            Work Order Summary
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td class="data-label" style="padding: 6px 0;">Work Order</td>
                <td class="data-value" style="padding: 6px 0; font-weight: 600;">{{ $request->title }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Resource</td>
                <td class="data-value" style="padding: 6px 0;">{{ $request->resource_name }} ({{ ucfirst($request->resource_type) }})</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Assigned Staff</td>
                <td class="data-value" style="padding: 6px 0;">{{ $technician->name }} ({{ $technician->email }})</td>
            </tr>
            @if ($finalCost !== null && $finalCost > 0)
            <tr>
                <td class="data-label" style="padding: 6px 0;">Final Cost Incurred</td>
                <td class="data-value" style="padding: 6px 0; font-weight: 700; color: #13382c;">
                    ₱{{ number_format((float) $finalCost, 2) }}
                </td>
            </tr>
            @endif
        </table>
    </div>

    <div class="card" style="background-color: #fcfbf9;">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 6px; font-size: 13px;">
            Technician Completion Notes:
        </div>
        <p style="margin: 0; font-size: 13px; color: #333; font-family: monospace; white-space: pre-wrap;">{{ $completionNotes }}</p>
    </div>

    <p style="font-size: 13px; color: #555;">
        Please review the uploaded photo evidence and approve the completed repair or request revisions in the admin portal.
    </p>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ config('app.url') }}/admin/maintenance" class="btn" style="background-color: #13382c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            Review Work in Admin Portal &rarr;
        </a>
    </div>
@endsection

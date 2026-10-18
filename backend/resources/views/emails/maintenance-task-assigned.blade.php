@extends('emails.layout')

@section('content')
    <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge {{ $isReassignment ? 'badge-warning' : 'badge-info' }}">
            {{ $isReassignment ? 'Task Reassigned' : 'New Task Assigned' }}
        </span>
        <h2 style="margin: 8px 0; color: #13382c; font-size: 22px;">Maintenance Work Order</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Tracking #: <strong style="color: #13382c;">{{ $request->tracking_number }}</strong></p>
    </div>

    <p class="greeting">Hello {{ $assignee->name }},</p>
    <p>
        @if ($isReassignment)
            You have been assigned to take over the following maintenance work order at Golden Resort:
        @else
            A new maintenance work order has been assigned to you at Golden Resort:
        @endif
    </p>

    <div class="card">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #e5dfd2; padding-bottom: 8px;">
            Work Order Details
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td class="data-label" style="padding: 6px 0;">Title</td>
                <td class="data-value" style="padding: 6px 0; font-weight: 600;">{{ $request->title }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Resource / Asset</td>
                <td class="data-value" style="padding: 6px 0;">{{ $request->resource_name }} ({{ ucfirst($request->resource_type) }})</td>
            </tr>
            @if ($request->location)
            <tr>
                <td class="data-label" style="padding: 6px 0;">Location</td>
                <td class="data-value" style="padding: 6px 0;">{{ $request->location }}</td>
            </tr>
            @endif
            <tr>
                <td class="data-label" style="padding: 6px 0;">Priority</td>
                <td class="data-value" style="padding: 6px 0; font-weight: 700; text-transform: uppercase;">
                    {{ $request->priority }}
                </td>
            </tr>
            @if ($request->due_date)
            <tr>
                <td class="data-label" style="padding: 6px 0;">Target Due Date</td>
                <td class="data-value" style="padding: 6px 0; color: #b91c1c; font-weight: 600;">
                    {{ \Carbon\Carbon::parse($request->due_date)->format('M d, Y h:i A') }}
                </td>
            </tr>
            @endif
        </table>
    </div>

    @if ($notes)
    <div class="card" style="background-color: #fcfbf9;">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 6px; font-size: 13px;">
            Supervisor Instructions / Notes:
        </div>
        <p style="margin: 0; font-size: 13px; color: #444; font-style: italic;">
            &ldquo;{{ $notes }}&rdquo;
        </p>
    </div>
    @endif

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ config('app.url') }}/staff/maintenance" class="btn" style="background-color: #13382c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            View Task in Staff Portal &rarr;
        </a>
    </div>
@endsection

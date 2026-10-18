@extends('emails.layout')

@section('content')
    <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge {{ $action === 'approve' ? 'badge-success' : 'badge-warning' }}" style="{{ $action === 'approve' ? 'background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;' : 'background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca;' }}">
            {{ $action === 'approve' ? 'Work Approved & Resolved' : 'Revision Requested' }}
        </span>
        <h2 style="margin: 8px 0; color: #13382c; font-size: 22px;">Supervisor Review Decision</h2>
        <p style="color: #666; margin: 0; font-size: 14px;">Tracking #: <strong style="color: #13382c;">{{ $request->tracking_number }}</strong></p>
    </div>

    <p class="greeting">Hello {{ $assignee->name }},</p>
    <p>
        Supervisor <strong>{{ $reviewer->name }}</strong> has reviewed your submitted completion for maintenance task <strong>{{ $request->title }}</strong>.
    </p>

    <div class="card">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #e5dfd2; padding-bottom: 8px;">
            Decision Summary
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
                <td class="data-label" style="padding: 6px 0;">Work Order</td>
                <td class="data-value" style="padding: 6px 0; font-weight: 600;">{{ $request->title }}</td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Review Result</td>
                <td class="data-value" style="padding: 6px 0; font-weight: 700; {{ $action === 'approve' ? 'color: #065f46;' : 'color: #b91c1c;' }}">
                    {{ $action === 'approve' ? 'APPROVED & RESOLVED' : 'REVISION REQUESTED' }}
                </td>
            </tr>
            <tr>
                <td class="data-label" style="padding: 6px 0;">Reviewed By</td>
                <td class="data-value" style="padding: 6px 0;">{{ $reviewer->name }} ({{ $reviewer->role }})</td>
            </tr>
        </table>
    </div>

    @if ($notes)
    <div class="card" style="background-color: #fcfbf9;">
        <div style="font-weight: 700; color: #13382c; margin-bottom: 6px; font-size: 13px;">
            Supervisor Feedback / Instructions:
        </div>
        <p style="margin: 0; font-size: 13px; color: #333; font-family: monospace; white-space: pre-wrap;">{{ $notes }}</p>
    </div>
    @endif

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ config('app.url') }}/staff/maintenance" class="btn" style="background-color: #13382c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            Open Staff Portal &rarr;
        </a>
    </div>
@endsection

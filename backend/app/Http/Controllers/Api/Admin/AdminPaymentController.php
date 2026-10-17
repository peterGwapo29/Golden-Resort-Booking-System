<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateRefundRequest;
use App\Http\Requests\Admin\RecordPaymentRequest;
use App\Http\Requests\Admin\UpdatePaymentStatusRequest;
use App\Http\Requests\Admin\UpdateRefundStatusRequest;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use App\Services\FinancialCalculationService;
use App\Services\SecurityAuditLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminPaymentController extends Controller
{
    public function __construct(
        protected FinancialCalculationService $financialService
    ) {}

    /**
     * Display a paginated listing of recorded payments.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Payment::query()->with([
            'reservation.room',
            'recordedBy',
            'refunds.requestedBy',
            'refunds.approvedBy',
        ]);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('payment_reference', 'like', "%{$search}%")
                    ->orWhereHas('reservation', function ($rq) use ($search) {
                        $rq->where('booking_reference', 'like', "%{$search}%")
                            ->orWhere('guest_name_snapshot', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('payment_method') && $request->input('payment_method') !== 'all') {
            $query->where('payment_method', $request->input('payment_method'));
        }

        $payments = $query->latest('id')->paginate(15);

        $items = collect($payments->items())->map(function ($payment) {
            return [
                'id' => $payment->id,
                'payment_reference' => $payment->payment_reference,
                'reservation_id' => $payment->reservation_id,
                'booking_reference' => $payment->reservation?->booking_reference,
                'guest_name' => $payment->reservation?->guest_name_snapshot,
                'room_name' => $payment->reservation?->room?->name,
                'amount' => (float) $payment->amount,
                'currency' => $payment->currency,
                'payment_method' => $payment->payment_method,
                'status' => $payment->status,
                'notes' => $payment->notes,
                'recorded_by' => $payment->recordedBy?->name ?? 'Staff',
                'refunded_amount' => $payment->completedRefundsTotal(),
                'remaining_refundable' => $payment->remainingRefundable(),
                'refunds' => $payment->refunds->map(function ($r) {
                    return [
                        'id' => $r->id,
                        'refund_reference' => $r->refund_reference,
                        'amount' => (float) $r->amount,
                        'currency' => $r->currency,
                        'reason' => $r->reason,
                        'status' => $r->status,
                        'notes' => $r->notes,
                        'requested_by' => $r->requestedBy?->name ?? 'Staff',
                        'approved_by' => $r->approvedBy?->name,
                        'created_at' => $r->created_at?->toISOString(),
                    ];
                }),
                'created_at' => $payment->created_at?->toISOString(),
            ];
        });

        $metrics = $this->financialService->dashboardMetrics();

        return response()->json([
            'data' => $items,
            'summary' => [
                'gross_collections_php' => $metrics['gross_collections_php'],
                'completed_refunds_php' => $metrics['completed_refunds_php'],
                'net_collections_php' => $metrics['net_collections_php'],
                'pending_payments_php' => $metrics['pending_payments_php'],
                'total_completed_php' => $metrics['net_collections_php'], // Canonical net collections for primary revenue card
            ],
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    /**
     * Record a manual payment verified by an administrator.
     * Newly created payments are always initialized to 'pending' status.
     */
    public function store(RecordPaymentRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $reservation = Reservation::findOrFail($validated['reservation_id']);

        $remainingBalance = $this->financialService->outstandingBalance($reservation);

        if ((float) $validated['amount'] > ($remainingBalance + 0.01)) {
            return response()->json([
                'message' => 'The payment amount (₱'.number_format((float) $validated['amount'], 2).') exceeds the remaining balance of ₱'.number_format($remainingBalance, 2).'.',
                'errors' => [
                    'amount' => ['Payment amount cannot exceed the remaining balance of ₱'.number_format($remainingBalance, 2).'.'],
                ],
            ], 422);
        }

        $payment = DB::transaction(function () use ($validated, $reservation, $request) {
            $reference = 'PAY-'.Carbon::now()->format('Ymd').'-'.strtoupper(Str::random(4));

            return Payment::create([
                'reservation_id' => $reservation->id,
                'payment_reference' => $reference,
                'amount' => $validated['amount'],
                'currency' => 'PHP',
                'payment_method' => $validated['payment_method'],
                'status' => 'pending', // Strictly enforce pending on creation
                'notes' => $validated['notes'] ?? null,
                'recorded_by_user_id' => $request->user()->id,
            ]);
        });

        SecurityAuditLogger::log('payment.created', 'Payment recorded', [
            'payment_id' => $payment->id,
            'payment_reference' => $payment->payment_reference,
            'reservation_id' => $payment->reservation_id,
            'amount' => (float) $payment->amount,
            'status' => $payment->status,
        ]);

        $payment->load(['reservation', 'recordedBy']);

        return response()->json([
            'message' => 'Payment recorded successfully with pending status.',
            'data' => [
                'id' => $payment->id,
                'payment_reference' => $payment->payment_reference,
                'reservation_id' => $payment->reservation_id,
                'booking_reference' => $payment->reservation?->booking_reference,
                'amount' => (float) $payment->amount,
                'currency' => $payment->currency,
                'payment_method' => $payment->payment_method,
                'status' => $payment->status,
                'notes' => $payment->notes,
                'recorded_by' => $payment->recordedBy?->name ?? 'Staff',
                'refunded_amount' => 0.0,
                'remaining_refundable' => 0.0,
                'created_at' => $payment->created_at?->toISOString(),
            ],
        ], 201);
    }

    /**
     * Update an existing payment status with business validation and audit log.
     */
    public function updateStatus(UpdatePaymentStatusRequest $request, int $id): JsonResponse
    {
        $validated = $request->validated();
        $payment = Payment::with('reservation')->findOrFail($id);

        $newStatus = $validated['status'];
        $oldStatus = $payment->status;

        // Prevent tampering with payments that have active or completed refunds
        if (in_array($oldStatus, ['refunded', 'partially_refunded'], true) || $payment->completedRefundsTotal() > 0) {
            return response()->json([
                'message' => "Cannot directly modify the status of a {$oldStatus} payment with refund history.",
                'errors' => [
                    'status' => ['Payments with completed refunds cannot have their status altered directly.'],
                ],
            ], 422);
        }

        // Terminal failed/cancelled payments cannot transition arbitrarily to refunded without payment
        if (in_array($oldStatus, ['failed', 'cancelled'], true) && in_array($newStatus, ['refunded', 'partially_refunded'], true)) {
            return response()->json([
                'message' => "Cannot refund a payment with {$oldStatus} status.",
                'errors' => [
                    'status' => ['Only completed payments can be refunded.'],
                ],
            ], 422);
        }

        // If transitioning to completed, re-verify remaining balance to prevent accidental overpayment
        if ($newStatus === 'completed' && $oldStatus !== 'completed') {
            $reservation = $payment->reservation;
            $currentNet = $this->financialService->netCollections($reservation->id);
            $remaining = max(0, (float) $reservation->total_price_php - $currentNet);

            if ((float) $payment->amount > ($remaining + 0.01)) {
                return response()->json([
                    'message' => 'Cannot mark payment as completed: amount (₱'.number_format((float) $payment->amount, 2).') exceeds outstanding reservation balance (₱'.number_format($remaining, 2).').',
                    'errors' => [
                        'status' => ['Marking this payment as completed would exceed the reservation balance.'],
                    ],
                ], 422);
            }
        }

        DB::transaction(function () use ($payment, $validated, $newStatus, $oldStatus, $request) {
            $auditNote = !empty($validated['notes']) ? trim($validated['notes']) : null;
            $staffName = $request->user()?->name ?? 'Admin';
            $timestamp = Carbon::now()->format('M d, Y h:i A');

            if ($auditNote) {
                $statusLog = "[Status: {$oldStatus} → {$newStatus} by {$staffName} on {$timestamp}: {$auditNote}]";
                $payment->notes = trim(($payment->notes ? $payment->notes."\n" : '').$statusLog);
            }

            $payment->status = $newStatus;
            $payment->save();
        });

        SecurityAuditLogger::log('payment.status_updated', "Payment status updated from {$oldStatus} to {$newStatus}", [
            'payment_id' => $payment->id,
            'payment_reference' => $payment->payment_reference,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
        ]);

        $payment->load(['reservation', 'recordedBy', 'refunds']);

        $metrics = $this->financialService->dashboardMetrics();

        return response()->json([
            'message' => "Payment status updated to {$newStatus}.",
            'data' => [
                'id' => $payment->id,
                'payment_reference' => $payment->payment_reference,
                'reservation_id' => $payment->reservation_id,
                'booking_reference' => $payment->reservation?->booking_reference,
                'amount' => (float) $payment->amount,
                'currency' => $payment->currency,
                'payment_method' => $payment->payment_method,
                'status' => $payment->status,
                'notes' => $payment->notes,
                'recorded_by' => $payment->recordedBy?->name ?? 'Staff',
                'refunded_amount' => $payment->completedRefundsTotal(),
                'remaining_refundable' => $payment->remainingRefundable(),
                'created_at' => $payment->created_at?->toISOString(),
            ],
            'summary' => [
                'gross_collections_php' => $metrics['gross_collections_php'],
                'completed_refunds_php' => $metrics['completed_refunds_php'],
                'net_collections_php' => $metrics['net_collections_php'],
                'total_completed_php' => $metrics['net_collections_php'],
            ],
        ]);
    }

    /**
     * Issue a refund against a completed payment.
     */
    public function storeRefund(CreateRefundRequest $request, int $id): JsonResponse
    {
        $validated = $request->validated();

        $result = DB::transaction(function () use ($request, $validated, $id) {
            /** @var Payment $payment */
            $payment = Payment::query()
                ->with('reservation')
                ->lockForUpdate()
                ->findOrFail($id);

            if ($payment->status !== 'completed') {
                return [
                    'error' => true,
                    'status' => 422,
                    'payload' => [
                        'message' => 'Cannot refund payment: only completed payments can be refunded.',
                        'errors' => [
                            'payment' => ['Only completed payments are eligible for refunds.'],
                        ],
                    ],
                ];
            }

            $remainingRefundable = $payment->remainingRefundable();
            $refundAmount = (float) $validated['amount'];

            if ($refundAmount > ($remainingRefundable + 0.001)) {
                return [
                    'error' => true,
                    'status' => 422,
                    'payload' => [
                        'message' => 'The refund amount (₱'.number_format($refundAmount, 2).') exceeds the remaining refundable balance of ₱'.number_format($remainingRefundable, 2).'.',
                        'errors' => [
                            'amount' => ['Refund amount cannot exceed remaining refundable balance of ₱'.number_format($remainingRefundable, 2).'.'],
                        ],
                    ],
                ];
            }

            $reference = 'REF-'.Carbon::now()->format('Ymd').'-'.strtoupper(Str::random(4));
            $refundStatus = $validated['status'] ?? 'completed';

            $refund = Refund::create([
                'refund_reference' => $reference,
                'payment_id' => $payment->id,
                'reservation_id' => $payment->reservation_id,
                'amount' => $refundAmount,
                'currency' => 'PHP',
                'reason' => $validated['reason'],
                'status' => $refundStatus,
                'notes' => $validated['notes'] ?? null,
                'requested_by_user_id' => $request->user()->id,
                'approved_by_user_id' => $refundStatus === 'completed' ? $request->user()->id : null,
            ]);

            $staffName = $request->user()?->name ?? 'Admin';
            $timestamp = Carbon::now()->format('M d, Y h:i A');
            $statusLog = "[Refund Issued: ₱".number_format($refundAmount, 2)." ({$reference}) by {$staffName} on {$timestamp}: {$validated['reason']}]";
            $payment->notes = trim(($payment->notes ? $payment->notes."\n" : '').$statusLog);
            $payment->save();

            return [
                'error' => false,
                'refund' => $refund,
                'payment' => $payment,
            ];
        });

        if ($result['error']) {
            return response()->json($result['payload'], $result['status']);
        }

        /** @var Refund $refund */
        $refund = $result['refund'];
        /** @var Payment $payment */
        $payment = $result['payment'];

        SecurityAuditLogger::log('refund.created', 'Refund issued', [
            'refund_id' => $refund->id,
            'refund_reference' => $refund->refund_reference,
            'payment_id' => $payment->id,
            'amount' => (float) $refund->amount,
            'status' => $refund->status,
            'reason' => $refund->reason,
        ]);

        $refund->load(['requestedBy', 'approvedBy']);
        $reservationSummary = $this->financialService->reservationSummary($payment->reservation);
        $dashboardMetrics = $this->financialService->dashboardMetrics();

        return response()->json([
            'message' => "Refund of ₱".number_format((float) $refund->amount, 2)." processed successfully.",
            'data' => [
                'id' => $refund->id,
                'refund_reference' => $refund->refund_reference,
                'payment_id' => $refund->payment_id,
                'reservation_id' => $refund->reservation_id,
                'amount' => (float) $refund->amount,
                'currency' => $refund->currency,
                'reason' => $refund->reason,
                'status' => $refund->status,
                'notes' => $refund->notes,
                'requested_by' => $refund->requestedBy?->name ?? 'Staff',
                'approved_by' => $refund->approvedBy?->name,
                'created_at' => $refund->created_at?->toISOString(),
            ],
            'payment' => [
                'id' => $payment->id,
                'payment_reference' => $payment->payment_reference,
                'refunded_amount' => $payment->completedRefundsTotal(),
                'remaining_refundable' => $payment->remainingRefundable(),
            ],
            'reservation_summary' => $reservationSummary,
            'summary' => $dashboardMetrics,
        ], 201);
    }

    /**
     * Get all refunds for a specific payment.
     */
    public function refunds(int $id): JsonResponse
    {
        $payment = Payment::with(['refunds.requestedBy', 'refunds.approvedBy'])->findOrFail($id);

        $items = $payment->refunds->map(function ($r) {
            return [
                'id' => $r->id,
                'refund_reference' => $r->refund_reference,
                'amount' => (float) $r->amount,
                'currency' => $r->currency,
                'reason' => $r->reason,
                'status' => $r->status,
                'notes' => $r->notes,
                'requested_by' => $r->requestedBy?->name ?? 'Staff',
                'approved_by' => $r->approvedBy?->name,
                'created_at' => $r->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'payment_id' => $payment->id,
            'payment_reference' => $payment->payment_reference,
            'amount' => (float) $payment->amount,
            'refunded_amount' => $payment->completedRefundsTotal(),
            'remaining_refundable' => $payment->remainingRefundable(),
            'data' => $items,
        ]);
    }

    /**
     * List all resort refunds with pagination and filtering.
     */
    public function allRefunds(Request $request): JsonResponse
    {
        $query = Refund::query()->with(['payment.reservation', 'requestedBy', 'approvedBy']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('refund_reference', 'like', "%{$search}%")
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhereHas('payment', function ($pq) use ($search) {
                        $pq->where('payment_reference', 'like', "%{$search}%")
                            ->orWhereHas('reservation', function ($rq) use ($search) {
                                $rq->where('booking_reference', 'like', "%{$search}%")
                                    ->orWhere('guest_name_snapshot', 'like', "%{$search}%");
                            });
                    });
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        $refunds = $query->latest('id')->paginate(15);

        $items = collect($refunds->items())->map(function ($r) {
            return [
                'id' => $r->id,
                'refund_reference' => $r->refund_reference,
                'payment_id' => $r->payment_id,
                'payment_reference' => $r->payment?->payment_reference,
                'reservation_id' => $r->reservation_id,
                'booking_reference' => $r->payment?->reservation?->booking_reference,
                'guest_name' => $r->payment?->reservation?->guest_name_snapshot,
                'amount' => (float) $r->amount,
                'currency' => $r->currency,
                'reason' => $r->reason,
                'status' => $r->status,
                'notes' => $r->notes,
                'requested_by' => $r->requestedBy?->name ?? 'Staff',
                'approved_by' => $r->approvedBy?->name,
                'created_at' => $r->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'data' => $items,
            'summary' => [
                'total_completed_refunds_php' => $this->financialService->completedRefunds(),
            ],
            'meta' => [
                'current_page' => $refunds->currentPage(),
                'last_page' => $refunds->lastPage(),
                'per_page' => $refunds->perPage(),
                'total' => $refunds->total(),
            ],
        ]);
    }

    /**
     * Update status of an existing refund.
     */
    public function updateRefundStatus(UpdateRefundStatusRequest $request, int $id): JsonResponse
    {
        $validated = $request->validated();
        $refund = Refund::with('payment.reservation')->findOrFail($id);

        $newStatus = $validated['status'];
        $oldStatus = $refund->status;

        // Completed refunds cannot be reopened or reversed
        if ($oldStatus === 'completed' && $newStatus !== 'completed') {
            return response()->json([
                'message' => 'Completed refunds cannot be reopened or reversed.',
                'errors' => [
                    'status' => ['A completed refund has already disbursed funds and cannot change status.'],
                ],
            ], 422);
        }

        // If transitioning to completed, verify that the payment can still support this refund amount
        if ($newStatus === 'completed' && $oldStatus !== 'completed') {
            $payment = $refund->payment;
            $otherCompletedRefunds = (float) $payment->refunds()
                ->where('id', '!=', $refund->id)
                ->where('status', 'completed')
                ->sum('amount');
            $remainingAllowed = max(0, (float) $payment->amount - $otherCompletedRefunds);

            if ((float) $refund->amount > ($remainingAllowed + 0.001)) {
                return response()->json([
                    'message' => 'Cannot complete refund: amount (₱'.number_format((float) $refund->amount, 2).') exceeds available refundable amount on payment (₱'.number_format($remainingAllowed, 2).').',
                    'errors' => [
                        'status' => ['Completing this refund would exceed the original payment amount.'],
                    ],
                ], 422);
            }
        }

        DB::transaction(function () use ($refund, $validated, $newStatus, $oldStatus, $request) {
            $auditNote = !empty($validated['notes']) ? trim($validated['notes']) : null;
            $staffName = $request->user()?->name ?? 'Admin';
            $timestamp = Carbon::now()->format('M d, Y h:i A');

            if ($auditNote) {
                $statusLog = "[Refund Status: {$oldStatus} → {$newStatus} by {$staffName} on {$timestamp}: {$auditNote}]";
                $refund->notes = trim(($refund->notes ? $refund->notes."\n" : '').$statusLog);
            }

            if ($newStatus === 'completed' && ! $refund->approved_by_user_id) {
                $refund->approved_by_user_id = $request->user()->id;
            }

            $refund->status = $newStatus;
            $refund->save();
        });

        SecurityAuditLogger::log('refund.status_updated', "Refund status updated from {$oldStatus} to {$newStatus}", [
            'refund_id' => $refund->id,
            'refund_reference' => $refund->refund_reference,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'amount' => (float) $refund->amount,
        ]);

        $refund->load(['requestedBy', 'approvedBy', 'payment.reservation']);
        $metrics = $this->financialService->dashboardMetrics();

        return response()->json([
            'message' => "Refund status updated to {$newStatus}.",
            'data' => [
                'id' => $refund->id,
                'refund_reference' => $refund->refund_reference,
                'amount' => (float) $refund->amount,
                'status' => $refund->status,
                'notes' => $refund->notes,
                'requested_by' => $refund->requestedBy?->name ?? 'Staff',
                'approved_by' => $refund->approvedBy?->name,
                'created_at' => $refund->created_at?->toISOString(),
            ],
            'summary' => $metrics,
        ]);
    }
}

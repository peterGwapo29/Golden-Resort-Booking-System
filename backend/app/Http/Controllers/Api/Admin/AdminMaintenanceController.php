<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminMaintenanceRequest;
use App\Http\Resources\MaintenanceRequestResource;
use App\Models\MaintenanceRequest;
use App\Models\MaintenanceRequestAttachment;
use App\Models\MaintenanceRequestHistory;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminMaintenanceController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}
    /**
     * Display a listing of maintenance requests with filters and search.
     */
    public function index(Request $request): JsonResponse
    {
        $query = MaintenanceRequest::with(['room', 'reportedBy', 'assignedTo', 'attachments']);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('tracking_number', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhere('resource_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('priority') && $request->input('priority') !== 'all') {
            $query->where('priority', $request->input('priority'));
        }

        if ($request->filled('resource_type') && $request->input('resource_type') !== 'all') {
            $query->where('resource_type', $request->input('resource_type'));
        }

        if ($request->filled('assigned_to') && $request->input('assigned_to') !== 'all') {
            $assignedTo = $request->input('assigned_to');
            if ($assignedTo === 'my_tasks') {
                $query->where('assigned_to_user_id', $request->user()->id);
            } elseif ($assignedTo === 'unassigned') {
                $query->whereNull('assigned_to_user_id');
            } elseif (is_numeric($assignedTo)) {
                $query->where('assigned_to_user_id', (int) $assignedTo);
            }
        }

        if ($request->boolean('overdue_only')) {
            $query->overdue();
        }

        $perPage = min(max((int) $request->input('per_page', 15), 1), 100);
        $requests = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'data' => MaintenanceRequestResource::collection($requests->items()),
            'meta' => [
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
                'per_page' => $requests->perPage(),
                'total' => $requests->total(),
            ],
        ]);
    }

    /**
     * Retrieve aggregated maintenance statistics.
     */
    public function stats(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;

        $totalActive = MaintenanceRequest::active()->count();
        $urgentHigh = MaintenanceRequest::active()
            ->whereIn('priority', ['urgent', 'high'])
            ->count();
        $inProgress = MaintenanceRequest::where('status', 'in_progress')->count();
        $pendingReview = MaintenanceRequest::pendingReview()->count();
        $resolved = MaintenanceRequest::where('status', 'resolved')->count();
        $overdue = MaintenanceRequest::overdue()->count();
        $totalCost = (float) MaintenanceRequest::sum('cost_php');

        $assignedToMe = $userId ? MaintenanceRequest::where('assigned_to_user_id', $userId)
            ->whereNotIn('status', ['resolved', 'cancelled'])
            ->count() : 0;

        return response()->json([
            'total_active' => $totalActive,
            'urgent_high' => $urgentHigh,
            'in_progress' => $inProgress,
            'pending_review' => $pendingReview,
            'resolved' => $resolved,
            'overdue' => $overdue,
            'assigned_to_me' => $assignedToMe,
            'total_cost_php' => $totalCost,
        ]);
    }

    /**
     * Get staff members available for task assignments.
     */
    public function assignees(): JsonResponse
    {
        $assignees = User::query()
            ->where('is_active', true)
            ->whereIn('role', ['admin', 'manager', 'maintenance', 'staff', 'housekeeper'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'department']);

        return response()->json([
            'data' => $assignees,
        ]);
    }

    /**
     * Display the specified maintenance request.
     */
    public function show(int $id): JsonResponse
    {
        $maintenanceRequest = MaintenanceRequest::with(['room', 'reportedBy', 'assignedTo', 'attachments', 'history.user', 'history.fromAssignedTo', 'history.toAssignedTo'])
            ->findOrFail($id);

        return (new MaintenanceRequestResource($maintenanceRequest))->response();
    }

    /**
     * Store a newly created maintenance request with optional attachments.
     */
    public function store(AdminMaintenanceRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();
        $validated['reported_by_user_id'] = $user?->id;

        unset($validated['attachments']);

        $maintenanceRequest = DB::transaction(function () use ($validated, $request, $user) {
            if (! empty($validated['assigned_to_user_id'])) {
                $validated['assigned_at'] = now();
                $validated['status'] = $validated['status'] ?? 'assigned';
            }

            $record = MaintenanceRequest::create($validated);

            $changes = [
                'status' => ['from' => null, 'to' => $record->status],
            ];
            if ($record->assigned_to_user_id) {
                $assignee = User::find($record->assigned_to_user_id);
                $changes['assigned_to'] = [
                    'from' => null,
                    'to' => $record->assigned_to_user_id,
                    'to_name' => $assignee?->name,
                ];
            }
            if ($record->priority) {
                $changes['priority'] = ['from' => null, 'to' => $record->priority];
            }

            // Log initial creation in history
            MaintenanceRequestHistory::create([
                'maintenance_request_id' => $record->id,
                'user_id' => $user?->id,
                'actor_role' => $user?->role ?? 'staff',
                'action' => 'created',
                'to_status' => $record->status,
                'to_assigned_to_user_id' => $record->assigned_to_user_id,
                'notes' => 'Maintenance request reported.',
                'changes_payload' => $changes,
            ]);

            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $originalName = $file->getClientOriginalName();
                    $mimeType = $file->getClientMimeType() ?: $file->getMimeType();
                    $fileSize = $file->getSize();
                    $extension = $file->getClientOriginalExtension() ?: 'bin';
                    $filename = Str::uuid().'.'.strtolower($extension);
                    $path = $file->storeAs("maintenance/{$record->id}", $filename, 'public');

                    MaintenanceRequestAttachment::create([
                        'maintenance_request_id' => $record->id,
                        'file_path' => $path,
                        'file_name' => $originalName,
                        'file_type' => $mimeType,
                        'file_size' => $fileSize,
                        'uploaded_by_user_id' => $user?->id,
                    ]);
                }
            }

            return $record;
        });

        if ($maintenanceRequest->assigned_to_user_id) {
            try {
                $this->notificationService->sendMaintenanceTaskAssigned($maintenanceRequest, false, 'Initial assignment on request creation.');
            } catch (\Throwable $e) {
                Log::error('Failed to dispatch maintenance assignment notification: '.$e->getMessage());
            }
        }

        $maintenanceRequest->load(['room', 'reportedBy', 'assignedTo', 'attachments', 'history.user', 'history.fromAssignedTo', 'history.toAssignedTo']);

        return (new MaintenanceRequestResource($maintenanceRequest))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Assign or reassign a maintenance request to an eligible staff member.
     */
    public function assign(Request $request, int $id): JsonResponse
    {
        $maintenanceRequest = MaintenanceRequest::findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'assigned_to_user_id' => ['required', 'integer', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $assignee = User::findOrFail($validated['assigned_to_user_id']);
        if (! $assignee->is_active) {
            return response()->json(['message' => 'Cannot assign task to a deactivated user.'], 422);
        }

        $isReassignment = false;

        DB::transaction(function () use ($maintenanceRequest, $validated, $user, $assignee, &$isReassignment) {
            $fromAssignee = $maintenanceRequest->assigned_to_user_id;
            $fromAssigneeUser = $maintenanceRequest->assignedTo;
            $fromStatus = $maintenanceRequest->status;

            $isReassignment = $fromAssignee && $fromAssignee !== (int) $validated['assigned_to_user_id'];
            $toStatus = in_array($fromStatus, ['reported', 'assigned'], true) ? 'assigned' : $fromStatus;

            $changes = [];
            if ($fromAssignee !== (int) $validated['assigned_to_user_id']) {
                $changes['assigned_to'] = [
                    'from' => $fromAssignee,
                    'from_name' => $fromAssigneeUser?->name,
                    'to' => (int) $validated['assigned_to_user_id'],
                    'to_name' => $assignee->name,
                ];
            }
            if ($fromStatus !== $toStatus) {
                $changes['status'] = [
                    'from' => $fromStatus,
                    'to' => $toStatus,
                ];
            }
            if (array_key_exists('due_date', $validated)) {
                $fromDate = $maintenanceRequest->due_date?->toISOString();
                if ($fromDate !== $validated['due_date']) {
                    $changes['due_date'] = [
                        'from' => $fromDate,
                        'to' => $validated['due_date'],
                    ];
                }
            }

            $updateData = [
                'assigned_to_user_id' => $validated['assigned_to_user_id'],
                'assigned_at' => now(),
                'status' => $toStatus,
            ];

            if (array_key_exists('due_date', $validated)) {
                $updateData['due_date'] = $validated['due_date'];
            }

            $maintenanceRequest->update($updateData);

            MaintenanceRequestHistory::create([
                'maintenance_request_id' => $maintenanceRequest->id,
                'user_id' => $user->id,
                'actor_role' => $user->role ?? 'admin',
                'action' => $isReassignment ? 'reassigned' : 'assigned',
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'from_assigned_to_user_id' => $fromAssignee,
                'to_assigned_to_user_id' => $validated['assigned_to_user_id'],
                'notes' => $validated['notes'] ?? ($isReassignment ? 'Reassigned to new staff member.' : 'Assigned to staff member.'),
                'changes_payload' => $changes,
            ]);
        });

        try {
            $this->notificationService->sendMaintenanceTaskAssigned(
                $maintenanceRequest,
                $isReassignment,
                $validated['notes'] ?? null
            );
        } catch (\Throwable $e) {
            Log::error('Failed to dispatch maintenance assignment notification: '.$e->getMessage());
        }

        $maintenanceRequest->load(['room', 'reportedBy', 'assignedTo', 'attachments', 'history.user', 'history.fromAssignedTo', 'history.toAssignedTo']);

        return (new MaintenanceRequestResource($maintenanceRequest))->response();
    }

    /**
     * Acknowledge or accept an assigned task.
     */
    public function acknowledge(Request $request, int $id): JsonResponse
    {
        $maintenanceRequest = MaintenanceRequest::findOrFail($id);
        $user = $request->user();

        // Enforce ownership: only assigned staff or manager/admin
        if ($maintenanceRequest->assigned_to_user_id !== $user->id && ! $user->hasPermission('maintenance.manage')) {
            return response()->json(['message' => 'You are not authorized to acknowledge this request.'], 403);
        }

        if (in_array($maintenanceRequest->status, ['resolved', 'cancelled'], true)) {
            return response()->json(['message' => 'Cannot acknowledge a closed or cancelled request.'], 422);
        }

        DB::transaction(function () use ($maintenanceRequest, $user, $request) {
            $fromStatus = $maintenanceRequest->status;
            $maintenanceRequest->update([
                'status' => 'acknowledged',
                'acknowledged_at' => now(),
            ]);

            MaintenanceRequestHistory::create([
                'maintenance_request_id' => $maintenanceRequest->id,
                'user_id' => $user->id,
                'actor_role' => $user->role ?? 'staff',
                'action' => 'acknowledged',
                'from_status' => $fromStatus,
                'to_status' => 'acknowledged',
                'notes' => $request->input('notes') ?: 'Assignment acknowledged by staff member.',
                'changes_payload' => [
                    'status' => ['from' => $fromStatus, 'to' => 'acknowledged'],
                ],
            ]);
        });

        $maintenanceRequest->load(['room', 'reportedBy', 'assignedTo', 'attachments', 'history.user', 'history.fromAssignedTo', 'history.toAssignedTo']);

        return (new MaintenanceRequestResource($maintenanceRequest))->response();
    }

    /**
     * Start work on a maintenance request.
     */
    public function start(Request $request, int $id): JsonResponse
    {
        $maintenanceRequest = MaintenanceRequest::findOrFail($id);
        $user = $request->user();

        if ($maintenanceRequest->assigned_to_user_id !== $user->id && ! $user->hasPermission('maintenance.manage')) {
            return response()->json(['message' => 'You are not authorized to start work on this request.'], 403);
        }

        if (in_array($maintenanceRequest->status, ['resolved', 'cancelled'], true)) {
            return response()->json(['message' => 'Cannot start work on a closed or cancelled request.'], 422);
        }

        DB::transaction(function () use ($maintenanceRequest, $user, $request) {
            $fromStatus = $maintenanceRequest->status;
            $maintenanceRequest->update([
                'status' => 'in_progress',
                'started_at' => $maintenanceRequest->started_at ?? now(),
            ]);

            MaintenanceRequestHistory::create([
                'maintenance_request_id' => $maintenanceRequest->id,
                'user_id' => $user->id,
                'actor_role' => $user->role ?? 'staff',
                'action' => 'started',
                'from_status' => $fromStatus,
                'to_status' => 'in_progress',
                'notes' => $request->input('notes') ?: 'Work commenced by technician.',
                'changes_payload' => [
                    'status' => ['from' => $fromStatus, 'to' => 'in_progress'],
                ],
            ]);
        });

        $maintenanceRequest->load(['room', 'reportedBy', 'assignedTo', 'attachments', 'history.user', 'history.fromAssignedTo', 'history.toAssignedTo']);

        return (new MaintenanceRequestResource($maintenanceRequest))->response();
    }

    /**
     * Record work progress notes and optional evidence attachments.
     */
    public function progress(Request $request, int $id): JsonResponse
    {
        $maintenanceRequest = MaintenanceRequest::findOrFail($id);
        $user = $request->user();

        if ($maintenanceRequest->assigned_to_user_id !== $user->id && ! $user->hasPermission('maintenance.manage')) {
            return response()->json(['message' => 'You are not authorized to update progress on this request.'], 403);
        }

        $validated = $request->validate([
            'notes' => ['required', 'string'],
            'cost_php' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'string', Rule::in(['in_progress', 'on_hold'])],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['file', 'mimes:jpeg,png,jpg,webp,pdf', 'max:10240'],
        ]);

        DB::transaction(function () use ($maintenanceRequest, $validated, $user, $request) {
            $fromStatus = $maintenanceRequest->status;
            $toStatus = $validated['status'] ?? $fromStatus;
            $fromCost = (float) $maintenanceRequest->cost_php;

            $changes = [];
            if ($fromStatus !== $toStatus) {
                $changes['status'] = ['from' => $fromStatus, 'to' => $toStatus];
            }
            if (isset($validated['cost_php']) && (float) $validated['cost_php'] !== $fromCost) {
                $changes['cost_php'] = ['from' => $fromCost, 'to' => (float) $validated['cost_php']];
            }

            $updateData = ['status' => $toStatus];
            if (isset($validated['cost_php'])) {
                $updateData['cost_php'] = $validated['cost_php'];
            }
            if ($validated['notes']) {
                $existingNotes = $maintenanceRequest->repair_notes;
                $timestamp = now()->format('Y-m-d H:i');
                $updateData['repair_notes'] = $existingNotes
                    ? "{$existingNotes}\n[{$timestamp} - {$user->name}]: {$validated['notes']}"
                    : "[{$timestamp} - {$user->name}]: {$validated['notes']}";
            }

            $maintenanceRequest->update($updateData);

            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $originalName = $file->getClientOriginalName();
                    $mimeType = $file->getClientMimeType() ?: $file->getMimeType();
                    $fileSize = $file->getSize();
                    $extension = $file->getClientOriginalExtension() ?: 'bin';
                    $filename = Str::uuid().'.'.strtolower($extension);
                    $path = $file->storeAs("maintenance/{$maintenanceRequest->id}", $filename, 'public');

                    MaintenanceRequestAttachment::create([
                        'maintenance_request_id' => $maintenanceRequest->id,
                        'file_path' => $path,
                        'file_name' => $originalName,
                        'file_type' => $mimeType,
                        'file_size' => $fileSize,
                        'uploaded_by_user_id' => $user->id,
                    ]);
                }
            }

            MaintenanceRequestHistory::create([
                'maintenance_request_id' => $maintenanceRequest->id,
                'user_id' => $user->id,
                'actor_role' => $user->role ?? 'staff',
                'action' => $toStatus === 'on_hold' ? 'put_on_hold' : 'progress_updated',
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'notes' => $validated['notes'],
                'changes_payload' => $changes,
            ]);
        });

        try {
            $this->notificationService->sendMaintenanceProgressAlert(
                $maintenanceRequest,
                $user,
                $validated['notes'],
                isset($validated['cost_php']) ? (float) $validated['cost_php'] : null
            );
        } catch (\Throwable $e) {
            Log::error('Failed to dispatch maintenance progress notification: '.$e->getMessage());
        }

        $maintenanceRequest->load(['room', 'reportedBy', 'assignedTo', 'attachments', 'history.user', 'history.fromAssignedTo', 'history.toAssignedTo']);

        return (new MaintenanceRequestResource($maintenanceRequest))->response();
    }

    /**
     * Submit work for completion review.
     */
    public function submitReview(Request $request, int $id): JsonResponse
    {
        $maintenanceRequest = MaintenanceRequest::findOrFail($id);
        $user = $request->user();

        if ($maintenanceRequest->assigned_to_user_id !== $user->id && ! $user->hasPermission('maintenance.manage')) {
            return response()->json(['message' => 'You are not authorized to submit completion for this request.'], 403);
        }

        $validated = $request->validate([
            'completion_notes' => ['required', 'string'],
            'cost_php' => ['nullable', 'numeric', 'min:0'],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['file', 'mimes:jpeg,png,jpg,webp,pdf', 'max:10240'],
        ]);

        DB::transaction(function () use ($maintenanceRequest, $validated, $user, $request) {
            $fromStatus = $maintenanceRequest->status;
            $fromCost = (float) $maintenanceRequest->cost_php;

            $changes = [
                'status' => ['from' => $fromStatus, 'to' => 'pending_review'],
            ];
            if (isset($validated['cost_php']) && (float) $validated['cost_php'] !== $fromCost) {
                $changes['cost_php'] = ['from' => $fromCost, 'to' => (float) $validated['cost_php']];
            }

            $updateData = [
                'status' => 'pending_review',
                'submitted_for_review_at' => now(),
            ];

            if (isset($validated['cost_php'])) {
                $updateData['cost_php'] = $validated['cost_php'];
            }

            $existingNotes = $maintenanceRequest->repair_notes;
            $timestamp = now()->format('Y-m-d H:i');
            $updateData['repair_notes'] = $existingNotes
                ? "{$existingNotes}\n[{$timestamp} - Completion Submitted by {$user->name}]: {$validated['completion_notes']}"
                : "[{$timestamp} - Completion Submitted by {$user->name}]: {$validated['completion_notes']}";

            $maintenanceRequest->update($updateData);

            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $originalName = $file->getClientOriginalName();
                    $mimeType = $file->getClientMimeType() ?: $file->getMimeType();
                    $fileSize = $file->getSize();
                    $extension = $file->getClientOriginalExtension() ?: 'bin';
                    $filename = Str::uuid().'.'.strtolower($extension);
                    $path = $file->storeAs("maintenance/{$maintenanceRequest->id}", $filename, 'public');

                    MaintenanceRequestAttachment::create([
                        'maintenance_request_id' => $maintenanceRequest->id,
                        'file_path' => $path,
                        'file_name' => $originalName,
                        'file_type' => $mimeType,
                        'file_size' => $fileSize,
                        'uploaded_by_user_id' => $user->id,
                    ]);
                }
            }

            MaintenanceRequestHistory::create([
                'maintenance_request_id' => $maintenanceRequest->id,
                'user_id' => $user->id,
                'actor_role' => $user->role ?? 'staff',
                'action' => 'submitted_for_review',
                'from_status' => $fromStatus,
                'to_status' => 'pending_review',
                'notes' => $validated['completion_notes'],
                'changes_payload' => $changes,
            ]);
        });

        try {
            $this->notificationService->sendMaintenanceReviewSubmitted(
                $maintenanceRequest,
                $user,
                $validated['completion_notes'],
                isset($validated['cost_php']) ? (float) $validated['cost_php'] : null
            );
        } catch (\Throwable $e) {
            Log::error('Failed to dispatch maintenance review submitted notification: '.$e->getMessage());
        }

        $maintenanceRequest->load(['room', 'reportedBy', 'assignedTo', 'attachments', 'history.user', 'history.fromAssignedTo', 'history.toAssignedTo']);

        return (new MaintenanceRequestResource($maintenanceRequest))->response();
    }

    /**
     * Admin review endpoint: approve completion or request changes.
     */
    public function review(Request $request, int $id): JsonResponse
    {
        $maintenanceRequest = MaintenanceRequest::findOrFail($id);
        $user = $request->user();

        if (! $user->hasPermission('maintenance.manage')) {
            return response()->json(['message' => 'Only authorized administrators or supervisors can review completion.'], 403);
        }

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:approve,reject'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $notes = $validated['notes'] ?? null;

        DB::transaction(function () use ($maintenanceRequest, $validated, $user, $notes) {
            $fromStatus = $maintenanceRequest->status;
            $toStatus = $validated['action'] === 'approve' ? 'resolved' : 'in_progress';

            $changes = [
                'status' => ['from' => $fromStatus, 'to' => $toStatus],
            ];

            if ($validated['action'] === 'approve') {
                $maintenanceRequest->update([
                    'status' => 'resolved',
                    'resolved_at' => now(),
                ]);

                MaintenanceRequestHistory::create([
                    'maintenance_request_id' => $maintenanceRequest->id,
                    'user_id' => $user->id,
                    'actor_role' => $user->role ?? 'admin',
                    'action' => 'review_approved',
                    'from_status' => $fromStatus,
                    'to_status' => 'resolved',
                    'notes' => $notes ?: 'Work verified and approved by administrator.',
                    'changes_payload' => $changes,
                ]);
            } else {
                $maintenanceRequest->update([
                    'status' => 'in_progress',
                ]);

                $timestamp = now()->format('Y-m-d H:i');
                $feedback = "[{$timestamp} - Review Revision Requested by {$user->name}]: ".($notes ?: 'Revision requested.');
                $existing = $maintenanceRequest->repair_notes;
                $maintenanceRequest->update([
                    'repair_notes' => $existing ? "{$existing}\n{$feedback}" : $feedback,
                ]);

                MaintenanceRequestHistory::create([
                    'maintenance_request_id' => $maintenanceRequest->id,
                    'user_id' => $user->id,
                    'actor_role' => $user->role ?? 'admin',
                    'action' => 'review_rejected',
                    'from_status' => $fromStatus,
                    'to_status' => 'in_progress',
                    'notes' => $notes ?: 'Work rejected and returned to technician for corrections.',
                    'changes_payload' => $changes,
                ]);
            }
        });

        try {
            $this->notificationService->sendMaintenanceReviewDecision(
                $maintenanceRequest,
                $user,
                $validated['action'],
                $notes
            );
        } catch (\Throwable $e) {
            Log::error('Failed to dispatch maintenance review decision notification: '.$e->getMessage());
        }

        $maintenanceRequest->load(['room', 'reportedBy', 'assignedTo', 'attachments', 'history.user', 'history.fromAssignedTo', 'history.toAssignedTo']);

        return (new MaintenanceRequestResource($maintenanceRequest))->response();
    }

    /**
     * Get the audit history logs for a maintenance request.
     */
    public function history(int $id): JsonResponse
    {
        $histories = MaintenanceRequestHistory::where('maintenance_request_id', $id)
            ->with(['user:id,name,role', 'fromAssignedTo:id,name', 'toAssignedTo:id,name'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'data' => $histories,
        ]);
    }

    /**
     * Update the specified maintenance request.
     */
    public function update(AdminMaintenanceRequest $request, int $id): JsonResponse
    {
        $maintenanceRequest = MaintenanceRequest::findOrFail($id);
        $user = $request->user();
        $validated = $request->validated();

        unset($validated['attachments']);

        if (isset($validated['status'])) {
            if ($validated['status'] === 'resolved' && $maintenanceRequest->status !== 'resolved') {
                $validated['resolved_at'] = now();
            } elseif ($validated['status'] !== 'resolved' && $maintenanceRequest->status === 'resolved') {
                $validated['resolved_at'] = null;
            }
        }

        $assigneeChanged = false;
        $isReassignment = false;

        DB::transaction(function () use ($maintenanceRequest, $validated, $request, $user, &$assigneeChanged, &$isReassignment) {
            $fromStatus = $maintenanceRequest->status;
            $toStatus = $validated['status'] ?? $fromStatus;
            $fromAssignee = $maintenanceRequest->assigned_to_user_id;
            $toAssignee = array_key_exists('assigned_to_user_id', $validated) ? $validated['assigned_to_user_id'] : $fromAssignee;
            $fromCost = (float) $maintenanceRequest->cost_php;
            $toCost = isset($validated['cost_php']) ? (float) $validated['cost_php'] : $fromCost;
            $fromPriority = $maintenanceRequest->priority;
            $toPriority = $validated['priority'] ?? $fromPriority;

            $changes = [];
            if ($fromStatus !== $toStatus) {
                $changes['status'] = ['from' => $fromStatus, 'to' => $toStatus];
            }
            if ($fromAssignee !== $toAssignee) {
                $fromUser = $maintenanceRequest->assignedTo;
                $toUser = $toAssignee ? User::find($toAssignee) : null;
                $changes['assigned_to'] = [
                    'from' => $fromAssignee,
                    'from_name' => $fromUser?->name,
                    'to' => $toAssignee,
                    'to_name' => $toUser?->name,
                ];
                $assigneeChanged = (bool) $toAssignee;
                $isReassignment = (bool) $fromAssignee;
            }
            if ($fromPriority !== $toPriority) {
                $changes['priority'] = ['from' => $fromPriority, 'to' => $toPriority];
            }
            if (isset($validated['cost_php']) && $fromCost !== $toCost) {
                $changes['cost_php'] = ['from' => $fromCost, 'to' => $toCost];
            }

            $maintenanceRequest->update($validated);

            if (! empty($changes)) {
                MaintenanceRequestHistory::create([
                    'maintenance_request_id' => $maintenanceRequest->id,
                    'user_id' => $user?->id,
                    'actor_role' => $user?->role ?? 'admin',
                    'action' => $fromAssignee !== $toAssignee ? 'reassigned' : 'updated',
                    'from_status' => $fromStatus,
                    'to_status' => $toStatus,
                    'from_assigned_to_user_id' => $fromAssignee,
                    'to_assigned_to_user_id' => $toAssignee,
                    'notes' => 'Request details updated.',
                    'changes_payload' => $changes,
                ]);
            }

            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $originalName = $file->getClientOriginalName();
                    $mimeType = $file->getClientMimeType() ?: $file->getMimeType();
                    $fileSize = $file->getSize();
                    $extension = $file->getClientOriginalExtension() ?: 'bin';
                    $filename = Str::uuid().'.'.strtolower($extension);
                    $path = $file->storeAs("maintenance/{$maintenanceRequest->id}", $filename, 'public');

                    MaintenanceRequestAttachment::create([
                        'maintenance_request_id' => $maintenanceRequest->id,
                        'file_path' => $path,
                        'file_name' => $originalName,
                        'file_type' => $mimeType,
                        'file_size' => $fileSize,
                        'uploaded_by_user_id' => $user?->id,
                    ]);
                }
            }
        });

        if ($assigneeChanged && $maintenanceRequest->assigned_to_user_id) {
            try {
                $this->notificationService->sendMaintenanceTaskAssigned(
                    $maintenanceRequest,
                    $isReassignment,
                    'Assigned via maintenance request update.'
                );
            } catch (\Throwable $e) {
                Log::error('Failed to dispatch maintenance assignment notification: '.$e->getMessage());
            }
        }

        $maintenanceRequest->load(['room', 'reportedBy', 'assignedTo', 'attachments', 'history.user', 'history.fromAssignedTo', 'history.toAssignedTo']);

        return (new MaintenanceRequestResource($maintenanceRequest))->response();
    }

    /**
     * Quick status update for a maintenance request.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $maintenanceRequest = MaintenanceRequest::findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(MaintenanceRequest::STATUSES)],
            'repair_notes' => ['nullable', 'string'],
            'cost_php' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($validated['status'] === 'resolved' && $maintenanceRequest->status !== 'resolved') {
            $validated['resolved_at'] = now();
        } elseif ($validated['status'] !== 'resolved' && $maintenanceRequest->status === 'resolved') {
            $validated['resolved_at'] = null;
        }

        DB::transaction(function () use ($maintenanceRequest, $validated, $user) {
            $fromStatus = $maintenanceRequest->status;
            $toStatus = $validated['status'];
            $fromCost = (float) $maintenanceRequest->cost_php;
            $toCost = isset($validated['cost_php']) ? (float) $validated['cost_php'] : $fromCost;

            $changes = [];
            if ($fromStatus !== $toStatus) {
                $changes['status'] = ['from' => $fromStatus, 'to' => $toStatus];
            }
            if (isset($validated['cost_php']) && $fromCost !== $toCost) {
                $changes['cost_php'] = ['from' => $fromCost, 'to' => $toCost];
            }

            $maintenanceRequest->update($validated);

            MaintenanceRequestHistory::create([
                'maintenance_request_id' => $maintenanceRequest->id,
                'user_id' => $user?->id,
                'actor_role' => $user?->role ?? 'admin',
                'action' => 'status_changed',
                'from_status' => $fromStatus,
                'to_status' => $validated['status'],
                'notes' => $validated['repair_notes'] ?? 'Status updated.',
                'changes_payload' => $changes,
            ]);
        });

        $maintenanceRequest->load(['room', 'reportedBy', 'assignedTo', 'attachments', 'history.user', 'history.fromAssignedTo', 'history.toAssignedTo']);

        return (new MaintenanceRequestResource($maintenanceRequest))->response();
    }

    /**
     * Remove the specified maintenance request and its attachments from storage.
     */
    public function destroy(int $id): JsonResponse
    {
        $maintenanceRequest = MaintenanceRequest::with('attachments')->findOrFail($id);

        foreach ($maintenanceRequest->attachments as $attachment) {
            if (Storage::disk('public')->exists($attachment->file_path)) {
                Storage::disk('public')->delete($attachment->file_path);
            }
        }

        $maintenanceRequest->delete();

        return response()->json([
            'message' => 'Maintenance request and associated attachments deleted successfully.',
        ]);
    }

    /**
     * Delete a single attachment.
     */
    public function destroyAttachment(int $id, int $attachmentId): JsonResponse
    {
        $attachment = MaintenanceRequestAttachment::where('maintenance_request_id', $id)
            ->findOrFail($attachmentId);

        if (Storage::disk('public')->exists($attachment->file_path)) {
            Storage::disk('public')->delete($attachment->file_path);
        }

        $attachment->delete();

        return response()->json([
            'message' => 'Attachment deleted successfully.',
        ]);
    }
}
